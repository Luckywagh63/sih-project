"use client";
import { useState, useMemo } from "react";
import {
  FileText,
  Send,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  RefreshCw,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Calendar,
  AlertCircle
} from "lucide-react";

const STAGES = [
  "Draft",
  "Submitted",
  "Under Review",
  "Correction Required",
  "Resubmitted",
  "Approved",
  "Rejected"
];

const STAGE_COLORS = [
  "#94a3b8",
  "#3b82f6",
  "#8b5cf6",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#64748b"
];

export default function DashboardView({
  stats,
  recentApps,
  connected,
  loading,
  error,
  onSelectApp,
  onNewApp,
  onNavigate,
  onRefresh
}) {
  const [exporting, setExporting] = useState(false);

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

  const total = stats?.total ?? 0;
  const underReview = stats?.under_review ?? 0;
  const correctionRequired = stats?.correction_required ?? 0;
  const approved = stats?.approved ?? 0;
  const rejected = stats?.rejected ?? 0;
  const submitted = stats?.submitted ?? 0;

  // Pipeline distribution calculation
  const pipeline = useMemo(() => {
    return STAGES.map((st, i) => {
      const match = stats?.by_status?.find((item) => item.status === st);
      const count = match ? match.count : 0;
      return {
        stage: st,
        count,
        color: STAGE_COLORS[i]
      };
    });
  }, [stats]);

  // Attention items: applications requiring corrections or under review
  const attentionItems = useMemo(() => {
    if (!recentApps) return [];
    return recentApps.filter(
      (a) => a.status === "Correction Required" || a.status === "Under Review"
    );
  }, [recentApps]);

  function handleExportJson() {
    setExporting(true);
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(recentApps, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `aicte-applications-export-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      {/* Top Heading with Action Bar */}
      <div className="heading">
        <div>
          <div className="eyebrow">
            <ShieldCheck size={14} />
            <span>Statutory Surveillance & Workflow Automation</span>
          </div>
          <h1>AICTE Approval Workflow Dashboard</h1>
          <p>
            Real-time scrutiny status, statutory metrics, and document compliance pipeline.{" "}
            <span style={{ color: connected ? "#059669" : "#e11d48", fontWeight: 600 }}>
              ● {connected ? "Connected to MongoDB Atlas" : "Backend Disconnected"}
            </span>
          </p>
        </div>

        <div className="heading-actions">
          <button className="btn" onClick={handleExportJson} disabled={recentApps.length === 0 || exporting}>
            <Download size={14} />
            <span>Export JSON</span>
          </button>
          <button className="btn" onClick={onRefresh}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button className="btn primary" onClick={onNewApp}>
            <Plus size={15} strokeWidth={2.4} />
            <span>File Application</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="error">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button className="link" onClick={onRefresh} style={{ marginLeft: "auto" }}>Retry</button>
        </div>
      )}

      {/* Metrics Row (6 cards with distinct styling and Lucide icons) */}
      <section className="metrics">
        {/* Total Applications */}
        <div className="metric">
          <div className="metric-header">
            <label>Total Applications</label>
            <div className="metric-icon-box" style={{ background: "#eff6ff", color: "#2563eb" }}>
              <FileText size={18} />
            </div>
          </div>
          <strong>{loading ? "…" : total}</strong>
          <small>Total records in MongoDB Atlas</small>
        </div>

        {/* Submitted for Scrutiny */}
        <div className="metric">
          <div className="metric-header">
            <label>Submitted for Scrutiny</label>
            <div className="metric-icon-box" style={{ background: "#eef2ff", color: "#4f46e5" }}>
              <Send size={18} />
            </div>
          </div>
          <strong style={{ color: "#4f46e5" }}>{loading ? "…" : submitted}</strong>
          <small>Queued for scrutiny committee</small>
        </div>

        {/* Under Review */}
        <div className="metric">
          <div className="metric-header">
            <label>Under Review</label>
            <div className="metric-icon-box" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
              <Clock size={18} />
            </div>
          </div>
          <strong style={{ color: "#7c3aed" }}>{loading ? "…" : underReview}</strong>
          <small>Active committee evaluation</small>
        </div>

        {/* Corrections Required */}
        <div className="metric">
          <div className="metric-header">
            <label>Corrections Required</label>
            <div className="metric-icon-box" style={{ background: "#fffbeb", color: "#d97706" }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <strong style={{ color: "#d97706" }}>{loading ? "…" : correctionRequired}</strong>
          <small>Action needed by applicant</small>
        </div>

        {/* Approved */}
        <div className="metric">
          <div className="metric-header">
            <label>Approved</label>
            <div className="metric-icon-box" style={{ background: "#ecfdf5", color: "#059669" }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <strong style={{ color: "#059669" }}>{loading ? "…" : approved}</strong>
          <small>Formal approvals granted</small>
        </div>

        {/* Rejected */}
        <div className="metric">
          <div className="metric-header">
            <label>Rejected</label>
            <div className="metric-icon-box" style={{ background: "#fff1f2", color: "#e11d48" }}>
              <XCircle size={18} />
            </div>
          </div>
          <strong style={{ color: "#e11d48" }}>{loading ? "…" : rejected}</strong>
          <small>Applications rejected</small>
        </div>
      </section>

      {/* Middle Row: Pipeline & Attention Items */}
      <section className="middle">
        {/* Pipeline Panel */}
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Approval Workflow Stages</h2>
              <p>Application lifecycle distribution in MongoDB Atlas</p>
            </div>
            <button className="link" onClick={() => onNavigate("Applications")}>
              <span>View All Applications</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="pipeline-top">
            <strong>{total}</strong>
            <span>Active institutional records</span>
          </div>

          {pipeline.map(({ stage, count, color }) => (
            <div className="stage" key={stage}>
              <div className="stage-line">
                <span>{stage}</span>
                <b>{count} {total ? `(${Math.round((count / total) * 100)}%)` : ""}</b>
              </div>
              <div className="track">
                <div
                  className="fill"
                  style={{
                    width: `${total ? Math.max(count > 0 ? 5 : 0, (count / total) * 100) : 0}%`,
                    background: color
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Needs Attention Panel */}
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Needs Regulatory Attention</h2>
              <p>Applications awaiting urgent action or resubmission</p>
            </div>
            <span className="status red" style={{ fontWeight: 700 }}>
              {attentionItems.length.toString().padStart(2, "0")} ITEMS
            </span>
          </div>

          {attentionItems.length > 0 ? (
            attentionItems.map((app) => (
              <div
                key={app.id}
                className={`attention-card ${
                  app.status === "Correction Required" ? "red-border" : "blue-border"
                }`}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div>
                    <b style={{ fontSize: 13, color: "#0f172a" }}>{app.institution}</b>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                      <span className="app-id" style={{ fontSize: 11 }}>{app.id}</span> · {app.type}
                    </div>
                  </div>
                  <span className={`status ${getStatusColor(app.status)}`}>
                    {app.status}
                  </span>
                </div>

                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>
                  Contact: {app.contact_name} ({app.contact_mobile})
                </div>

                <button
                  className="link"
                  onClick={() => onSelectApp(app.id)}
                  style={{ fontSize: 11, padding: "2px 0" }}
                >
                  <span>Inspect Application Details</span>
                  <ArrowUpRight size={13} />
                </button>
              </div>
            ))
          ) : (
            <div className="empty">
              {total === 0
                ? "No applications in database yet. Create your first application above."
                : "All applications are currently up to date! No pending regulatory bottlenecks."}
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <button className="link" onClick={() => onNavigate("Applications")}>
              <span>Review entire register</span>
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* Recent Applications Table */}
      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <h2>Recent AICTE Applications</h2>
            <p>Latest institutional submissions retrieved live from MongoDB Atlas</p>
          </div>
          <button className="link" onClick={() => onNavigate("Applications")}>
            <span>Full Application Register</span>
            <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>APPLICATION ID</th>
                <th>INSTITUTION NAME</th>
                <th>APPLICATION TYPE</th>
                <th>STATUS</th>
                <th>CONTACT PERSON</th>
                <th>SUBMITTED</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="loading">Connecting to MongoDB Atlas…</td>
                </tr>
              ) : recentApps.length > 0 ? (
                recentApps.map((a) => (
                  <tr key={a.id} onClick={() => onSelectApp(a.id)}>
                    <td>
                      <span className="app-id">{a.id}</span>
                      <span className="sub">MongoDB Record</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: "#eff6ff",
                            color: "#2563eb",
                            display: "grid",
                            placeItems: "center"
                          }}
                        >
                          <Building2 size={15} />
                        </div>
                        <div>
                          <b>{a.institution}</b>
                          <span className="sub">ID: {a.institution_id}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500, color: "#334155" }}>{a.type}</span>
                    </td>
                    <td>
                      <span className={`status ${getStatusColor(a.status)}`}>
                        {a.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{a.contact_name}</div>
                      <span className="sub">{a.contact_mobile}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#64748b", fontSize: 12 }}>
                        <Calendar size={13} />
                        <span>{new Date(a.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty">
                    No applications exist in MongoDB Atlas yet. Click <b>&quot;+ File Application&quot;</b> to create a new application.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-foot">
          <span>Showing <b>{recentApps.length}</b> of <b>{total}</b> total applications</span>
          <span>Database: <b>aicte_workflow</b></span>
        </div>
      </section>
    </div>
  );
}
