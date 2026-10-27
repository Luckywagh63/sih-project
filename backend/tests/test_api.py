import pytest
import os
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

# Add backend directory to sys.path
backend_path = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_path))

from fastapi.testclient import TestClient
from app.main import app
from database import get_db

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "database" in data
    assert "sms" in data
    assert "storage" in data
    assert data["database"]["connected"] is True


def test_login_invalid():
    response = client.post("/api/auth/login", json={
        "email": "nonexistent@aicte.gov.in",
        "password": "wrongpassword"
    })
    assert response.status_code == 401


def test_login_success():
    response = client.post("/api/auth/login", json={
        "email": "admin@aicte.gov.in",
        "password": "AdminSecure@2026"
    })
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["user"]["role"] == "Administrator"


def test_auth_me():
    # Login as admin
    login_res = client.post("/api/auth/login", json={
        "email": "admin@aicte.gov.in",
        "password": "AdminSecure@2026"
    })
    token = login_res.json()["token"]

    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "admin@aicte.gov.in"


def test_dashboard_stats():
    response = client.get("/api/dashboard/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "submitted" in data
    assert "under_review" in data
    assert "by_type" in data
    assert "by_status" in data


def test_application_lifecycle_and_transition():
    # Login as Institution User
    inst_login = client.post("/api/auth/login", json={
        "email": "principal@mit.edu.in",
        "password": "MitSecure@2026"
    })
    inst_token = inst_login.json()["token"]

    # 1. Create Application
    payload = {
        "institution": "Pune Institute of Computer Technology",
        "institution_id": "AICTE-W-98765",
        "type": "New Approval",
        "contact_name": "Dr. P. T. Kulkarni",
        "contact_email": "principal@pict.edu",
        "contact_mobile": "+919876543210",
        "address": "Survey No. 27, Pune-Satara Road, Dhankawadi, Pune, Maharashtra 411043",
        "notes": "Application for approval of new AI & Data Science degree courses.",
        "submit_now": True
    }
    create_res = client.post(
        "/api/applications",
        json=payload,
        headers={"Authorization": f"Bearer {inst_token}"}
    )
    assert create_res.status_code == 201
    created_app = create_res.json()
    app_id = created_app["id"]
    assert app_id.startswith("AICTE-")
    assert created_app["status"] == "Submitted"

    # 2. Get Details & Compliance
    detail_res = client.get(
        f"/api/applications/{app_id}",
        headers={"Authorization": f"Bearer {inst_token}"}
    )
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert "compliance" in detail
    assert detail["compliance"]["is_preliminary"] is True
    # Without uploaded docs, documents_present should be 0
    assert detail["compliance"]["documents_present"] == 0

    # 3. Invalid Transition: Institution tries to jump straight to Approved
    invalid_trans = client.post(
        f"/api/applications/{app_id}/status",
        json={"target_status": "Approved", "comments": "Self approval attempt"},
        headers={"Authorization": f"Bearer {inst_token}"}
    )
    assert invalid_trans.status_code == 400

    # 4. Valid Transition: Reviewer moves Submitted -> Under Review
    rev_login = client.post("/api/auth/login", json={
        "email": "reviewer@aicte.gov.in",
        "password": "ReviewerSecure@2026"
    })
    rev_token = rev_login.json()["token"]

    status_res = client.post(
        f"/api/applications/{app_id}/status",
        json={"target_status": "Under Review", "comments": "Initial scrutiny committee assigned."},
        headers={"Authorization": f"Bearer {rev_token}"}
    )
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "Under Review"

    # 5. Verify Audit History
    hist_res = client.get(f"/api/applications/{app_id}/history", headers={"Authorization": f"Bearer {rev_token}"})
    assert hist_res.status_code == 200
    history_items = hist_res.json()["items"]
    assert len(history_items) >= 2


def test_document_upload_and_validation():
    # Login as Admin
    login_res = client.post("/api/auth/login", json={
        "email": "admin@aicte.gov.in",
        "password": "AdminSecure@2026"
    })
    token = login_res.json()["token"]

    # First get or create an application
    apps_res = client.get("/api/applications", headers={"Authorization": f"Bearer {token}"})
    items = apps_res.json()["items"]
    assert len(items) > 0
    app_id = items[0]["id"]

    # 1. Invalid file content (fake PDF header)
    bad_file = ("bad.pdf", b"This is not a real PDF format", "application/pdf")
    upload_fail = client.post(
        f"/api/applications/{app_id}/documents",
        data={"doc_type": "Institution Registration"},
        files={"file": bad_file},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert upload_fail.status_code == 400
    assert "File signature mismatch" in upload_fail.json()["detail"]

    # 2. Valid PDF upload with %PDF signature
    good_pdf_bytes = b"%PDF-1.4\n%AICTE Registration Document Sample\n%%EOF"
    good_file = ("registration_cert.pdf", good_pdf_bytes, "application/pdf")
    upload_ok = client.post(
        f"/api/applications/{app_id}/documents",
        data={"doc_type": "Institution Registration"},
        files={"file": good_file},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert upload_ok.status_code == 201
    doc_data = upload_ok.json()
    assert doc_data["doc_type"] == "Institution Registration"
    doc_id = doc_data["id"]

    # 3. Download Document
    down_res = client.get(f"/api/documents/{doc_id}/download", headers={"Authorization": f"Bearer {token}"})
    assert down_res.status_code == 200
    assert down_res.content == good_pdf_bytes

    # 4. Check Compliance Recalculation (documents_present should now be at least 1)
    comp_res = client.get(f"/api/applications/{app_id}/compliance", headers={"Authorization": f"Bearer {token}"})
    assert comp_res.status_code == 200
    assert comp_res.json()["documents_present"] >= 1


def test_sms_mock_resilience():
    # Test that Twilio dispatch behaves gracefully without crashing or throwing
    from sms import trigger_sms_notification

    test_app = {
        "id": "AICTE-TEST-9999",
        "institution": "Test Engineering Institute",
        "contact_mobile": "+919876543210",
        "status": "Under Review"
    }

    # Calling with real or missing credentials records attempt safely
    result = trigger_sms_notification(test_app, "Under Review")
    assert "status" in result
    assert result["status"] in ("not_configured", "submitted", "failed", "duplicate_skipped")


def test_email_notification_resilience():
    # Test that Email dispatch handles template rendering and delivery safely
    from email_service import trigger_email_notification, render_email_content

    test_app = {
        "id": "AICTE-TEST-EMAIL-01",
        "institution": "Pillai College of Engineering",
        "institution_id": "AICTE-20005",
        "contact_name": "Lucky Wagh",
        "contact_email": "applicant@pillai.edu.in",
        "type": "Course Addition",
        "status": "Under Review",
        "review_notes": "Curriculum documents verified."
    }

    subject, plain_text, html_body = render_email_content("Under Review", test_app)
    assert "AICTE-TEST-EMAIL-01" in subject
    assert "Pillai College of Engineering" in subject
    assert "Lucky Wagh" in plain_text
    assert "AICTE-20005" in html_body
    assert "Curriculum documents verified" in html_body

    res = trigger_email_notification(test_app, "Under Review")
    assert "status" in res
    assert res["status"] in ("delivered", "delivered_dev_mode", "failed", "duplicate_skipped")
