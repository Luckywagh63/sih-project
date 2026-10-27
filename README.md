# AICTE Approval Workflow Automation Platform

A complete, production-grade, end-to-end statutory approval workflow automation platform designed for technical education regulatory administration (AICTE). Features connected Next.js (App Router) and Python FastAPI microservices backed by MongoDB Atlas, RBAC authentication, document upload verification with magic-byte validation, preliminary compliance analysis, audit trailing, and Twilio SMS notification dispatch.

---

## 1. System Architecture

- **Frontend**: Next.js 15 (App Router), React 19, JavaScript & JSX (no TypeScript), native styling strictly adhering to the original design palette (`frontend/app/globals.css` preserved 100% without modification).
- **Backend**: Python 3.12, FastAPI, PyMongo, Pydantic v2 schemas, JWT authentication, and REST APIs with interactive documentation at `/docs`.
- **Database**: MongoDB Atlas (`aicte_workflow`), indexed collections: `users`, `applications`, `documents`, `history`, `notifications`.
- **SMS Gateway**: Twilio REST API integration with E.164 phone validation, idempotency cooldown, and carrier error handling.
- **Document Management**: Local development storage with isolated safe filenames, path-traversal safeguards, MIME and magic-byte validation (`%PDF`, PNG, JPG, JPEG), and authorized streaming downloads.
- **Compliance Module**: Deterministic statutory checklist calculating preliminary compliance scores (0-100%), classifying risk (Low, Medium, High), and diagnosing missing statutory records with actionable guidance.

---

## 2. Windows PowerShell Setup & Run Instructions

Open two separate Windows PowerShell windows.

### Terminal 1: Backend (FastAPI + MongoDB Atlas)
```powershell
# Navigate to backend directory
cd C:\Users\Lucky\css\Desktop\sih-2\backend

# (Optional) Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
python -m pip install -r requirements.txt

# Run initial administrative database seed
python seed_admin.py

# Start the FastAPI server on port 8000
uvicorn main:app --reload --port 8000
```
Backend API interactive documentation is available at: **http://127.0.0.1:8000/docs**

---

### Terminal 2: Frontend (Next.js App Router)
```powershell
# Navigate to frontend directory
cd C:\Users\Lucky\css\Desktop\sih-2\frontend

# Install node dependencies
npm install

# Start the Next.js development server on port 3000
npm run dev
```
Open your browser and navigate to: **http://localhost:3000**

---

## 3. Seeded Accounts for Evaluation & Demo

The database has been pre-seeded with three distinct role accounts for testing the complete lifecycle:

| Role | Email | Password | Scope & Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@aicte.gov.in` | `AdminSecure@2026` | Full platform access, user management, reviewer assignment, override controls. |
| **Reviewer** | `reviewer@aicte.gov.in` | `ReviewerSecure@2026` | Scrutiny review, record reviewer comments, status transitions (Under Review, Correction Required, Approve, Reject). |
| **Institution User** | `principal@mit.edu.in` | `MitSecure@2026` | Create applications, upload statutory documents, resubmit after corrections. |

*Tip: Click the **"Sign In / Switch Role"** button in the sidebar to switch between roles or register a new institution.*

---

## 4. Configuration Details

### MongoDB Atlas Configuration (`backend/.env`)
The backend connects to MongoDB Atlas using the `MONGODB_URI` environment variable.
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=aicte_workflow
```
- Ensure network access in MongoDB Atlas allows your IP or `0.0.0.0/0`.
- The database creates unique indexes on `applications.id` and `users.email`.
- Real-time connectivity and latency can be checked via the `/api/health` endpoint or the **Infrastructure Status** page.

### Twilio SMS Configuration (`backend/.env`)
```env
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
```
- **Trial Account Restrictions**: If using a Twilio free trial account, all recipient phone numbers (`contact_mobile`) must be verified in the Twilio Console before messages can be delivered.
- **Graceful Degradation**: If Twilio credentials or phone numbers are absent, the platform will continue to function normally. SMS attempts will be marked as `not_configured` in MongoDB without interrupting application updates.

---

## 5. Automated Tests

Run backend tests using pytest:
```powershell
cd C:\Users\Lucky\css\Desktop\sih-2\backend
python -m pytest tests/test_api.py -v
```

Tests verify:
- System and database health endpoint (`/api/health`)
- Authentication (login failure, login success, `/api/auth/me` token resolution)
- Live dashboard statistics calculation from MongoDB
- Complete application lifecycle and role-based status transitions
- Document upload validation (rejects corrupt/spoofed files, validates magic bytes)
- Twilio notification resilience and deduplication
