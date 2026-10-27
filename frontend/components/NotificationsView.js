"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import {
  Mail,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  X
} from "lucide-react";

export default function NotificationsView() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [statusFilter, setStatusFilter] = useState("All");
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewEmail, setPreviewEmail] = useState(null);
  const [testEmailAddress, setTestEmailAddress] = useState("waghlucky63@gmail.com");
  const [testStatus, setTestStatus] = useState(null);
  const [dispatching, setDispatching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.notifications({
        status: statusFilter,
        page,
        limit
      });
      setItems(res.items || []);
      setTotal(res.total || 0);
      setEmailConfigured(res.email_configured);
    } catch (err) {
      setError(err.message || "Failed to load notification history.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const getStatusColor = (st) => {
    switch (st) {
      case "delivered":
      case "delivered_dev_mode":
      case "submitted": return "green";
      case "not_configured": return "amber";
      case "failed": return "red";
      default: return "";
    }
  };

  async function handleTestEmail() {
    if (!testEmailAddress.trim()) return;
    setDispatching(true);
    setTestStatus({ type: "info", message: "Dispatching AICTE status email…" });
    try {
      const res = await api.testEmail(testEmailAddress.trim());
      if (res.sent) {
        setTestStatus({
          type: "success",
          message: `Email notification processed successfully! (ID: ${res.notification_id || res.provider_message_id})`
        });
      } else {
        setTestStatus({
          type: "error",
          message: `Dispatch failed: ${res.error || res.message}`
        });
      }
      load();
    } catch (e) {
      setTestStatus({
        type: "error",
        message: `Dispatch error: ${e.message}`
      });
    } finally {
      setDispatching(false);
    }
  }

  return (
    <div className="panel table-panel">
      {/* Header */}
      <div className="panel-head">
        <div>
          <div className="eyebrow">
            <Mail size={14} />
            <span>Statutory Notification Gateway</span>
          </div>
          <h2>AICTE Email Status Notification Audit</h2>
          <p>Real-time regulatory status emails dispatched to institutional applicant contacts</p>
        </div>
        <button className="btn" onClick={load}>
          <RefreshCw size={14} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Live Email Tester Card */}
      <div
        style={{
          margin: "0 24px 20px",
          padding: "20px 24px",
          background: "linear-gradient(135deg, #f8faff 0%, #f0f7ff 100%)",
          borderRadius: 14,
          border: "1px solid #dbeafe"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={16} color="#2563eb" />
            <b style={{ fontSize: 13, color: "#1e293b" }}>Test Live Email Dispatch & Template Diagnostics</b>
          </div>
          <span className={`status ${emailConfigured ? "green" : "blue"}`} style={{ fontSize: 11 }}>
            {emailConfigured ? "Live SMTP Active" : "Audit / Dev Mode Active"}
          </span>
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 14px" }}>
          Verify that AICTE-branded HTML status emails can be dispatched to any applicant email address.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            type="email"
            value={testEmailAddress}
            onChange={(e) => setTestEmailAddress(e.target.value)}
            placeholder="principal@college.edu.in"
            style={{ fontSize: 12, padding: "9px 14px", minWidth: 280 }}
          />
          <button
            type="button"
            className="btn primary"
            onClick={handleTestEmail}
            disabled={dispatching || !testEmailAddress.trim()}
          >
            <Send size={14} />
            <span>{dispatching ? "Dispatching…" : "Dispatch Test Email"}</span>
          </button>
        </div>

        {testStatus && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background:
                testStatus.type === "success" ? "#ecfdf5" : testStatus.type === "error" ? "#fff1f2" : "#eff6ff",
              color:
                testStatus.type === "success" ? "#065f46" : testStatus.type === "error" ? "#9f1239" : "#1e40af",
              border: `1px solid ${
                testStatus.type === "success" ? "#a7f3d0" : testStatus.type === "error" ? "#fecdd3" : "#bfdbfe"
              }`
            }}
          >
            {testStatus.type === "success" ? (
              <CheckCircle2 size={16} />
            ) : testStatus.type === "error" ? (
              <AlertCircle size={16} />
            ) : (
              <Info size={16} />
            )}
            <span>{testStatus.message}</span>
          </div>
        )}

        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #e2e8f0", fontSize: 12, color: "#475569" }}>
          <b>Key Advantages of Email Status Notifications:</b>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 8, marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#059669", fontWeight: 700 }}>✓</span>
              <span>Zero Telecom Surcharges & Carrier Blocks</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#059669", fontWeight: 700 }}>✓</span>
              <span>Complete Scrutiny Notes & Details</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#059669", fontWeight: 700 }}>✓</span>
              <span>Official AICTE Govt-Branded HTML</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#059669", fontWeight: 700 }}>✓</span>
              <span>Standard SMTP / Gmail App Passwords</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="error" style={{ margin: "14px 24px" }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="toolbar">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ minWidth: 200 }}
        >
          <option value="All">All statuses</option>
          <option value="delivered">Delivered (Live SMTP)</option>
          <option value="delivered_dev_mode">Delivered (Audit / Dev Mode)</option>
          <option value="failed">Failed</option>
        </select>
        <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: "auto" }}>
          <b>{items.length}</b> notification events recorded
        </span>
      </div>

      {/* Notifications Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>NOTIFICATION ID</th>
              <th>APPLICATION ID</th>
              <th>RECIPIENT</th>
              <th>TRIGGER EVENT</th>
              <th>STATUS</th>
              <th style={{ minWidth: 260 }}>SUBJECT & MESSAGE CONTENT</th>
              <th>ACTIONS</th>
              <th>TIMESTAMP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="loading">Loading email dispatch logs from MongoDB Atlas…</td>
              </tr>
            ) : items.length > 0 ? (
              items.map((n) => (
                <tr key={n.id}>
                  <td><span className="app-id">{n.id}</span></td>
                  <td><b>{n.application_id}</b></td>
                  <td>
                    <span style={{ fontSize: 12, fontFamily: "monospace", color: "#1d4ed8", fontWeight: 600 }}>
                      {n.recipient_email || n.recipient_phone || "—"}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: "#334155" }}>{n.trigger_event}</span>
                  </td>
                  <td>
                    <span className={`status ${getStatusColor(n.status)}`}>
                      {n.status === "delivered_dev_mode" ? "logged (dev)" : n.status}
                    </span>
                  </td>
                  <td style={{ maxWidth: 320, fontSize: 12, lineHeight: 1.4 }}>
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
                    {n.message_html ? (
                      <button
                        className="btn"
                        style={{ padding: "4px 10px", fontSize: 11 }}
                        onClick={() => setPreviewEmail(n)}
                      >
                        <Eye size={13} />
                        <span>Preview HTML</span>
                      </button>
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: 11 }}>Text only</span>
                    )}
                  </td>
                  <td>{new Date(n.created_at).toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="empty">
                  No email notifications logged yet. Submitting or changing application statuses will trigger email dispatches.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="table-foot">
        <span>Total notifications recorded: <b>{total}</b></span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            className="btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{ padding: "6px 10px" }}
          >
            <ChevronLeft size={14} />
            <span>Prev</span>
          </button>
          <span style={{ fontSize: 12, fontWeight: 600, padding: "0 8px" }}>Page {page}</span>
          <button
            className="btn"
            disabled={items.length < limit}
            onClick={() => setPage((p) => p + 1)}
            style={{ padding: "6px 10px" }}
          >
            <span>Next</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* HTML Email Preview Modal */}
      {previewEmail && (
        <div className="modal-bg" onClick={() => setPreviewEmail(null)}>
          <div
            className="modal"
            style={{ maxWidth: 720, width: "95%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <span className="eyebrow">OFFICIAL AICTE EMAIL PREVIEW</span>
                <h2>{previewEmail.subject || "Email Notification Preview"}</h2>
                <p>
                  To: <b>{previewEmail.recipient_email}</b> · Trigger: <b>{previewEmail.trigger_event}</b>
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setPreviewEmail(null)}>
                <X size={16} />
              </button>
            </div>

            <div
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: 12,
                overflow: "hidden",
                background: "#ffffff",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
              }}
              dangerouslySetInnerHTML={{ __html: previewEmail.message_html }}
            />

            <div className="modal-actions">
              <button className="btn primary" onClick={() => setPreviewEmail(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
