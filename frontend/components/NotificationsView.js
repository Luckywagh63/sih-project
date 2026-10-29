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
  X,
  Clock,
  CheckCheck,
  Shield,
  FileText
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

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="panel table-panel" style={{ animation: "fadeIn 0.25s ease" }}>
      {/* Header */}
      <div className="panel-head">
        <div>
          <div className="eyebrow">
            <Mail size={13} />
            <span>STATUTORY NOTIFICATION & DISPATCH GATEWAY</span>
          </div>
          <h2>AICTE Automated Status Notification Audit</h2>
          <p>Real-time regulatory status emails and audit tracking dispatched to institutional applicant contacts</p>
        </div>
        <button className="btn" onClick={load} title="Refresh audit feed">
          <RefreshCw size={14} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Live Email Tester Card */}
      <div
        style={{
          margin: "0 24px 20px",
          padding: "20px 24px",
          background: "linear-gradient(135deg, #f8faff 0%, #eff6ff 100%)",
          borderRadius: 14,
          border: "1px solid #bfdbfe",
          boxShadow: "0 2px 8px rgba(37, 99, 235, 0.04)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={16} color="#2563eb" />
            <b style={{ fontSize: 13.5, color: "#1e3a8a" }}>Live Notification Dispatch & Template Diagnostics</b>
          </div>
          <span className={`status ${emailConfigured ? "green" : "blue"}`} style={{ fontSize: 11 }}>
            {emailConfigured ? "Live SMTP Active" : "Audit / Dev Simulator Active"}
          </span>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 14px" }}>
          Verify that AICTE-branded HTML status emails are reliably generated and dispatched to institutional contacts.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            type="email"
            value={testEmailAddress}
            onChange={(e) => setTestEmailAddress(e.target.value)}
            placeholder="principal@college.edu.in"
            style={{ fontSize: 13, padding: "9px 14px", minWidth: 290, flex: "1 1 290px" }}
          />
          <button
            type="button"
            className="btn primary"
            onClick={handleTestEmail}
            disabled={dispatching || !testEmailAddress.trim()}
          >
            <Send size={14} />
            <span>{dispatching ? "Dispatching…" : "Dispatch Test Notification"}</span>
          </button>
        </div>

        {testStatus && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 8,
              fontSize: 12.5,
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

        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #dbeafe", fontSize: 12, color: "#475569" }}>
          <b>Enterprise Gateway Highlights:</b>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#059669", fontWeight: 700 }}>✓</span>
              <span>Zero Telecom Surcharges & Carrier Blocks</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#059669", fontWeight: 700 }}>✓</span>
              <span>Complete Scrutiny Remarks & Resolution</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#059669", fontWeight: 700 }}>✓</span>
              <span>Govt-Approved Cryptographic Logging</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#059669", fontWeight: 700 }}>✓</span>
              <span>Standard SMTP / Twilio Integration</span>
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
          <option value="delivered_dev_mode">Delivered (Audit / Dev Simulator)</option>
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
              <th>RECIPIENT EMAIL / CONTACT</th>
              <th>TRIGGER EVENT</th>
              <th>GATEWAY STATUS</th>
              <th style={{ minWidth: 260 }}>SUBJECT & BODY PREVIEW</th>
              <th>ACTIONS</th>
              <th>TIMESTAMP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="loading">
                  <RefreshCw size={24} style={{ color: "#2563eb", animation: "spin 1s linear infinite" }} />
                  <span>Loading dispatch logs from MongoDB Atlas…</span>
                </td>
              </tr>
            ) : items.length > 0 ? (
              items.map((n) => (
                <tr key={n.id}>
                  <td>
                    <span className="app-id" style={{ fontSize: 11.5 }}>{n.id.slice(0, 10)}…</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: "#2563eb" }}>{n.application_id}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: "#1e293b" }}>{n.recipient}</div>
                    <span className="sub">{n.contact_name || "Institutional Contact"}</span>
                  </td>
                  <td>
                    <span
                      style={{
                        background: "#f1f5f9",
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: "#334155"
                      }}
                    >
                      {n.event}
                    </span>
                  </td>
                  <td>
                    <span className={`status ${getStatusColor(n.status)}`}>
                      {n.status === "delivered_dev_mode" ? "DEV AUDIT" : n.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ maxWidth: 300, whiteSpace: "normal" }}>
                    <div style={{ fontWeight: 600, fontSize: 12.5, color: "var(--ink)", marginBottom: 2 }}>
                      {n.subject || "AICTE Regulatory Notification"}
                    </div>
                    <div style={{ fontSize: 11.5, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {n.message}
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn"
                      style={{ padding: "5px 10px", fontSize: 11.5 }}
                      onClick={() => setPreviewEmail(n)}
                    >
                      <Eye size={13} />
                      <span>Inspect</span>
                    </button>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#64748b", fontSize: 12 }}>
                      <Clock size={13} />
                      <span>{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="empty">
                  No email notification events found in database matching criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Pagination */}
      <div className="table-foot">
        <span>Showing <b>{items.length}</b> of <b>{total}</b> total notification events</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            className="btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{ padding: "6px 12px" }}
          >
            <ChevronLeft size={14} />
            <span>Previous</span>
          </button>
          <span style={{ fontSize: 12, fontWeight: 700, padding: "0 8px", color: "#334155" }}>
            Page {page} of {pages}
          </span>
          <button
            className="btn"
            disabled={page >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            style={{ padding: "6px 12px" }}
          >
            <span>Next</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Email Preview Modal */}
      {previewEmail && (
        <div
          className="modal-bg"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPreviewEmail(null);
          }}
        >
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-head">
              <div>
                <div className="eyebrow">
                  <Mail size={13} />
                  <span>DISPATCHED NOTIFICATION PAYLOAD</span>
                </div>
                <h2>Email Inspector</h2>
                <p>Delivered to <b>{previewEmail.recipient}</b></p>
              </div>
              <button className="modal-close-btn" onClick={() => setPreviewEmail(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ background: "#f8fafc", padding: 16, borderRadius: 12, border: "1px solid var(--line)", marginBottom: 16, fontSize: 12 }}>
              <div style={{ marginBottom: 6 }}><b>Subject:</b> {previewEmail.subject}</div>
              <div style={{ marginBottom: 6 }}><b>Event Trigger:</b> {previewEmail.event}</div>
              <div style={{ marginBottom: 6 }}><b>Application:</b> {previewEmail.application_id}</div>
              <div><b>Timestamp:</b> {new Date(previewEmail.created_at).toLocaleString()}</div>
            </div>

            <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 18, background: "#ffffff", fontSize: 13, lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700, color: "#1e3a8a", marginBottom: 10 }}>Message Body:</div>
              <div style={{ whiteSpace: "pre-wrap", color: "#334155" }}>
                {previewEmail.message}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn" onClick={() => setPreviewEmail(null)}>
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
