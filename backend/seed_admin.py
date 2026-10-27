"""
AICTE Approval Workflow Automation - Admin & Demo Account Provisioning Script
Usage:
    python seed_admin.py [--admin-email admin@aicte.gov.in] [--admin-password <password>]
"""
import sys
import argparse
from uuid import uuid4
from database import get_db, serialize_doc, now_utc_iso
from auth import hash_password, ROLE_ADMIN, ROLE_REVIEWER, ROLE_INSTITUTION

def seed(admin_email="admin@aicte.gov.in", admin_password="AdminSecure@2026", seed_demo_accounts=True):
    db = get_db()
    if db is None:
        print("[Error] Could not connect to MongoDB Atlas. Check your MONGODB_URI in backend/.env")
        sys.exit(1)

    print("[Seed] Connected to MongoDB database:", db.name)

    # 1. Administrator
    existing_admin = db.users.find_one({"email": admin_email.lower()})
    if not existing_admin:
        admin_id = f"ADM-{uuid4().hex[:8].upper()}"
        admin_doc = {
            "id": admin_id,
            "email": admin_email.lower(),
            "hashed_password": hash_password(admin_password),
            "name": "Dr. Anil Sahasrabudhe (HQ Administrator)",
            "role": ROLE_ADMIN,
            "institution_id": "AICTE-HQ",
            "institution_name": "All India Council for Technical Education",
            "created_at": now_utc_iso()
        }
        db.users.insert_one(admin_doc)
        print(f"[Seed] Created Administrator: {admin_email} (Password: {admin_password})")
    else:
        print(f"[Seed] Administrator already exists: {admin_email}")

    if seed_demo_accounts:
        # 2. Reviewer
        rev_email = "reviewer@aicte.gov.in"
        rev_pw = "ReviewerSecure@2026"
        if not db.users.find_one({"email": rev_email}):
            rev_doc = {
                "id": f"REV-{uuid4().hex[:8].upper()}",
                "email": rev_email,
                "hashed_password": hash_password(rev_pw),
                "name": "Prof. S. R. Sharma (Scrutiny Officer)",
                "role": ROLE_REVIEWER,
                "institution_id": "AICTE-WRO",
                "institution_name": "Western Regional Scrutiny Bureau",
                "created_at": now_utc_iso()
            }
            db.users.insert_one(rev_doc)
            print(f"[Seed] Created Reviewer: {rev_email} (Password: {rev_pw})")
        else:
            print(f"[Seed] Reviewer already exists: {rev_email}")

        # 3. Institution Applicant
        inst_email = "principal@mit.edu.in"
        inst_pw = "MitSecure@2026"
        if not db.users.find_one({"email": inst_email}):
            inst_doc = {
                "id": f"USR-{uuid4().hex[:8].upper()}",
                "email": inst_email,
                "hashed_password": hash_password(inst_pw),
                "name": "Dr. R. K. Joshi (Principal)",
                "role": ROLE_INSTITUTION,
                "institution_id": "AICTE-W-10492",
                "institution_name": "Maharashtra Institute of Technology",
                "created_at": now_utc_iso()
            }
            db.users.insert_one(inst_doc)
            print(f"[Seed] Created Institution User: {inst_email} (Password: {inst_pw})")
        else:
            print(f"[Seed] Institution User already exists: {inst_email}")

    print("\n[Done] Provisioning complete. You can now log into the portal with these credentials.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed initial AICTE accounts")
    parser.add_argument("--admin-email", default="admin@aicte.gov.in", help="Admin email")
    parser.add_argument("--admin-password", default="AdminSecure@2026", help="Admin password")
    parser.add_argument("--no-demo", action="store_true", help="Skip creating demo reviewer and institution accounts")
    args = parser.parse_args()

    seed(admin_email=args.admin_email, admin_password=args.admin_password, seed_demo_accounts=not args.no_demo)
