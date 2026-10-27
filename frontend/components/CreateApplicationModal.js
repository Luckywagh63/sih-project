"use client";
import { useState } from "react";
import { api } from "../lib/api";
import {
  FileText,
  Building2,
  X,
  Send,
  AlertCircle,
  Shield,
  CheckCircle2
} from "lucide-react";

const APPLICATION_TYPES = [
  "Extension of Approval",
  "New Approval",
  "Course Addition",
  "Intake Change"
];

export default function CreateApplicationModal({ isOpen, onClose, onCreated, currentUser }) {
  const [institution, setInstitution] = useState(currentUser?.institution_name || "");
  const [institutionId, setInstitutionId] = useState(currentUser?.institution_id || "");
  const [type, setType] = useState(APPLICATION_TYPES[0]);
  const [contactName, setContactName] = useState(currentUser?.name || "");
  const [contactEmail, setContactEmail] = useState(currentUser?.email || "");
  const [contactMobile, setContactMobile] = useState("+91");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitNow, setSubmitNow] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    if (!contactMobile.startsWith("+") || contactMobile.length < 10) {
      setError("Mobile number must be in international format (e.g., +919876543210) for automated SMS notifications.");
      setSaving(false);
      return;
    }

    try {
      const payload = {
        institution: institution.trim(),
        institution_id: institutionId.trim(),
        type,
        contact_name: contactName.trim(),
        contact_email: contactEmail.trim(),
        contact_mobile: contactMobile.trim(),
        address: address.trim(),
        notes: notes.trim(),
        submit_now: submitNow
      };

      const created = await api.create(payload);
      onCreated(created);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create application");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-bg"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={{ maxWidth: 680 }}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">
              <Building2 size={14} />
              <span>Statutory Filing Service</span>
            </div>
            <h2>File AICTE Application</h2>
            <p>Initiate statutory approval process with automated workflow & SMS tracking</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="detail-grid">
            <label>
              Institution Legal Name *
              <input
                required
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g. Pune Institute of Computer Technology"
              />
            </label>
            <label>
              AICTE / State Institution ID *
              <input
                required
                value={institutionId}
                onChange={(e) => setInstitutionId(e.target.value)}
                placeholder="e.g. AICTE-1-10294"
              />
            </label>
          </div>

          <label>
            Application Type *
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {APPLICATION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          <div className="detail-grid">
            <label>
              Authorized Contact Person *
              <input
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Principal / Director / Secretary"
              />
            </label>
            <label>
              Official Contact Email *
              <input
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="principal@institution.edu.in"
              />
            </label>
          </div>

          <label>
            Mobile Number (E.164 format with country code) *
            <input
              type="tel"
              required
              value={contactMobile}
              onChange={(e) => setContactMobile(e.target.value)}
              placeholder="+919876543210"
            />
            <small style={{ color: "var(--muted)", display: "block", marginTop: 4 }}>
              Automated notifications will be dispatched to this number upon stage changes.
            </small>
          </label>

          <label>
            Campus Physical Address *
            <textarea
              required
              rows="2"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Campus plot, survey number, city, district, state, pin code"
            />
          </label>

          <label>
            Initial Notes / Particulars (optional)
            <textarea
              rows="2"
              maxLength="2000"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special approvals requested, intake specifications, or program branches"
            />
          </label>

          <div
            style={{
              margin: "16px 0",
              padding: "14px 18px",
              background: "#eff6ff",
              borderRadius: 12,
              border: "1px solid #bfdbfe"
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", margin: 0, fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={submitNow}
                onChange={(e) => setSubmitNow(e.target.checked)}
                style={{ width: "auto", margin: 0 }}
              />
              <span style={{ color: "#1e3a8a" }}>Submit for Scrutiny immediately (status: <b>Submitted</b>)</span>
            </label>
            <small style={{ color: "#475569", display: "block", marginTop: 4, marginLeft: 26 }}>
              If unchecked, the application will be saved as <b>Draft</b> for you to attach required documents before formal submission.
            </small>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? "Filing Application…" : submitNow ? "Submit Application" : "Save as Draft"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
