from typing import Dict, Any, List

REQUIRED_DOCUMENTS = [
    {
        "type": "Institution Registration",
        "description": "Society / Trust / Company registration certificate or Government Gazette notification.",
        "weight": 15
    },
    {
        "type": "Faculty Details",
        "description": "Cadre ratio compliance, approved faculty roster, qualification and scale records.",
        "weight": 15
    },
    {
        "type": "Infrastructure Report",
        "description": "Built-up area layout, land title certificate, barrier-free access, and laboratory specs.",
        "weight": 15
    },
    {
        "type": "Financial Statement",
        "description": "Audited balance sheet, income/expenditure statement, and FDR bank certificates.",
        "weight": 15
    }
]

REQUIRED_FIELDS = [
    {
        "field": "institution",
        "label": "Institution Name",
        "weight": 6,
        "resolution": "Provide the official legal name of the institution as registered in government records."
    },
    {
        "field": "institution_id",
        "label": "Institution Permanent ID",
        "weight": 6,
        "resolution": "Enter your permanent AICTE ID or State Board affiliation code."
    },
    {
        "field": "type",
        "label": "Application Type",
        "weight": 5,
        "resolution": "Select an approved category (e.g., Extension of Approval, New Approval, Course Addition, Intake Change)."
    },
    {
        "field": "contact_name",
        "label": "Authorized Contact Person",
        "weight": 6,
        "resolution": "Specify the full name of Principal, Director, or authorized Trust secretary."
    },
    {
        "field": "contact_email",
        "label": "Official Contact Email",
        "weight": 6,
        "resolution": "Enter a valid official institutional email for correspondence."
    },
    {
        "field": "contact_mobile",
        "label": "Mobile Number with Country Code",
        "weight": 6,
        "resolution": "Provide phone number with international dial code (e.g., +919876543210) for automated SMS notifications."
    },
    {
        "field": "address",
        "label": "Campus Physical Address",
        "weight": 5,
        "resolution": "Enter the complete physical campus address including city, state, and PIN code."
    }
]


def evaluate_compliance(app_doc: Dict[str, Any], documents: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Evaluates preliminary compliance checklist for an AICTE application.
    Deterministic rule-based verification with itemized diagnostics and actionable resolution steps.
    """
    issues: List[Dict[str, Any]] = []
    total_score = 0
    max_score = sum(d["weight"] for d in REQUIRED_DOCUMENTS) + sum(f["weight"] for f in REQUIRED_FIELDS)  # 100

    # 1. Check Required Documents
    uploaded_types = {
        d.get("doc_type") for d in documents if not d.get("is_deleted") and d.get("doc_type")
    }

    doc_breakdown = []
    for req_doc in REQUIRED_DOCUMENTS:
        doc_type = req_doc["type"]
        is_present = doc_type in uploaded_types
        if is_present:
            total_score += req_doc["weight"]
            doc_breakdown.append({
                "type": doc_type,
                "status": "Uploaded",
                "weight": req_doc["weight"],
                "description": req_doc["description"],
                "resolved": True
            })
        else:
            doc_breakdown.append({
                "type": doc_type,
                "status": "Missing",
                "weight": req_doc["weight"],
                "description": req_doc["description"],
                "resolved": False
            })
            issues.append({
                "category": "Document",
                "item": doc_type,
                "severity": "High",
                "status": "Missing Mandatory Document",
                "message": f"Mandatory document '{doc_type}' has not been uploaded.",
                "resolution": f"Upload a valid signed PDF or high-resolution image of {req_doc['description']}"
            })

    # 2. Check Required Application Fields
    field_breakdown = []
    for req_field in REQUIRED_FIELDS:
        f_name = req_field["field"]
        val = app_doc.get(f_name)
        val_str = str(val).strip() if val is not None else ""

        is_valid = bool(val_str)
        # Extra checks for phone formatting
        if f_name == "contact_mobile" and is_valid:
            if not val_str.startswith("+") or len(val_str) < 10:
                is_valid = False
                issues.append({
                    "category": "Field",
                    "item": req_field["label"],
                    "severity": "Medium",
                    "status": "Invalid Phone Format",
                    "message": "Mobile number must include country code in E.164 format (e.g., +919876543210).",
                    "resolution": "Prefix phone number with +91 or appropriate international dial code."
                })

        # Extra checks for email formatting
        if f_name == "contact_email" and is_valid:
            if "@" not in val_str or "." not in val_str:
                is_valid = False
                issues.append({
                    "category": "Field",
                    "item": req_field["label"],
                    "severity": "Medium",
                    "status": "Invalid Email Format",
                    "message": "Contact email does not appear to be a valid email address.",
                    "resolution": "Provide a complete email address (e.g. principal@institution.edu.in)."
                })

        if is_valid:
            total_score += req_field["weight"]
            field_breakdown.append({
                "field": f_name,
                "label": req_field["label"],
                "status": "Complete",
                "value": val_str,
                "resolved": True
            })
        elif f_name not in [i["item"] for i in issues]:
            field_breakdown.append({
                "field": f_name,
                "label": req_field["label"],
                "status": "Missing",
                "value": "",
                "resolved": False
            })
            issues.append({
                "category": "Field",
                "item": req_field["label"],
                "severity": "Medium",
                "status": "Missing Field",
                "message": f"Required application field '{req_field['label']}' is blank.",
                "resolution": req_field["resolution"]
            })

    # Classify Risk Level
    # Score 85-100: Low risk
    # Score 50-84: Medium risk
    # Score 0-49: High risk
    score_percentage = round((total_score / max_score) * 100)
    if score_percentage >= 85:
        risk_level = "Low"
        summary_verdict = "Preliminary criteria largely satisfied. Ready for committee review."
    elif score_percentage >= 50:
        risk_level = "Medium"
        summary_verdict = "Moderate compliance gaps detected. Requires additional documentation or field updates."
    else:
        risk_level = "High"
        summary_verdict = "Significant non-compliance: Essential documents or institutional information are missing."

    return {
        "score": score_percentage,
        "risk_level": risk_level,
        "verdict": summary_verdict,
        "is_preliminary": True,
        "disclaimer": "This automated check is a preliminary advisory checklist to assist applicants and reviewers. It does NOT represent an official AICTE regulatory decision or statutory approval.",
        "documents_present": len(uploaded_types),
        "documents_required": len(REQUIRED_DOCUMENTS),
        "issues_count": len(issues),
        "issues": issues,
        "document_checklist": doc_breakdown,
        "field_checklist": field_breakdown
    }
