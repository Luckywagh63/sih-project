import os
import secrets
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List, Tuple
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field

from database import get_db, serialize_doc, now_utc_iso

JWT_SECRET = os.getenv("JWT_SECRET", "aicte_secure_default_secret_2026_do_not_use_in_prod")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

# Role Constants
ROLE_ADMIN = "Administrator"
ROLE_REVIEWER = "Reviewer"
ROLE_INSTITUTION = "Institution User"
ALL_ROLES = [ROLE_ADMIN, ROLE_REVIEWER, ROLE_INSTITUTION]

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with salt."""
    salt = secrets.token_hex(16)
    pw_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 150000)
    return f"{salt}:{pw_hash.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against salt:hash format using constant-time comparison."""
    try:
        salt, pw_hash = hashed_password.split(":")
        check_hash = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 150000)
        return hmac.compare_digest(check_hash.hex(), pw_hash)
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create signed JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate JWT access token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except (jwt.PyJWTError, Exception):
        return None


async def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[Dict[str, Any]]:
    """Return user if bearer token is valid, otherwise None."""
    if not credentials or not credentials.credentials:
        return None
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    db = get_db()
    if db is None:
        return None
    user = db.users.find_one({"id": user_id})
    return serialize_doc(user)


async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Dict[str, Any]:
    """Strict dependency: requires authenticated user."""
    user = await get_current_user_optional(credentials)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_roles(*allowed_roles: str):
    """Enforce role-based access control dependency."""
    async def role_checker(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = user.get("role")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {', '.join(allowed_roles)}. Your role is '{user_role}'."
            )
        return user
    return role_checker


def can_access_application(user: Dict[str, Any], app_doc: Dict[str, Any]) -> bool:
    """Check if user can view an application."""
    role = user.get("role")
    if role in (ROLE_ADMIN, ROLE_REVIEWER):
        return True
    if role == ROLE_INSTITUTION:
        # User owns application or matches institution_id
        return (
            app_doc.get("created_by_user_id") == user.get("id") or
            (app_doc.get("institution_id") and app_doc.get("institution_id") == user.get("institution_id")) or
            (app_doc.get("contact_email") and app_doc.get("contact_email").lower() == user.get("email", "").lower())
        )
    return False


# Status transition rules
ALLOWED_TRANSITIONS = {
    "Draft": ["Submitted"],
    "Submitted": ["Under Review"],
    "Under Review": ["Correction Required", "Approved", "Rejected"],
    "Correction Required": ["Resubmitted"],
    "Resubmitted": ["Under Review"],
    "Approved": [],  # Terminal
    "Rejected": []   # Terminal
}


def can_transition_status(user: Dict[str, Any], current_status: str, target_status: str) -> Tuple[bool, str]:
    """Validate status transition rules and user permissions."""
    allowed = ALLOWED_TRANSITIONS.get(current_status, [])
    if target_status not in allowed:
        return False, f"Invalid transition: Cannot move application from '{current_status}' to '{target_status}'. Allowed transitions: {allowed if allowed else 'None (Terminal state)'}"

    role = user.get("role")

    # Draft -> Submitted: Institution user or Admin
    if current_status == "Draft" and target_status == "Submitted":
        if role not in (ROLE_INSTITUTION, ROLE_ADMIN):
            return False, "Only Institution User or Administrator can submit an application."
        return True, "OK"

    # Correction Required -> Resubmitted: Institution user or Admin
    if current_status == "Correction Required" and target_status == "Resubmitted":
        if role not in (ROLE_INSTITUTION, ROLE_ADMIN):
            return False, "Only Institution User or Administrator can resubmit an application."
        return True, "OK"

    # Privileged status changes (Submitted -> Under Review, Under Review -> Correction Required / Approved / Rejected, Resubmitted -> Under Review)
    if role not in (ROLE_REVIEWER, ROLE_ADMIN):
        return False, f"Privileged action: Only Reviewer or Administrator can move status to '{target_status}'."

    return True, "OK"
