import os
import sys
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from datetime import datetime, timezone
from uuid import uuid4
from typing import Optional, List, Dict, Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, Query, UploadFile, File, Form, status, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

try:
    import email_validator  # noqa: F401
    from pydantic import EmailStr
except Exception:
    EmailStr = str  # type: ignore

from database import (
    get_db,
    check_db_health,
    serialize_doc,
    now_utc_iso
)
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    get_current_user_optional,
    require_roles,
    can_access_application,
    can_transition_status,
    ROLE_ADMIN,
    ROLE_REVIEWER,
    ROLE_INSTITUTION,
    ALL_ROLES
)
from compliance import evaluate_compliance, REQUIRED_DOCUMENTS
from storage import (
    process_and_save_upload,
    get_document_file_path,
    delete_document_file,
    MAX_UPLOAD_MB
)
from email_service import (
    trigger_email_notification,
    is_email_configured,
    send_test_email
)
from sms import (
    trigger_sms_notification,
    is_twilio_configured,
    TWILIO_PHONE_NUMBER
)

load_dotenv()

app = FastAPI(
    title="AICTE Approval Workflow Automation Platform API",
    version="2.0.0",
    description="Production-grade REST API for AICTE Approval Automation with MongoDB Atlas, Automated Email Notifications, JWT RBAC, and Document Compliance."
)

origins = [x.strip() for x in os.getenv("FRONTEND_ORIGIN", "http://localhost:3000").split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins + ["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

APPLICATION_TYPES = [
    "New Approval",
    "Extension of Approval",
    "Course Addition",
    "Intake Change"
]

STATUS_CHOICES = [
    "Draft",
    "Submitted",
    "Under Review",
    "Correction Required",
    "Resubmitted",
    "Approved",
    "Rejected"
]


# =====================================================================
# PYDANTIC SCHEMAS
# =====================================================================

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=2, max_length=100)
    institution_id: Optional[str] = Field(default="", max_length=50)
    institution_name: Optional[str] = Field(default="", max_length=200)
    role: Optional[str] = Field(default=ROLE_INSTITUTION)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class AdminSetup(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=2)
    setup_key: Optional[str] = None


class ApplicationCreate(BaseModel):
    institution: str = Field(min_length=2, max_length=200)
    institution_id: str = Field(min_length=2, max_length=50)
    type: str = Field(default="Extension of Approval")
    contact_name: str = Field(min_length=2, max_length=100)
    contact_email: EmailStr
    contact_mobile: str = Field(min_length=8, max_length=20)
    address: str = Field(min_length=5, max_length=500)
    notes: Optional[str] = Field(default="", max_length=2000)
    submit_now: bool = Field(default=True)


class ApplicationUpdate(BaseModel):
    institution: Optional[str] = Field(default=None, min_length=2, max_length=200)
    institution_id: Optional[str] = Field(default=None, min_length=2, max_length=50)
    type: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_mobile: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class StatusTransitionRequest(BaseModel):
    target_status: str
    comments: Optional[str] = Field(default="", max_length=1000)


class ReviewerCommentRequest(BaseModel):
    comments: str = Field(min_length=1, max_length=2000)


class AssignReviewerRequest(BaseModel):
    reviewer_id: str
    reviewer_name: str


class RoleUpdateRequest(BaseModel):
    role: str


# =====================================================================
# SYSTEM & HEALTH ENDPOINTS
# =====================================================================

@app.get("/")
def root():
    return {
        "name": "AICTE Approval Workflow Automation API",
        "version": "2.0.0",
        "docs": "/docs",
        "status": "online"
    }


@app.get("/api/health")
def health():
    db_health = check_db_health()
    return {
        "status": "healthy" if db_health["connected"] else "degraded",
        "database": db_health,
        "email": {
            "configured": is_email_configured(),
            "provider": "SMTP (Live)" if is_email_configured() else "Development / Portal Audit Mode",
            "host": os.getenv("SMTP_HOST", "smtp.gmail.com"),
            "sender": os.getenv("SMTP_FROM") or os.getenv("SMTP_USER") or "aicte.portal@gov.in",
            "note": "Automated status update emails with AICTE HTML branding dispatched to contact_email."
        },
        "sms": {
            "configured": is_twilio_configured(),
            "sender_number": TWILIO_PHONE_NUMBER if is_twilio_configured() else "Not set",
            "provider": "Twilio SMS (Legacy)",
            "trial_notice": "Trial accounts require verified recipient numbers in E.164 format."
        },
        "storage": {
            "type": "local_filesystem_with_mongodb_metadata",
            "max_file_size_mb": MAX_UPLOAD_MB,
            "supported_types": ["PDF", "PNG", "JPG", "JPEG"]
        },
        "timestamp": now_utc_iso()
    }


# =====================================================================
# AUTHENTICATION ENDPOINTS
# =====================================================================

@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register(body: UserRegister):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database connection is not available.")

    existing = db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(400, "An account with this email address already exists.")

    assigned_role = body.role if body.role in [ROLE_INSTITUTION, ROLE_REVIEWER] else ROLE_INSTITUTION
    user_id = f"USR-{uuid4().hex[:8].upper()}"

    user_doc = {
        "id": user_id,
        "email": body.email.lower(),
        "hashed_password": hash_password(body.password),
        "name": body.name.strip(),
        "role": assigned_role,
        "institution_id": (body.institution_id or "").strip(),
        "institution_name": (body.institution_name or "").strip(),
        "created_at": now_utc_iso()
    }
    db.users.insert_one(user_doc)

    token = create_access_token({"sub": user_id, "role": assigned_role, "email": body.email.lower()})
    return {
        "token": token,
        "user": serialize_doc(user_doc)
    }


@app.post("/api/auth/login")
def login(body: UserLogin):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database connection is not available.")

    user = db.users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user.get("hashed_password", "")):
        raise HTTPException(401, "Invalid email or password.")

    token = create_access_token({"sub": user["id"], "role": user.get("role"), "email": user.get("email")})
    return {
        "token": token,
        "user": serialize_doc(user)
    }


@app.get("/api/auth/me")
def me(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_copy = dict(current_user)
    user_copy.pop("hashed_password", None)
    return user_copy


@app.post("/api/auth/setup-admin")
def setup_admin(body: AdminSetup):
    """
    Secure initial setup: Allows creating an administrator if no admin exists yet.
    """
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database connection is not available.")

    admin_count = db.users.count_documents({"role": ROLE_ADMIN})
    if admin_count > 0:
        raise HTTPException(400, "Administrator account already exists. Use the administration panel to manage users.")

    admin_id = f"ADM-{uuid4().hex[:8].upper()}"
    admin_doc = {
        "id": admin_id,
        "email": body.email.lower(),
        "hashed_password": hash_password(body.password),
        "name": body.name.strip(),
        "role": ROLE_ADMIN,
        "institution_id": "AICTE-HQ",
        "institution_name": "All India Council for Technical Education",
        "created_at": now_utc_iso()
    }
    db.users.insert_one(admin_doc)
    token = create_access_token({"sub": admin_id, "role": ROLE_ADMIN, "email": body.email.lower()})
    return {
        "message": "Administrator account successfully provisioned.",
        "token": token,
        "user": serialize_doc(admin_doc)
    }


# =====================================================================
# DASHBOARD ENDPOINTS
# =====================================================================

@app.get("/api/dashboard/stats")
def dashboard_stats(current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database connection is not available.")

    # Scope query by role if institution user
    query = {}
    if current_user and current_user.get("role") == ROLE_INSTITUTION:
        query = {
            "$or": [
                {"created_by_user_id": current_user.get("id")},
                {"institution_id": current_user.get("institution_id")}
            ]
        }

    total = db.applications.count_documents(query)
    submitted = db.applications.count_documents({**query, "status": "Submitted"})
    under_review = db.applications.count_documents({**query, "status": "Under Review"})
    correction_required = db.applications.count_documents({**query, "status": "Correction Required"})
    resubmitted = db.applications.count_documents({**query, "status": "Resubmitted"})
    approved = db.applications.count_documents({**query, "status": "Approved"})
    rejected = db.applications.count_documents({**query, "status": "Rejected"})
    draft = db.applications.count_documents({**query, "status": "Draft"})

    # Type distribution
    by_type = []
    for t in APPLICATION_TYPES:
        cnt = db.applications.count_documents({**query, "type": t})
        by_type.append({"type": t, "count": cnt})

    # Status distribution
    by_status = [
        {"status": "Draft", "count": draft},
        {"status": "Submitted", "count": submitted},
        {"status": "Under Review", "count": under_review},
        {"status": "Correction Required", "count": correction_required},
        {"status": "Resubmitted", "count": resubmitted},
        {"status": "Approved", "count": approved},
        {"status": "Rejected", "count": rejected}
    ]

    recent_cursor = db.applications.find(query).sort("created_at", -1).limit(5)
    recent = [serialize_doc(x) for x in recent_cursor]

    return {
        "total": total,
        "submitted": submitted,
        "under_review": under_review,
        "correction_required": correction_required,
        "resubmitted": resubmitted,
        "approved": approved,
        "rejected": rejected,
        "draft": draft,
        "by_type": by_type,
        "by_status": by_status,
        "recent": recent
    }


# =====================================================================
# APPLICATION CRUD & LIFECYCLE
# =====================================================================

@app.get("/api/applications")
def list_applications(
    search: str = Query(default="", max_length=200),
    status: str = Query(default="All statuses"),
    type: str = Query(default="All types"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database connection is not available.")

    filter_query: Dict[str, Any] = {}

    # Role-based restriction
    if current_user and current_user.get("role") == ROLE_INSTITUTION:
        filter_query["$or"] = [
            {"created_by_user_id": current_user.get("id")},
            {"institution_id": current_user.get("institution_id")},
            {"contact_email": current_user.get("email")}
        ]

    # Status filter
    if status != "All statuses" and status in STATUS_CHOICES:
        filter_query["status"] = status

    # Type filter
    if type != "All types" and type in APPLICATION_TYPES:
        filter_query["type"] = type

    # Search filter (institution, id, institution_id, contact_name)
    q = search.strip()
    if q:
        search_regex = {"$regex": q, "$options": "i"}
        search_clauses = [
            {"id": search_regex},
            {"institution": search_regex},
            {"institution_id": search_regex},
            {"contact_name": search_regex},
            {"contact_email": search_regex}
        ]
        if "$or" in filter_query:
            filter_query["$and"] = [{"$or": filter_query.pop("$or")}, {"$or": search_clauses}]
        else:
            filter_query["$or"] = search_clauses

    total_records = db.applications.count_documents(filter_query)
    total_pages = max(1, (total_records + limit - 1) // limit)
    skip = (page - 1) * limit

    cursor = db.applications.find(filter_query).sort("created_at", -1).skip(skip).limit(limit)
    items = [serialize_doc(x) for x in cursor]

    return {
        "items": items,
        "total": total_records,
        "page": page,
        "limit": limit,
        "pages": total_pages
    }


@app.post("/api/applications", status_code=status.HTTP_201_CREATED)
def create_application(
    body: ApplicationCreate,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database connection is not available.")

    if body.type not in APPLICATION_TYPES:
        raise HTTPException(422, f"Invalid application type '{body.type}'. Must be one of: {APPLICATION_TYPES}")

    year = datetime.now(timezone.utc).year
    app_id = f"AICTE-{year}-{uuid4().hex[:6].upper()}"
    init_status = "Submitted" if body.submit_now else "Draft"
    user_id = current_user.get("id") if current_user else "ANONYMOUS"
    user_name = current_user.get("name") if current_user else body.contact_name

    now = now_utc_iso()
    doc = {
        "id": app_id,
        "institution": body.institution.strip(),
        "institution_id": body.institution_id.strip(),
        "type": body.type,
        "contact_name": body.contact_name.strip(),
        "contact_email": body.contact_email.strip().lower(),
        "contact_mobile": body.contact_mobile.strip(),
        "address": body.address.strip(),
        "status": init_status,
        "assigned_reviewer_id": None,
        "assigned_reviewer_name": "Unassigned",
        "review_notes": body.notes.strip() if body.notes else "",
        "created_by_user_id": user_id,
        "created_at": now,
        "updated_at": now
    }
    db.applications.insert_one(doc)

    # Record history
    history_entry = {
        "id": f"HIST-{uuid4().hex[:8].upper()}",
        "application_id": app_id,
        "action": f"Application Created as {init_status}",
        "from_status": None,
        "to_status": init_status,
        "performed_by": user_name,
        "performer_role": current_user.get("role", "Applicant") if current_user else "Applicant",
        "comments": "Initial application record filed.",
        "timestamp": now
    }
    db.history.insert_one(history_entry)

    # Trigger Email status notification if submitted
    email_res = None
    if init_status == "Submitted":
        email_res = trigger_email_notification(doc, trigger_event="Submitted")

    created = serialize_doc(doc)
    created["email_notification"] = email_res
    created["sms_notification"] = email_res  # backwards compatibility
    created["notification"] = email_res
    return created


@app.get("/api/applications/{app_id}")
def get_application_details(
    app_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database connection is not available.")

    app_doc = db.applications.find_one({"id": app_id})
    if not app_doc:
        raise HTTPException(404, f"Application '{app_id}' not found.")

    if current_user and not can_access_application(current_user, app_doc):
        raise HTTPException(403, "You do not have permission to view this application.")

    # Fetch associated documents & history
    docs = [serialize_doc(d) for d in db.documents.find({"application_id": app_id, "is_deleted": {"$ne": True}})]
    hist = [serialize_doc(h) for h in db.history.find({"application_id": app_id}).sort("timestamp", -1)]
    notifs = [serialize_doc(n) for n in db.notifications.find({"application_id": app_id}).sort("created_at", -1)]

    # Compute live compliance
    compliance_report = evaluate_compliance(app_doc, docs)

    clean_app = serialize_doc(app_doc)
    clean_app["documents"] = docs
    clean_app["history"] = hist
    clean_app["notifications"] = notifs
    clean_app["compliance"] = compliance_report
    return clean_app


@app.patch("/api/applications/{app_id}")
def update_application_details(
    app_id: str,
    body: ApplicationUpdate,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database connection is not available.")

    app_doc = db.applications.find_one({"id": app_id})
    if not app_doc:
        raise HTTPException(404, f"Application '{app_id}' not found.")

    if current_user:
        if not can_access_application(current_user, app_doc):
            raise HTTPException(403, "You do not have permission to modify this application.")
        # Institution users can only edit if Draft or Correction Required
        if current_user.get("role") == ROLE_INSTITUTION and app_doc.get("status") not in ("Draft", "Correction Required"):
            raise HTTPException(400, f"Applications in '{app_doc.get('status')}' status cannot be edited directly by institutions.")

    data = body.model_dump(exclude_unset=True)
    if not data:
        return serialize_doc(app_doc)

    data["updated_at"] = now_utc_iso()
    db.applications.update_one({"id": app_id}, {"$set": data})

    # History audit
    user_name = current_user.get("name") if current_user else "System"
    role_name = current_user.get("role") if current_user else "Applicant"
    history_entry = {
        "id": f"HIST-{uuid4().hex[:8].upper()}",
        "application_id": app_id,
        "action": "Application Details Updated",
        "from_status": app_doc.get("status"),
        "to_status": app_doc.get("status"),
        "performed_by": user_name,
        "performer_role": role_name,
        "comments": f"Updated fields: {', '.join(data.keys())}",
        "timestamp": now_utc_iso()
    }
    db.history.insert_one(history_entry)

    updated = db.applications.find_one({"id": app_id})
    return serialize_doc(updated)


@app.post("/api/applications/{app_id}/status")
def change_application_status(
    app_id: str,
    body: StatusTransitionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Executes a formal state transition. Validates transition matrix and authorization,
    appends to immutable audit trail, and triggers Twilio SMS.
    """
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database connection is not available.")

    app_doc = db.applications.find_one({"id": app_id})
    if not app_doc:
        raise HTTPException(404, f"Application '{app_id}' not found.")

    current_status = app_doc.get("status", "Draft")
    target_status = body.target_status

    # Validate transition & permissions
    allowed, reason = can_transition_status(current_user, current_status, target_status)
    if not allowed:
        raise HTTPException(400, reason)

    now = now_utc_iso()
    user_name = current_user.get("name", "Authorized User")
    user_role = current_user.get("role", "User")

    update_fields = {
        "status": target_status,
        "updated_at": now
    }
    if body.comments:
        update_fields["review_notes"] = body.comments.strip()

    db.applications.update_one({"id": app_id}, {"$set": update_fields})

    # Log in audit history
    history_entry = {
        "id": f"HIST-{uuid4().hex[:8].upper()}",
        "application_id": app_id,
        "action": f"Status Transition: {current_status} → {target_status}",
        "from_status": current_status,
        "to_status": target_status,
        "performed_by": user_name,
        "performer_role": user_role,
        "comments": body.comments.strip() if body.comments else f"Transitioned from {current_status} to {target_status}.",
        "timestamp": now
    }
    db.history.insert_one(history_entry)

    # Trigger AICTE Email Status Update Notification
    updated_app_doc = db.applications.find_one({"id": app_id})
    email_result = trigger_email_notification(
        updated_app_doc,
        trigger_event=target_status,
        comments=body.comments.strip() if body.comments else None
    )

    res = serialize_doc(updated_app_doc)
    res["email_notification"] = email_result
    res["sms_notification"] = email_result  # backwards compatibility
    res["notification"] = email_result
    return res


@app.post("/api/applications/{app_id}/comments")
def add_reviewer_comments(
    app_id: str,
    body: ReviewerCommentRequest,
    current_user: Dict[str, Any] = Depends(require_roles(ROLE_REVIEWER, ROLE_ADMIN))
):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database connection is not available.")

    app_doc = db.applications.find_one({"id": app_id})
    if not app_doc:
        raise HTTPException(404, f"Application '{app_id}' not found.")

    now = now_utc_iso()
    user_name = current_user.get("name", "Reviewer")

    db.applications.update_one(
        {"id": app_id},
        {"$set": {"review_notes": body.comments.strip(), "updated_at": now}}
    )

    history_entry = {
        "id": f"HIST-{uuid4().hex[:8].upper()}",
        "application_id": app_id,
        "action": "Reviewer Comment Added",
        "from_status": app_doc.get("status"),
        "to_status": app_doc.get("status"),
        "performed_by": user_name,
        "performer_role": current_user.get("role"),
        "comments": body.comments.strip(),
        "timestamp": now
    }
    db.history.insert_one(history_entry)

    return {"message": "Comment successfully saved to application audit trail."}


@app.post("/api/applications/{app_id}/assign")
def assign_reviewer(
    app_id: str,
    body: AssignReviewerRequest,
    current_user: Dict[str, Any] = Depends(require_roles(ROLE_ADMIN))
):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database connection is not available.")

    app_doc = db.applications.find_one({"id": app_id})
    if not app_doc:
        raise HTTPException(404, f"Application '{app_id}' not found.")

    now = now_utc_iso()
    db.applications.update_one(
        {"id": app_id},
        {"$set": {
            "assigned_reviewer_id": body.reviewer_id,
            "assigned_reviewer_name": body.reviewer_name,
            "updated_at": now
        }}
    )

    history_entry = {
        "id": f"HIST-{uuid4().hex[:8].upper()}",
        "application_id": app_id,
        "action": f"Reviewer Assigned: {body.reviewer_name}",
        "from_status": app_doc.get("status"),
        "to_status": app_doc.get("status"),
        "performed_by": current_user.get("name", "Admin"),
        "performer_role": ROLE_ADMIN,
        "comments": f"Application assigned to reviewer {body.reviewer_name} ({body.reviewer_id}).",
        "timestamp": now
    }
    db.history.insert_one(history_entry)

    return {"message": f"Reviewer {body.reviewer_name} successfully assigned to application {app_id}."}


# =====================================================================
# DOCUMENT MANAGEMENT & RETRIEVAL
# =====================================================================

@app.get("/api/applications/{app_id}/documents")
def list_application_documents(
    app_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database connection is not available.")

    app_doc = db.applications.find_one({"id": app_id})
    if not app_doc:
        raise HTTPException(404, "Application not found.")

    if current_user and not can_access_application(current_user, app_doc):
        raise HTTPException(403, "Access denied.")

    uploaded = [serialize_doc(d) for d in db.documents.find({"application_id": app_id, "is_deleted": {"$ne": True}}).sort("uploaded_at", -1)]
    uploaded_types = {d["doc_type"] for d in uploaded if d.get("doc_type")}

    checklist = []
    for req in REQUIRED_DOCUMENTS:
        checklist.append({
            "type": req["type"],
            "description": req["description"],
            "uploaded": req["type"] in uploaded_types
        })

    return {
        "items": uploaded,
        "count": len(uploaded),
        "checklist": checklist
    }


@app.post("/api/applications/{app_id}/documents", status_code=status.HTTP_201_CREATED)
async def upload_document(
    app_id: str,
    file: UploadFile = File(...),
    doc_type: str = Form(...),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database connection is not available.")

    app_doc = db.applications.find_one({"id": app_id})
    if not app_doc:
        raise HTTPException(404, "Application not found.")

    if current_user and not can_access_application(current_user, app_doc):
        raise HTTPException(403, "Access denied.")

    # Process and save file securely
    upload_meta = await process_and_save_upload(file, app_id=app_id, doc_type=doc_type)

    now = now_utc_iso()
    user_id = current_user.get("id") if current_user else "ANONYMOUS"
    user_name = current_user.get("name") if current_user else "Applicant"

    # Check existing version for this doc_type
    prev_doc = db.documents.find_one({"application_id": app_id, "doc_type": doc_type, "is_deleted": {"$ne": True}})
    version = (prev_doc.get("version", 1) + 1) if prev_doc else 1

    # Mark superseded if replacing
    if prev_doc:
        db.documents.update_one({"id": prev_doc["id"]}, {"$set": {"is_deleted": True, "superseded_at": now}})

    doc_id = f"DOC-{uuid4().hex[:8].upper()}"
    record = {
        "id": doc_id,
        "application_id": app_id,
        "doc_type": doc_type,
        "original_filename": upload_meta["original_filename"],
        "stored_filename": upload_meta["stored_filename"],
        "mime_type": upload_meta["mime_type"],
        "file_size": upload_meta["file_size"],
        "version": version,
        "is_deleted": False,
        "uploaded_by_id": user_id,
        "uploaded_by_name": user_name,
        "uploaded_at": now
    }
    db.documents.insert_one(record)

    # History audit
    history_entry = {
        "id": f"HIST-{uuid4().hex[:8].upper()}",
        "application_id": app_id,
        "action": f"Document Uploaded: {doc_type} (v{version})",
        "from_status": app_doc.get("status"),
        "to_status": app_doc.get("status"),
        "performed_by": user_name,
        "performer_role": current_user.get("role", "Applicant") if current_user else "Applicant",
        "comments": f"File '{upload_meta['original_filename']}' ({round(upload_meta['file_size']/1024, 1)} KB) uploaded for {doc_type}.",
        "timestamp": now
    }
    db.history.insert_one(history_entry)

    # Update app timestamp
    db.applications.update_one({"id": app_id}, {"$set": {"updated_at": now}})

    return serialize_doc(record)


@app.get("/api/documents/{doc_id}/download")
def download_document(
    doc_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database connection is not available.")

    doc = db.documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(404, "Document metadata not found.")

    app_doc = db.applications.find_one({"id": doc["application_id"]})
    if current_user and app_doc and not can_access_application(current_user, app_doc):
        raise HTTPException(403, "Access denied to document.")

    safe_path = get_document_file_path(doc["stored_filename"])
    return FileResponse(
        path=str(safe_path),
        media_type=doc.get("mime_type", "application/octet-stream"),
        filename=doc.get("original_filename", "document.pdf")
    )


@app.delete("/api/documents/{doc_id}")
def delete_document(
    doc_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database connection is not available.")

    doc = db.documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(404, "Document not found.")

    app_doc = db.applications.find_one({"id": doc["application_id"]})
    if current_user:
        if current_user.get("role") == ROLE_INSTITUTION and app_doc.get("status") in ("Approved", "Rejected"):
            raise HTTPException(400, "Documents cannot be deleted from finalized applications.")
        if not can_access_application(current_user, app_doc):
            raise HTTPException(403, "Access denied.")

    delete_document_file(doc["stored_filename"])
    db.documents.update_one({"id": doc_id}, {"$set": {"is_deleted": True, "deleted_at": now_utc_iso()}})

    # History audit
    history_entry = {
        "id": f"HIST-{uuid4().hex[:8].upper()}",
        "application_id": doc["application_id"],
        "action": f"Document Deleted: {doc.get('doc_type')}",
        "from_status": app_doc.get("status") if app_doc else None,
        "to_status": app_doc.get("status") if app_doc else None,
        "performed_by": current_user.get("name", "User") if current_user else "User",
        "performer_role": current_user.get("role", "User") if current_user else "User",
        "comments": f"Document file {doc.get('original_filename')} deleted.",
        "timestamp": now_utc_iso()
    }
    db.history.insert_one(history_entry)

    return {"message": "Document successfully deleted."}


# =====================================================================
# COMPLIANCE CHECK ENDPOINT
# =====================================================================

@app.get("/api/applications/{app_id}/compliance")
def check_compliance_endpoint(
    app_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database connection is not available.")

    app_doc = db.applications.find_one({"id": app_id})
    if not app_doc:
        raise HTTPException(404, "Application not found.")

    if current_user and not can_access_application(current_user, app_doc):
        raise HTTPException(403, "Access denied.")

    docs = list(db.documents.find({"application_id": app_id, "is_deleted": {"$ne": True}}))
    report = evaluate_compliance(app_doc, docs)
    return report


# =====================================================================
# NOTIFICATIONS & AUDIT TRAIL ENDPOINTS
# =====================================================================

@app.get("/api/notifications")
def list_notifications(
    application_id: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database connection is not available.")

    query: Dict[str, Any] = {}
    if application_id:
        query["application_id"] = application_id
    if status and status != "All":
        query["status"] = status

    total = db.notifications.count_documents(query)
    skip = (page - 1) * limit
    cursor = db.notifications.find(query).sort("created_at", -1).skip(skip).limit(limit)
    items = [serialize_doc(x) for x in cursor]

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "email_configured": is_email_configured(),
        "twilio_configured": is_email_configured()
    }


@app.get("/api/applications/{app_id}/history")
def get_application_history(
    app_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database connection is not available.")

    app_doc = db.applications.find_one({"id": app_id})
    if not app_doc:
        raise HTTPException(404, "Application not found.")

    if current_user and not can_access_application(current_user, app_doc):
        raise HTTPException(403, "Access denied.")

    cursor = db.history.find({"application_id": app_id}).sort("timestamp", -1)
    return {"items": [serialize_doc(h) for h in cursor]}


# =====================================================================
# USER & REVIEWER ADMINISTRATION ENDPOINTS
# =====================================================================

@app.get("/api/users")
def list_users(current_user: Dict[str, Any] = Depends(require_roles(ROLE_ADMIN))):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database connection is not available.")

    users = [serialize_doc(u) for u in db.users.find({}, {"hashed_password": 0}).sort("created_at", -1)]
    return {"items": users, "count": len(users)}


@app.get("/api/reviewers")
def list_reviewers(current_user: Dict[str, Any] = Depends(require_roles(ROLE_ADMIN, ROLE_REVIEWER))):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database connection is not available.")

    reviewers = [serialize_doc(u) for u in db.users.find({"role": ROLE_REVIEWER}, {"hashed_password": 0})]
    return {"items": reviewers, "count": len(reviewers)}


@app.patch("/api/users/{user_id}/role")
def update_user_role(
    user_id: str,
    body: RoleUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_roles(ROLE_ADMIN))
):
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database connection is not available.")

    if body.role not in ALL_ROLES:
        raise HTTPException(400, f"Invalid role '{body.role}'. Must be one of: {ALL_ROLES}")

    res = db.users.update_one({"id": user_id}, {"$set": {"role": body.role}})
    if res.matched_count == 0:
        raise HTTPException(404, "User not found.")

    return {"message": f"User role updated to '{body.role}'."}


class TestEmailRequest(BaseModel):
    recipient_email: str


@app.post("/api/email/test-send")
def test_email_endpoint(
    body: TestEmailRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    return send_test_email(body.recipient_email)


class TestSmsRequest(BaseModel):
    recipient_phone: str
    message: Optional[str] = None


@app.post("/api/sms/test-send")
def test_sms_endpoint(
    body: TestSmsRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    # If an email address is passed to legacy endpoint, dispatch email test
    if "@" in body.recipient_phone:
        return send_test_email(body.recipient_phone)

    dummy_app = {
        "id": "AICTE-TEST-SMS",
        "institution": "Verification Test",
        "contact_mobile": body.recipient_phone,
        "status": "Submitted"
    }
    result = trigger_sms_notification(
        dummy_app,
        trigger_event="Submitted",
        custom_message=body.message
    )
    return result
