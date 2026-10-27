"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import {
  FileText,
  Files,
  ShieldCheck,
  History,
  Mail,
  Download,
  Trash2,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  UserCheck,
  Send,
  Building2,
  Calendar,
  AlertCircle,
  ArrowRight
} from "lucide-react";

const REQUIRED_DOC_TYPES = [
  "Institution Registration",
  "Faculty Details",
  "Infrastructure Report",
  "Financial Statement"
];

export default function ApplicationDetailModal({
  appId,
  initialTab = "overview",
  initialDocType = null,
  isOpen,
  onClose,
  currentUser,
  onUpdated,
  notify
}) {
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab || "overview");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusComments, setStatusComments] = useState("");
  const [reviewerComment, setReviewerComment] = useState("");
  const [savingComment, setSavingComment] = useState(false);

  // Document upload state
  const [uploadDocType, setUploadDocType] = useState(initialDocType || REQUIRED_DOC_TYPES[0]);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Reviewer assignment state
  const [reviewers, setReviewers] = useState([]);
  const [selectedReviewerId, setSelectedReviewerId] = useState("");
  const [assigning, setAssigning] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      if (initialDocType) setUploadDocType(initialDocType);
    }
  }, [isOpen, initialTab, initialDocType]);

  const loadDetails = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getApplication(appId);
      setApp(data);
      if (data.assigned_reviewer_id) {
        setSelectedReviewerId(data.assigned_reviewer_id);
      }
    } catch (err) {
      setError(err.message || "Failed to load application details.");
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    if (isOpen && appId) {
      loadDetails();
      if (currentUser?.role === "Administrator") {
        api.reviewers().then((res) => setReviewers(res.items || [])).catch(() => {});
      }
    }
  }, [isOpen, appId, currentUser, loadDetails]);

  if (!isOpen) return null;

  const role = currentUser?.role || "Guest";
  const currentStatus = app?.status || "Draft";

  // Determine allowed transitions based on current status and user role
  const getAvailableTransitions = () => {
    if (!app) return [];
    const transitions = [];

    if (currentStatus === "Draft" && (role === "Institution User" || role === "Administrator")) {
      transitions.push("Submitted");
    }
    if (currentStatus === "Submitted" && (role === "Reviewer" || role === "Administrator")) {
      transitions.push("Under Review");
    }
    if (currentStatus === "Under Review" && (role === "Reviewer" || role === "Administrator")) {
      transitions.push("Correction Required", "Approved", "Rejected");
    }
    if (currentStatus === "Correction Required" && (role === "Institution User" || role === "Administrator")) {
      transitions.push("Resubmitted");
    }
    if (currentStatus === "Resubmitted" && (role === "Reviewer" || role === "Administrator")) {
      transitions.push("Under Review");
    }
    return transitions;
  };

  async function handleStatusTransition(targetStatus) {
    if (!targetStatus) return;
    if (!confirm(`Are you sure you want to transition this application to '${targetStatus}'?`)) return;

    setUpdatingStatus(true);
    setError("");
    try {
      await api.updateStatus(appId, targetStatus, statusComments);
      notify(`Status transitioned to '${targetStatus}'. Notification dispatched.`);
      setStatusComments("");
      await loadDetails();
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.message || "Status transition failed.");
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleAddComment(e) {
    e.preventDefault();
    if (!reviewerComment.trim()) return;
    setSavingComment(true);
    try {
      await api.addComment(appId, reviewerComment.trim());
      notify("Reviewer note recorded into audit trail.");
      setReviewerComment("");
      await loadDetails();
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.message || "Failed to save comment.");
    } finally {
      setSavingComment(false);
    }
  }

  async function handleAssignReviewer() {
    if (!selectedReviewerId) return;
    const rev = reviewers.find((r) => r.id === selectedReviewerId);
    if (!rev) return;

    setAssigning(true);
    try {
      await api.assignReviewer(appId, rev.id, rev.name);
      notify(`Assigned reviewer ${rev.name} to application.`);
      await loadDetails();
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.message || "Failed to assign reviewer.");
    } finally {
      setAssigning(false);
    }
  }

  async function handleFileUpload(e) {
    e.preventDefault();
    if (!uploadFile) {
      setError("Please select a file to upload.");
      return;
    }
    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("doc_type", uploadDocType);

      await api.uploadDocument(appId, formData);
      notify(`Document '${uploadDocType}' uploaded successfully.`);
      setUploadFile(null);
      const fileInput = document.getElementById("doc-file-input");
      if (fileInput) fileInput.value = "";
      await loadDetails();
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteDoc(docId, docName) {
    if (!confirm(`Are you sure you want to delete '${docName}'?`)) return;
    try {
      await api.deleteDocument(docId);
      notify(`Document deleted.`);
      await loadDetails();
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.message || "Failed to delete document.");
    }
  }

  const availableTransitions = getAvailableTransitions();

  const getStatusColor = (st) => {
    switch (st) {
      case "Approved": return "green";
      case "Under Review": return "blue";
      case "Submitted":
      case "Resubmitted": return "amber";
      case "Correction Required":
      case "Rejected": return "red";
      default: return "";
    }
  };

  const tabs = [
    { id: "overview", label: "Overview & Scrutiny", icon: FileText },
    { id: "documents", label: `Documents (${app?.documents?.length || 0})`, icon: Files },
    { id: "compliance", label: `Compliance (${app?.compliance?.score ?? 0}%)`, icon: ShieldCheck },
    { id: "history", label: `Audit Trail (${app?.history?.length || 0})`, icon: History },
    { id: "notifications", label: `Email Logs (${app?.notifications?.length || 0})`, icon: Mail }
  ];

  return (
    <div
      className="modal-bg"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={{ maxWidth: 900 }}>
        {/* Header */}
        <div className="modal-head">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="app-id" style={{ fontSize: 18 }}>{app?.id || appId}</span>
              {app && (
                <span className={`status ${getStatusColor(app.status)}`} style={{ fontSize: 12 }}>
                  {app.status}
                </span>
              )}
            </div>
            <p style={{ marginTop: 4, fontSize: 13, color: "#334155", fontWeight: 600 }}>
              {app?.institution || "Loading details…"}
            </p>
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

        {/* Tab Navigation */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid var(--line)", paddingBottom: 10, overflowX: "auto" }}>
          {tabs.map((t) => {
            const IconComp = t.icon;
            const isTabActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={`btn ${isTabActive ? "primary" : ""}`}
                style={{ padding: "8px 14px", whiteSpace: "nowrap" }}
                onClick={() => setActiveTab(t.id)}
              >
                <IconComp size={14} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="loading">Connecting to MongoDB Atlas & loading application…</div>
        ) : !app ? (
          <div className="empty">Application record could not be loaded.</div>
        ) : (
          <div>
            {/* TAB: OVERVIEW */}
            {activeTab === "overview" && (
              <div>
                <div className="detail-grid">
                  <div style={{ padding: 16, background: "#f8fafc", borderRadius: 12, border: "1px solid var(--line)" }}>
                    <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                      Institution Details
                    </span>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginTop: 6 }}>{app.institution}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>AICTE ID: <b>{app.institution_id}</b></div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Type: <b>{app.type}</b></div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Address: {app.address}</div>
                  </div>

                  <div style={{ padding: 16, background: "#f8fafc", borderRadius: 12, border: "1px solid var(--line)" }}>
                    <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                      Authorized Contact
                    </span>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginTop: 6 }}>{app.contact_name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                      Email: <b style={{ color: "#2563eb" }}>{app.contact_email}</b>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                      Mobile: <b>{app.contact_mobile}</b>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                      Created: {new Date(app.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Reviewer Assignment Panel for Administrator */}
                <div
                  style={{
                    marginTop: 18,
                    padding: 16,
                    background: "linear-gradient(135deg, #f8faff 0%, #eff6ff 100%)",
                    borderRadius: 12,
                    border: "1px solid #bfdbfe"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <UserCheck size={16} color="#2563eb" />
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#1e3a8a" }}>
                        Assigned Reviewer: <b>{app.assigned_reviewer_name || "Unassigned"}</b>
                      </span>
                    </div>

                    {role === "Administrator" && reviewers.length > 0 && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <select
                          value={selectedReviewerId}
                          onChange={(e) => setSelectedReviewerId(e.target.value)}
                          style={{ fontSize: 12, padding: "6px 10px" }}
                        >
                          <option value="">-- Select Reviewer --</option>
                          {reviewers.map((r) => (
                            <option key={r.id} value={r.id}>{r.name} ({r.email})</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn primary"
                          style={{ fontSize: 12, padding: "6px 12px" }}
                          disabled={!selectedReviewerId || assigning}
                          onClick={handleAssignReviewer}
                        >
                          {assigning ? "Assigning…" : "Assign"}
                        </button>
                      </div>
                    )}
                  </div>
                  {app.review_notes && (
                    <div style={{ fontSize: 12, color: "#334155", background: "white", padding: 12, borderRadius: 8, border: "1px solid #cbd5e1" }}>
                      <b>Reviewer Notes:</b> {app.review_notes}
                    </div>
                  )}
                </div>

                {/* Workflow Status Transition Controls */}
                <div style={{ marginTop: 20, padding: 18, background: "#fff", border: "1px solid var(--line)", borderRadius: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Send size={16} color="#2563eb" />
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
                      Workflow Action Center ({role})
                    </h3>
                  </div>

                  {availableTransitions.length > 0 ? (
                    <div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
                        Permitted transitions from current status <b>{currentStatus}</b>:
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                        {availableTransitions.map((target) => (
                          <button
                            key={target}
                            type="button"
                            className={`btn ${target === "Approved" ? "primary" : target === "Rejected" ? "danger" : ""}`}
                            disabled={updatingStatus}
                            onClick={() => handleStatusTransition(target)}
                          >
                            <span>Move to → {target}</span>
                          </button>
                        ))}
                      </div>

                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155" }}>
                        Transition Comments / Action Justification:
                        <textarea
                          rows="2"
                          value={statusComments}
                          onChange={(e) => setStatusComments(e.target.value)}
                          placeholder="Provide regulatory justification or specific instructions (sent in audit log and reviewer notes)"
                          style={{ width: "100%", marginTop: 6, fontSize: 12 }}
                        />
                      </label>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      {["Approved", "Rejected"].includes(currentStatus)
                        ? `Application is in final '${currentStatus}' decision state. No further status transitions allowed.`
                        : `No transitions are currently permitted for role '${role}' from '${currentStatus}'.`}
                    </div>
                  )}
                </div>

                {/* Reviewer Comment Box */}
                {(role === "Reviewer" || role === "Administrator") && (
                  <form onSubmit={handleAddComment} style={{ marginTop: 20 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155" }}>
                      Add Scrutiny Reviewer Comment
                      <textarea
                        rows="2"
                        required
                        value={reviewerComment}
                        onChange={(e) => setReviewerComment(e.target.value)}
                        placeholder="Add formal reviewer comment or feedback to the immutable audit log..."
                        style={{ width: "100%", marginTop: 6, fontSize: 12 }}
                      />
                    </label>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                      <button type="submit" className="btn" disabled={savingComment}>
                        {savingComment ? "Saving…" : "Record Reviewer Comment"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* TAB: DOCUMENTS */}
            {activeTab === "documents" && (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700 }}>Mandatory AICTE Documents</h3>
                  <p style={{ fontSize: 12, color: "var(--muted)" }}>
                    All 4 statutory documents must be uploaded for high compliance scoring and committee review.
                  </p>
                </div>

                {/* Upload Form */}
                <form
                  onSubmit={handleFileUpload}
                  style={{
                    padding: 18,
                    background: "#f8faff",
                    borderRadius: 14,
                    border: "2px dashed #bfdbfe",
                    marginBottom: 20
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13, marginBottom: 12, color: "#2563eb" }}>
                    <UploadCloud size={18} />
                    <span>Upload or Replace Mandatory Document</span>
                  </div>
                  <div className="detail-grid">
                    <label>
                      Document Category
                      <select
                        value={uploadDocType}
                        onChange={(e) => setUploadDocType(e.target.value)}
                        style={{ fontSize: 12 }}
                      >
                        {REQUIRED_DOC_TYPES.map((dt) => (
                          <option key={dt} value={dt}>{dt}</option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Select File (PDF, PNG, JPG, JPEG — max 10MB)
                      <input
                        id="doc-file-input"
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        required
                        onChange={(e) => setUploadFile(e.target.files[0])}
                        style={{ fontSize: 12, padding: "8px 12px" }}
                      />
                    </label>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                    <button type="submit" className="btn primary" disabled={uploading || !uploadFile}>
                      {uploading ? "Verifying & Uploading…" : `Upload ${uploadDocType}`}
                    </button>
                  </div>
                </form>

                {/* Documents Table */}
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>DOCUMENT CATEGORY</th>
                        <th>ORIGINAL FILENAME</th>
                        <th>VERSION</th>
                        <th>FILE SIZE</th>
                        <th>UPLOADED ON</th>
                        <th>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {app.documents && app.documents.length > 0 ? (
                        app.documents.map((doc) => (
                          <tr key={doc.id}>
                            <td><b>{doc.doc_type}</b></td>
                            <td>{doc.original_filename}</td>
                            <td><span className="tag success">v{doc.version}</span></td>
                            <td>{roundBytes(doc.file_size)}</td>
                            <td>{new Date(doc.uploaded_at).toLocaleString()}</td>
                            <td>
                              <div style={{ display: "flex", gap: 8 }}>
                                <a
                                  href={api.getDocumentDownloadUrl(doc.id)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn"
                                  style={{ textDecoration: "none", fontSize: 11, padding: "6px 10px" }}
                                >
                                  <Download size={13} />
                                  <span>Download</span>
                                </a>
                                {(role === "Administrator" || role === "Institution User") && (
                                  <button
                                    type="button"
                                    className="btn danger"
                                    style={{ fontSize: 11, padding: "6px 10px" }}
                                    onClick={() => handleDeleteDoc(doc.id, doc.original_filename)}
                                  >
                                    <Trash2 size={13} />
                                    <span>Delete</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="empty">
                            No documents uploaded yet. Use the upload box above to attach mandatory records.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: COMPLIANCE */}
            {activeTab === "compliance" && app.compliance && (
              <div>
                <div
                  style={{
                    padding: 20,
                    background: "linear-gradient(135deg, #f0f7ff 0%, #e0edff 100%)",
                    borderRadius: 14,
                    border: "1px solid #bfdbfe",
                    marginBottom: 20
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <div className="eyebrow">PRELIMINARY AUTOMATED CHECKLIST</div>
                      <h3 style={{ margin: "4px 0", fontSize: 24, fontWeight: 900, fontFamily: "Outfit, sans-serif", color: "#1e3a8a" }}>
                        Compliance Score: {app.compliance.score}%
                      </h3>
                      <p style={{ fontSize: 12, color: "#334155", margin: 0 }}>
                        {app.compliance.verdict}
                      </p>
                    </div>
                    <span
                      className={`status ${app.compliance.risk_level === "Low" ? "green" : app.compliance.risk_level === "Medium" ? "amber" : "red"}`}
                      style={{ fontSize: 13, padding: "8px 16px" }}
                    >
                      {app.compliance.risk_level} Risk
                    </span>
                  </div>

                  <div style={{ marginTop: 14, fontSize: 11, color: "#475569", borderTop: "1px solid #bfdbfe", paddingTop: 8 }}>
                    <b>Regulatory Notice:</b> {app.compliance.disclaimer}
                  </div>
                </div>

                <h4 style={{ fontSize: 13, fontWeight: 700, margin: "16px 0 10px" }}>
                  Actionable Issues ({app.compliance.issues_count})
                </h4>

                {app.compliance.issues.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {app.compliance.issues.map((issue, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: 14,
                          background: "#fff",
                          border: "1px solid var(--line)",
                          borderRadius: 10,
                          borderLeft: `4px solid ${issue.severity === "High" ? "#e11d48" : "#d97706"}`
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <b style={{ fontSize: 13, color: "#0f172a" }}>{issue.item} ({issue.category})</b>
                          <span className={`status ${issue.severity === "High" ? "red" : "amber"}`}>
                            {issue.status}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
                          {issue.message}
                        </div>
                        <div style={{ fontSize: 12, color: "#2563eb", marginTop: 4, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                          <ArrowRight size={14} />
                          <span><b>Resolution:</b> {issue.resolution}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty" style={{ background: "#ecfdf5", color: "#065f46", borderRadius: 10, border: "1px solid #a7f3d0" }}>
                    ✓ All mandatory documents and application fields satisfy preliminary AICTE scrutiny checklist.
                  </div>
                )}
              </div>
            )}

            {/* TAB: HISTORY / AUDIT TRAIL */}
            {activeTab === "history" && (
              <div>
                <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700 }}>Immutable Audit Trail</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {app.history && app.history.length > 0 ? (
                    app.history.map((h) => (
                      <div
                        key={h.id}
                        style={{
                          padding: 14,
                          background: "#fff",
                          border: "1px solid var(--line)",
                          borderRadius: 10
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                          <b style={{ color: "#0f172a" }}>{h.action}</b>
                          <span style={{ color: "var(--muted)" }}>{new Date(h.timestamp).toLocaleString()}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                          By: <b>{h.performed_by}</b> ({h.performer_role})
                        </div>
                        {h.comments && (
                          <div style={{ fontSize: 12, color: "#334155", marginTop: 8, background: "#f8fafc", padding: 10, borderRadius: 8, border: "1px solid var(--line)" }}>
                            {h.comments}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="empty">No audit history records found.</div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: NOTIFICATIONS / EMAIL LOGS */}
            {activeTab === "notifications" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700 }}>AICTE Status Email Dispatch Logs</h3>
                    <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
                      Official status update emails dispatched to <b>{app.contact_email}</b> with complete College Name, ID, Person Name, and scrutiny notes.
                    </p>
                  </div>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>NOTIFICATION ID</th>
                        <th>RECIPIENT EMAIL</th>
                        <th>TRIGGER EVENT</th>
                        <th style={{ minWidth: 260 }}>SUBJECT & CONTENT SUMMARY</th>
                        <th>STATUS</th>
                        <th>SENT AT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {app.notifications && app.notifications.length > 0 ? (
                        app.notifications.map((n) => (
                          <tr key={n.id}>
                            <td><span className="app-id">{n.id}</span></td>
                            <td>
                              <span style={{ fontSize: 12, fontFamily: "monospace", color: "#1d4ed8", fontWeight: 600 }}>
                                {n.recipient_email || n.recipient_phone || app.contact_email}
                              </span>
                            </td>
                            <td><b>{n.trigger_event}</b></td>
                            <td style={{ maxWidth: 300, fontSize: 12, lineHeight: 1.4 }}>
                              {n.subject && (
                                <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>
                                  {n.subject}
                                </div>
                              )}
                              <div style={{ color: "#475569" }}>
                                {n.message}
                              </div>
                            </td>
                            <td>
                              <span className={`status ${n.status === "submitted" || n.status === "delivered" || n.status === "delivered_dev_mode" ? "green" : n.status === "not_configured" ? "amber" : "red"}`}>
                                {n.status === "delivered_dev_mode" ? "logged (dev)" : n.status}
                              </span>
                            </td>
                            <td>{new Date(n.created_at).toLocaleString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="empty">
                            No email dispatches recorded for this application yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function roundBytes(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
