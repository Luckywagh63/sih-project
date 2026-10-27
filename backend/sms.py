import os
import re
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, Tuple
from uuid import uuid4
from dotenv import load_dotenv

from database import get_db, serialize_doc, now_utc_iso

load_dotenv()

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
TWILIO_PHONE_NUMBER = (os.getenv("TWILIO_PHONE_NUMBER") or os.getenv("TWILIO_SMS_FROM") or "").strip()

# Default SMS Templates per trigger with college name, college id, and person name
SMS_TEMPLATES = {
    "Submitted": "AICTE Portal: Application {app_id} for {institution} (College ID: {institution_id}) submitted successfully by {contact_name}. Queued for scrutiny.",
    "Under Review": "AICTE Portal: Application {app_id} for {institution} (College ID: {institution_id}), submitted by {contact_name}, has moved to next level: Under Review phase by scrutiny committee.",
    "Correction Required": "AICTE Portal: Action required on application {app_id} for {institution} (College ID: {institution_id}, Attn: {contact_name}). Reviewer requested document corrections.",
    "Resubmitted": "AICTE Portal: Application {app_id} for {institution} (College ID: {institution_id}) has been resubmitted with corrections by {contact_name}.",
    "Approved": "AICTE Portal: Formal AICTE Approval granted for application {app_id} for {institution} (College ID: {institution_id}, Attn: {contact_name}). Order available in portal.",
    "Rejected": "AICTE Portal: Application {app_id} for {institution} (College ID: {institution_id}, Attn: {contact_name}) has been rejected following scrutiny review."
}


FAST2SMS_API_KEY = os.getenv("FAST2SMS_API_KEY", "").strip()


def is_twilio_configured() -> bool:
    """Check if Twilio credentials or Fast2SMS are configured."""
    if os.getenv("FAST2SMS_API_KEY", "").strip():
        return True
    return bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER)



def validate_phone_e164(phone: Optional[str]) -> Tuple[bool, str]:
    """Validate phone number in international E.164 format (+[country][number])."""
    if not phone:
        return False, "Phone number is empty."
    clean = re.sub(r"[\s\-\(\)]", "", str(phone).strip())
    if not re.match(r"^\+[1-9]\d{7,14}$", clean):
        return False, f"Invalid format '{phone}'. Phone must be in E.164 format with country code (e.g. +919876543210)."
    return True, clean


def render_sms_text(trigger: str, app_doc: Dict[str, Any], custom_msg: Optional[str] = None) -> str:
    """Render notification text from template or custom message with institution, id, person name."""
    if custom_msg:
        return custom_msg
    template = SMS_TEMPLATES.get(
        trigger,
        "AICTE Portal: Application {app_id} for {institution} (College ID: {institution_id}, Attn: {contact_name}) status updated to {status}."
    )
    return template.format(
        app_id=app_doc.get("id", "AICTE-APP"),
        institution=app_doc.get("institution", "Institution"),
        institution_id=app_doc.get("institution_id") or app_doc.get("college_id", "N/A"),
        contact_name=app_doc.get("contact_name") or app_doc.get("person_name", "Applicant"),
        status=app_doc.get("status", trigger)
    )


def trigger_sms_notification(
    app_doc: Dict[str, Any],
    trigger_event: str,
    custom_message: Optional[str] = None
) -> Dict[str, Any]:
    """
    Dispatches SMS notification if configured, records attempt and message in MongoDB notifications collection.
    Guaranteed not to throw unhandled exceptions: application state updates remain intact regardless of Twilio errors.
    """
    db = get_db()
    app_id = app_doc.get("id", "UNKNOWN")
    recipient = app_doc.get("contact_mobile")
    message_text = render_sms_text(trigger_event, app_doc, custom_message)
    notif_id = f"NOTIF-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"

    # Deduplication / Idempotency: Check if duplicate notification sent for this application and trigger in the last 60 seconds
    idempotency_key = f"{app_id}:{trigger_event}:{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}"
    if db is not None:
        recent = db.notifications.find_one({"idempotency_key": idempotency_key})
        if recent:
            return {
                "sent": False,
                "status": "duplicate_skipped",
                "message": f"Duplicate notification for {app_id} and trigger '{trigger_event}' suppressed within 60s cooldown.",
                "notification_id": recent.get("id")
            }

    # Validate phone format
    valid_phone, phone_or_err = validate_phone_e164(recipient)
    if not valid_phone:
        record = {
            "id": notif_id,
            "application_id": app_id,
            "recipient_phone": recipient or "None",
            "trigger_event": trigger_event,
            "message": message_text,
            "status": "failed",
            "provider": "twilio",
            "provider_message_id": None,
            "error_detail": phone_or_err,
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
            "error": phone_or_err,
            "notification_id": notif_id
        }

    formatted_phone = phone_or_err

    # If Twilio is not configured
    if not is_twilio_configured():
        missing_parts = []
        if not TWILIO_ACCOUNT_SID:
            missing_parts.append("TWILIO_ACCOUNT_SID")
        if not TWILIO_AUTH_TOKEN:
            missing_parts.append("TWILIO_AUTH_TOKEN")
        if not TWILIO_PHONE_NUMBER or TWILIO_PHONE_NUMBER == "+10000000000":
            missing_parts.append("TWILIO_PHONE_NUMBER")

        reason = f"Twilio SMS is not active. Missing or default credentials: {', '.join(missing_parts)}."
        record = {
            "id": notif_id,
            "application_id": app_id,
            "recipient_phone": formatted_phone,
            "trigger_event": trigger_event,
            "message": message_text,
            "status": "not_configured",
            "provider": "twilio",
            "provider_message_id": None,
            "error_detail": reason,
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
            "status": "not_configured",
            "message": reason,
            "notification_id": notif_id
        }

    # Check if Fast2SMS is configured for Indian (+91) direct custom SMS without trial template restrictions
    fast2sms_key = os.getenv("FAST2SMS_API_KEY", "").strip()
    if fast2sms_key and formatted_phone.startswith("+91"):
        try:
            import requests
            clean_num = formatted_phone.replace("+91", "").replace("+", "").strip()
            payload = {
                "route": "q",
                "message": message_text,
                "numbers": clean_num
            }
            headers = {
                "authorization": fast2sms_key,
                "Content-Type": "application/json"
            }
            resp = requests.post("https://www.fast2sms.com/dev/bulkV2", json=payload, headers=headers, timeout=10)
            res_json = resp.json() if resp.status_code == 200 else {}
            if res_json.get("return"):
                req_id = res_json.get("request_id") or "FAST2SMS"
                record = {
                    "id": notif_id,
                    "application_id": app_id,
                    "recipient_phone": formatted_phone,
                    "trigger_event": trigger_event,
                    "message": message_text,
                    "status": "submitted",
                    "provider": "fast2sms",
                    "provider_message_id": req_id,
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
                return {
                    "sent": True,
                    "status": "submitted",
                    "provider_message_id": req_id,
                    "notification_id": notif_id,
                    "recipient": formatted_phone,
                    "provider": "fast2sms"
                }
            else:
                err_info = res_json.get("message", [resp.text])
                err_str = ", ".join(err_info) if isinstance(err_info, list) else str(err_info)
                print(f"[Fast2SMS Warning] Dispatch failed: {err_str}. Falling back to Twilio.")
        except Exception as f2s_exc:
            print(f"[Fast2SMS Warning] Exception: {f2s_exc}. Falling back to Twilio.")

    # Execute dispatch via Twilio SDK
    try:
        from twilio.rest import Client
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        
        # Attempt direct dispatch with full regulatory message text
        is_trial_fallback = False
        enable_trial_c_and_r_fallback = os.getenv("TWILIO_TRIAL_FALLBACK", "false").strip().lower() in ("true", "1", "yes")
        try:
            msg = client.messages.create(
                body=message_text,
                from_=TWILIO_PHONE_NUMBER,
                to=formatted_phone
            )
        except Exception as first_exc:
            err_str = str(first_exc)
            if ("572006" in err_str or "Trial accounts can only use predefined" in err_str) and enable_trial_c_and_r_fallback:
                # Twilio trial account restriction detected: optional fallback to predefined template
                is_trial_fallback = True
                msg = client.messages.create(
                    body="sms_appointment_reminders",
                    from_=TWILIO_PHONE_NUMBER,
                    to=formatted_phone
                )
            else:
                raise first_exc

        provider_sid = getattr(msg, "sid", None)
        provider_status = getattr(msg, "status", "submitted")

        record = {
            "id": notif_id,
            "application_id": app_id,
            "recipient_phone": formatted_phone,
            "trigger_event": trigger_event,
            "message": message_text,
            "status": "submitted" if provider_status in ("queued", "sent", "submitted") else provider_status,
            "provider": "twilio",
            "provider_message_id": provider_sid,
            "error_detail": "Delivered via Twilio Trial Template (C&R Appointment Reminder). Twilio Free Trial accounts strictly prohibit custom message bodies to Indian (+91) numbers (Twilio Error 572006). Upgrade Twilio account in console to deliver the full AICTE status message with College Name & ID directly to mobile handsets." if is_trial_fallback else None,
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
            "sent": True,
            "status": record["status"],
            "provider_message_id": provider_sid,
            "notification_id": notif_id,
            "recipient": formatted_phone,
            "trial_template_used": is_trial_fallback
        }
    except Exception as exc:
        raw_err = str(exc)
        # Strip ANSI escape codes
        clean_err = re.sub(r"\x1b\[[0-9;]*[mK]", "", raw_err).strip()

        # Add helpful human-readable guidance for common Twilio trial issues
        if "572006" in clean_err or "Trial accounts can only use predefined" in clean_err:
            clean_err = (
                "Twilio Trial Policy (Error 572006): Twilio Free Trial accounts strictly prohibit sending "
                "custom SMS text to international (+91) mobile numbers. The exact AICTE message with College Name, "
                "College ID, and Contact Person has been generated and recorded in MongoDB Atlas. To deliver this custom text "
                "directly to your mobile handset, upgrade your Twilio account from Trial to Full in Twilio Console (https://console.twilio.com/)."
            )
        elif "21606" in clean_err or "not a valid, incoming phone number" in clean_err:
            clean_err = (
                "Twilio Sender Error (21606): The sender number is invalid or not owned by your Twilio account. "
                "Please obtain an active number from Twilio Console and update TWILIO_PHONE_NUMBER in backend/.env."
            )
        elif "21608" in clean_err or "unverified" in clean_err.lower():
            clean_err = (
                f"Twilio Trial Recipient Error (21608): The recipient number {formatted_phone} is not verified. "
                "On Twilio trial accounts, you must verify destination numbers at: "
                "https://console.twilio.com/us1/develop/phone-numbers/manage/verified"
            )

        record = {
            "id": notif_id,
            "application_id": app_id,
            "recipient_phone": formatted_phone,
            "trigger_event": trigger_event,
            "message": message_text,
            "status": "failed",
            "provider": "twilio",
            "provider_message_id": None,
            "error_detail": clean_err,
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
        print(f"[SMS Warning] Twilio dispatch failed for {app_id} to {formatted_phone}: {clean_err}")
        return {
            "sent": False,
            "status": "failed",
            "error": clean_err,
            "notification_id": notif_id
        }

