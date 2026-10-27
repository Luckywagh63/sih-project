import os
import re
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
from uuid import uuid4
from dotenv import load_dotenv

from database import get_db, serialize_doc, now_utc_iso

load_dotenv()

def get_smtp_config() -> Dict[str, Any]:
    """Dynamically read SMTP credentials from environment with override."""
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        load_dotenv(env_path, override=True)
    else:
        load_dotenv(override=True)

    host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
    port = int(os.getenv("SMTP_PORT", "587").strip() or "587")
    user = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASSWORD", "").strip()
    from_addr = (os.getenv("SMTP_FROM") or os.getenv("SMTP_USER") or "aicte.portal@gov.in").strip()
    from_name = os.getenv("SMTP_FROM_NAME", "AICTE Approval Bureau").strip()
    tls = os.getenv("SMTP_TLS", "true").strip().lower() in ("true", "1", "yes")
    ssl = os.getenv("SMTP_SSL", "false").strip().lower() in ("true", "1", "yes") or port == 465
    frontend = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000").strip()

    return {
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "from_addr": from_addr,
        "from_name": from_name,
        "tls": tls,
        "ssl": ssl,
        "frontend": frontend
    }


FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000").strip()


def is_email_configured() -> bool:
    """Returns True if SMTP credentials are provided in .env."""
    cfg = get_smtp_config()
    return bool(cfg["host"] and cfg["user"] and cfg["password"])

# Status Styling Map
STATUS_META = {
    "Submitted": {
        "color": "#15803d",
        "bg": "#f0fdf4",
        "border": "#86efac",
        "badge_text": "SUBMITTED FOR SCRUTINY",
        "action": "Your application has been received and queued for statutory committee scrutiny."
    },
    "Under Review": {
        "color": "#1d4ed8",
        "bg": "#eff6ff",
        "border": "#93c5fd",
        "badge_text": "UNDER COMMITTEE REVIEW",
        "action": "Your application is currently being evaluated by the AICTE Scrutiny Committee."
    },
    "Correction Required": {
        "color": "#b45309",
        "bg": "#fffbeb",
        "border": "#fde68a",
        "badge_text": "ACTION REQUIRED: CORRECTIONS REQUESTED",
        "action": "The scrutiny reviewer has requested specific document/data corrections. Please log in to update."
    },
    "Resubmitted": {
        "color": "#7e22ce",
        "bg": "#faf5ff",
        "border": "#d8b4fe",
        "badge_text": "RESUBMITTED WITH CORRECTIONS",
        "action": "Your revisions have been submitted and are awaiting reviewer verification."
    },
    "Approved": {
        "color": "#15803d",
        "bg": "#f0fdf4",
        "border": "#86efac",
        "badge_text": "AICTE APPROVAL GRANTED",
        "action": "Congratulations! Formal AICTE Approval has been sanctioned. You may download the Approval Order."
    },
    "Rejected": {
        "color": "#b91c1c",
        "bg": "#fef2f2",
        "border": "#fca5a5",
        "badge_text": "APPLICATION REJECTED",
        "action": "Following scrutiny evaluation, the committee has declined approval for this cycle."
    }
}


def is_email_configured() -> bool:
    """Returns True if SMTP credentials are provided in .env."""
    cfg = get_smtp_config()
    return bool(cfg["host"] and cfg["user"] and cfg["password"])


def validate_email(email_str: Optional[str]) -> Tuple[bool, str]:
    """Validate recipient email format."""
    if not email_str:
        return False, "Email address is missing."
    clean = str(email_str).strip().lower()
    pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    if not re.match(pattern, clean):
        return False, f"Invalid email format: '{email_str}'"
    return True, clean


def render_email_content(
    trigger: str,
    app_doc: Dict[str, Any],
    reviewer_comments: Optional[str] = None
) -> Tuple[str, str, str]:
    """
    Renders official subject line, plain text body, and responsive HTML email.
    Embeds College Name, College ID, Contact Person, Application ID, and Status Details.
    """
    app_id = app_doc.get("id", "AICTE-APP")
    institution = app_doc.get("institution", "Institution")
    institution_id = app_doc.get("institution_id") or app_doc.get("college_id", "N/A")
    contact_name = app_doc.get("contact_name") or app_doc.get("person_name", "Applicant")
    app_type = app_doc.get("type", "Extension of Approval")
    status = app_doc.get("status", trigger)
    notes = reviewer_comments or app_doc.get("review_notes", "")

    meta = STATUS_META.get(status, {
        "color": "#334155",
        "bg": "#f8fafc",
        "border": "#cbd5e1",
        "badge_text": status.upper(),
        "action": f"Application status has been updated to {status}."
    })

    subject = f"[AICTE Portal] Application {app_id} Status Update: {status} ({institution})"

    # Plain text version
    text_lines = [
        "ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE)",
        "Approval Bureau — Workflow Automation Notification",
        "=" * 60,
        f"Dear {contact_name},",
        "",
        f"This is an official status update regarding your AICTE approval application.",
        "",
        f"Application ID: {app_id}",
        f"Institution Name: {institution}",
        f"Permanent College ID: {institution_id}",
        f"Application Type: {app_type}",
        f"Current Status: {status} ({meta['badge_text']})",
        f"Timestamp: {now_utc_iso()}",
        "",
        f"Status Description: {meta['action']}",
    ]

    if notes:
        text_lines.extend([
            "",
            "Reviewer Comments / Remarks:",
            f"\"{notes}\""
        ])

    text_lines.extend([
        "",
        "Access Portal:",
        f"{FRONTEND_ORIGIN}",
        "",
        "This is an automated system notification from the AICTE Approval Platform.",
        "Please do not reply directly to this email."
    ])
    plain_text = "\n".join(text_lines)

    # Professional HTML version
    notes_html = ""
    if notes:
        notes_html = f"""
        <div style="margin-top: 18px; padding: 14px 16px; background-color: #f8fafc; border-left: 4px solid {meta['color']}; border-radius: 6px;">
            <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                Reviewer Comments & Scrutiny Remarks
            </div>
            <div style="font-size: 13px; color: #1e293b; line-height: 1.5;">
                {notes}
            </div>
        </div>
        """

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 24px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
                    
                    <!-- Tricolor Accent Top Bar -->
                    <tr>
                        <td style="height: 5px; background: linear-gradient(90deg, #ff9933 33.3%, #ffffff 33.3%, #ffffff 66.6%, #138808 66.6%);"></td>
                    </tr>

                    <!-- Header -->
                    <tr>
                        <td style="padding: 24px 28px 18px; background-color: #0b1528; color: #ffffff; text-align: left;">
                            <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: #93c5fd; text-transform: uppercase; margin-bottom: 4px;">
                                Government of India • AICTE Approval Bureau
                            </div>
                            <div style="font-size: 18px; font-weight: 800; color: #ffffff; margin-bottom: 4px;">
                                All India Council for Technical Education
                            </div>
                            <div style="font-size: 12px; color: #cbd5e1;">
                                Approval Process Workflow & Compliance Automation Platform
                            </div>
                        </td>
                    </tr>

                    <!-- Status Banner -->
                    <tr>
                        <td style="padding: 20px 28px; background-color: {meta['bg']}; border-bottom: 1px solid {meta['border']};">
                            <span style="display: inline-block; padding: 5px 12px; font-size: 11px; font-weight: 800; border-radius: 999px; background-color: {meta['color']}; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                                {meta['badge_text']}
                            </span>
                            <div style="font-size: 16px; font-weight: 700; color: #0f172a; line-height: 1.4;">
                                {meta['action']}
                            </div>
                        </td>
                    </tr>

                    <!-- Main Body Content -->
                    <tr>
                        <td style="padding: 28px; font-size: 13px; line-height: 1.6; color: #334155;">
                            <p style="margin: 0 0 16px; font-size: 14px;">
                                Dear <strong>{contact_name}</strong>,
                            </p>
                            <p style="margin: 0 0 20px;">
                                This is an automated notification from the AICTE Centralized Scrutiny Portal regarding the approval application filed for <strong>{institution}</strong>.
                            </p>

                            <!-- Key Application Summary Card -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 20px;">
                                <tr>
                                    <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #64748b; width: 40%;">
                                        Application ID
                                    </td>
                                    <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 700; color: #0f172a; font-family: monospace;">
                                        {app_id}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
                                        College / Institution
                                    </td>
                                    <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 700; color: #0f172a;">
                                        {institution}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
                                        Permanent College ID
                                    </td>
                                    <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 700; color: #0f172a; font-family: monospace;">
                                        {institution_id}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
                                        Application Type
                                    </td>
                                    <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 600; color: #0f172a;">
                                        {app_type}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 16px; font-size: 12px; color: #64748b;">
                                        Authorized Contact
                                    </td>
                                    <td style="padding: 10px 16px; font-size: 12px; font-weight: 600; color: #0f172a;">
                                        {contact_name}
                                    </td>
                                </tr>
                            </table>

                            {notes_html}

                            <!-- Call to Action Button -->
                            <div style="margin: 28px 0 16px; text-align: center;">
                                <a href="{FRONTEND_ORIGIN}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 13px; font-weight: 700; border-radius: 6px; box-shadow: 0 2px 6px rgba(37,99,235,0.3);">
                                    Open AICTE Application Portal →
                                </a>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; line-height: 1.5; text-align: center;">
                            <p style="margin: 0 0 6px;">
                                <strong>All India Council for Technical Education</strong> • Nelson Mandela Marg, Vasant Kunj, New Delhi-110070
                            </p>
                            <p style="margin: 0; color: #94a3b8;">
                                This is an automated statutory notification. Please do not reply directly to this email. For assistance, contact the AICTE Helpdesk.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""

    return subject, plain_text, html_content


def trigger_email_notification(
    app_doc: Dict[str, Any],
    trigger_event: str,
    comments: Optional[str] = None
) -> Dict[str, Any]:
    """
    Dispatches formal AICTE status update email to the institution's contact email.
    If SMTP credentials are not configured, records the email in development/audit mode
    so it can be previewed directly in the portal without errors.
    """
    db = get_db()
    app_id = app_doc.get("id", "UNKNOWN")
    recipient = app_doc.get("contact_email")
    notif_id = f"EMAIL-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"

    # Render email content
    subject, plain_text, html_body = render_email_content(trigger_event, app_doc, comments)

    # Idempotency / Deduplication check within 60s
    idempotency_key = f"{app_id}:{trigger_event}:email:{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}"
    if db is not None:
        recent = db.notifications.find_one({"idempotency_key": idempotency_key})
        if recent:
            return {
                "sent": False,
                "status": "duplicate_skipped",
                "message": f"Duplicate email for {app_id} suppressed within 60s cooldown.",
                "notification_id": recent.get("id")
            }

    # Validate recipient email format
    is_valid, email_or_err = validate_email(recipient)
    if not is_valid:
        record = {
            "id": notif_id,
            "application_id": app_id,
            "channel": "email",
            "recipient_email": recipient or "None",
            "trigger_event": trigger_event,
            "subject": subject,
            "message": plain_text,
            "message_html": html_body,
            "status": "failed",
            "provider": "smtp",
            "provider_message_id": None,
            "error_detail": email_or_err,
            "attempt_count": 0,
            "idempotency_key": idempotency_key,
            "created_at": now_utc_iso(),
            "updated_at": now_utc_iso()
        }
        if db is not None:
            try:
                db.notifications.insert_one(record)
            except Exception:
                pass
        return {
            "sent": False,
            "status": "failed",
            "error": email_or_err,
            "notification_id": notif_id
        }

    formatted_email = email_or_err

    # Check if SMTP is configured
    if not is_email_configured():
        # Audit mode: SMTP credentials not set, log full rendered email in database for portal review
        notice = "SMTP not configured in backend/.env (set SMTP_USER & SMTP_PASSWORD for live delivery). Email generated and recorded in portal audit logs."
        record = {
            "id": notif_id,
            "application_id": app_id,
            "channel": "email",
            "recipient_email": formatted_email,
            "trigger_event": trigger_event,
            "subject": subject,
            "message": plain_text,
            "message_html": html_body,
            "status": "delivered_dev_mode",
            "provider": "smtp_dev",
            "provider_message_id": f"DEV-{uuid4().hex[:8].upper()}",
            "error_detail": notice,
            "attempt_count": 1,
            "idempotency_key": idempotency_key,
            "created_at": now_utc_iso(),
            "updated_at": now_utc_iso()
        }
        if db is not None:
            try:
                db.notifications.insert_one(record)
            except Exception:
                pass
        print(f"[Email Notification (Dev Mode)] To: {formatted_email} | Subject: {subject}")
        return {
            "sent": True,
            "status": "delivered_dev_mode",
            "notification_id": notif_id,
            "recipient": formatted_email,
            "subject": subject,
            "provider": "smtp_dev",
            "note": notice
        }

    # Execute actual SMTP Dispatch
    try:
        cfg = get_smtp_config()
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{cfg['from_name']} <{cfg['from_addr']}>"
        msg["To"] = formatted_email
        msg["Date"] = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000")

        # Attach text & HTML parts
        msg.attach(MIMEText(plain_text, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        if cfg["ssl"] or cfg["port"] == 465:
            server = smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=15)
        else:
            server = smtplib.SMTP(cfg["host"], cfg["port"], timeout=15)
            server.ehlo()
            if cfg["tls"]:
                server.starttls()
                server.ehlo()

        server.login(cfg["user"], cfg["password"])
        server.sendmail(cfg["from_addr"], [formatted_email], msg.as_string())
        server.quit()

        msg_id = f"MSG-{uuid4().hex[:8].upper()}"
        record = {
            "id": notif_id,
            "application_id": app_id,
            "channel": "email",
            "recipient_email": formatted_email,
            "trigger_event": trigger_event,
            "subject": subject,
            "message": plain_text,
            "message_html": html_body,
            "status": "delivered",
            "provider": "smtp",
            "provider_message_id": msg_id,
            "error_detail": None,
            "attempt_count": 1,
            "idempotency_key": idempotency_key,
            "created_at": now_utc_iso(),
            "updated_at": now_utc_iso()
        }
        if db is not None:
            try:
                db.notifications.insert_one(record)
            except Exception:
                pass
        print(f"[Email Notification] Live email sent to {formatted_email} (ID: {notif_id})")
        return {
            "sent": True,
            "status": "delivered",
            "provider_message_id": msg_id,
            "notification_id": notif_id,
            "recipient": formatted_email,
            "subject": subject,
            "provider": "smtp"
        }

    except Exception as exc:
        err_msg = str(exc)
        print(f"[Email Notification Error] Failed to send to {formatted_email}: {err_msg}")
        record = {
            "id": notif_id,
            "application_id": app_id,
            "channel": "email",
            "recipient_email": formatted_email,
            "trigger_event": trigger_event,
            "subject": subject,
            "message": plain_text,
            "message_html": html_body,
            "status": "failed",
            "provider": "smtp",
            "provider_message_id": None,
            "error_detail": f"SMTP Error: {err_msg}",
            "attempt_count": 1,
            "idempotency_key": idempotency_key,
            "created_at": now_utc_iso(),
            "updated_at": now_utc_iso()
        }
        if db is not None:
            try:
                db.notifications.insert_one(record)
            except Exception:
                pass
        return {
            "sent": False,
            "status": "failed",
            "error": err_msg,
            "notification_id": notif_id,
            "recipient": formatted_email
        }


def send_test_email(recipient_email: str) -> Dict[str, Any]:
    """Sends a verification test email with AICTE branding."""
    mock_app = {
        "id": "AICTE-TEST-EMAIL",
        "institution": "All India Institute of Technology",
        "institution_id": "AICTE-DEMO-2026",
        "contact_name": "Portal Administrator",
        "contact_email": recipient_email,
        "type": "Extension of Approval",
        "status": "Under Review",
        "review_notes": "This is a verification test dispatch confirming that email status notification channel is functional."
    }
    return trigger_email_notification(mock_app, trigger_event="Under Review")
