/* eslint-disable @next/next/no-img-element */
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
  AlertCircle,
  Activity,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowRight,
  Check,
  UserCheck,
  Shield,
  Zap,
  Globe,
  Lock,
  Mail,
  MapPin,
  Award
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

const STAGE_CONFIG = {
  "Draft": { color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1", icon: FileText },
  "Submitted": { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", icon: Send },
  "Under Review": { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", icon: Clock },
  "Correction Required": { color: "#e11d48", bg: "#fff1f2", border: "#fecdd3", icon: AlertTriangle },
  "Resubmitted": { color: "#d97706", bg: "#fffbeb", border: "#fde68a", icon: RefreshCw },
  "Approved": { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", icon: CheckCircle2 },
  "Rejected": { color: "#475569", bg: "#f8fafc", border: "#e2e8f0", icon: XCircle }
};

// Verified AICTE Institutional Campuses Showcase Cards
const CAMPUS_SHOWCASES = [
  {
    id: "SHOW-01",
    name: "National Institute of Technology & Advanced Science",
    code: "AICTE-DL-8924011",
    location: "New Delhi, NCR",
    category: "Technical Campus",
    status: "Approved",
    statusClass: "approved",
    builtUp: "42,500 sq.m",
    facultyCount: "340 Faculty",
    image: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "SHOW-02",
    name: "Vellore Apex Institute of Technology & Research",
    code: "AICTE-KA-7392812",
    location: "Bengaluru, Karnataka",
    category: "Autonomous Engineering",
    status: "Approved",
    statusClass: "approved",
    builtUp: "38,200 sq.m",
    facultyCount: "295 Faculty",
    image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "SHOW-03",
    name: "Bharati Vidyapeeth Technical Institute",
    code: "AICTE-MH-9120485",
    location: "Pune, Maharashtra",
    category: "Polytechnic & Applied Sci",
    status: "Resubmitted",
    statusClass: "resubmitted",
    builtUp: "29,400 sq.m",
    facultyCount: "180 Faculty",
    image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "SHOW-04",
    name: "Indira Gandhi Technological Sciences University",
    code: "AICTE-TS-6548190",
    location: "Hyderabad, Telangana",
    category: "State Technical Hub",
    status: "Under Review",
    statusClass: "review",
    builtUp: "51,000 sq.m",
    facultyCount: "410 Faculty",
    image: "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=700&q=80"
  }
];

// Institutional table row avatars
const INSTITUTION_AVATARS = [
  "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=120&q=80",
  "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=120&q=80",
  "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=120&q=80",
  "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=120&q=80",
  "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?auto=format&fit=crop&w=120&q=80"
];

export default function DashboardView({
  stats,
  recentApps,
  connected,
  loading,
  error,
  currentUser,
  onQuickLogin,
  onSelectApp,
  onNewApp,
  onNavigate,
  onRefresh
}) {
  const [exporting, setExporting] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);

  const total = stats?.total ?? 0;
  const underReview = stats?.under_review ?? 0;
  const correctionRequired = stats?.correction_required ?? 0;
  const approved = stats?.approved ?? 0;
  const rejected = stats?.rejected ?? 0;
  const submitted = stats?.submitted ?? 0;

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

  // Pipeline distribution calculation
  const pipeline = useMemo(() => {
    return STAGES.map((st) => {
      const match = stats?.by_status?.find((item) => item.status === st);
      const count = match ? match.count : 0;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        stage: st,
        count,
        percentage,
        config: STAGE_CONFIG[st] || { color: "#64748b", bg: "#f1f5f9", icon: FileText }
      };
    });
  }, [stats, total]);

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

  // Filtered recent apps if user clicks a stage
  const displayApps = useMemo(() => {
    if (!activeFilter) return recentApps;
    return recentApps.filter((a) => a.status === activeFilter);
  }, [recentApps, activeFilter]);

  return (
    <div style={{ animation: "fadeIn 0.25s ease" }}>
      {/* ================================================================
          1. SPECTACULAR EXECUTIVE HERO COMMAND DECK
          ================================================================ */}
      <section className="executive-hero-container">
        {/* Top Statutory Ticker */}
        <div className="hero-top-ticker">
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div className="gov-emblem-badge" title="Official State Emblem of India">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"
                alt="Emblem of India"
                style={{ width: 18, height: 18, objectFit: "contain", filter: "brightness(0) invert(1)" }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback = e.currentTarget.parentElement?.querySelector(".emblem-fallback");
                  if (fallback) fallback.style.display = "inline";
                }}
              />
              <span className="emblem-fallback" style={{ display: "none", fontSize: 13 }}>🏛️</span>
            </div>
            <span style={{ fontWeight: 800, color: "#ffffff", letterSpacing: 1.1 }}>
              AICTE STATUTORY BUREAU
            </span>
            <span className="gov-tag-saffron">
              GOVT. OF INDIA
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div className="tricolor-indicator-pill" title="National Regulatory Registry">
              <div className="tricolor-dots">
                <span className="tricolor-dot-saffron" />
                <span className="tricolor-dot-white" />
                <span className="tricolor-dot-green" />
              </div>
              <span>AICTE Official Portal</span>
            </div>
            <span className="hero-badge-tag">
              <span className={`pulse-dot ${connected ? "online" : "offline"}`} />
              <span>{connected ? "MONGODB ATLAS CLUSTER: ONLINE" : "OFFLINE CLUSTER"}</span>
            </span>
            <span style={{ color: "#94a3b8", fontSize: 11.5 }}>
              ACADEMIC CYCLE 2026-27
            </span>
          </div>
        </div>

        {/* Hero Title & Mission Subtitle */}
        <div style={{ maxWidth: 840 }}>
          <h1 className="hero-title-main">
            Statutory Approval & Regulatory Surveillance Command Center
          </h1>
          <p className="hero-sub-p">
            Automated compliance adjudication and technical scrutiny platform for regulatory administration. Live verification of institutional credentials, magic-byte document authenticity, and end-to-end audit logging.
          </p>
        </div>

        {/* Hero Real-Time HUD Metrics Pods */}
        <div className="hero-hud-grid">
          <div className="hud-pod">
            <div className="hud-pod-label">
              <span>Total Filings</span>
              <FileText size={14} color="#60a5fa" />
            </div>
            <div className="hud-pod-value">{loading ? "…" : total}</div>
            <div className="hud-pod-sub">Registered institutional records in Atlas</div>
          </div>

          <div className="hud-pod">
            <div className="hud-pod-label">
              <span>Scrutiny Pipeline</span>
              <Clock size={14} color="#a78bfa" />
            </div>
            <div className="hud-pod-value" style={{ color: "#a78bfa" }}>
              {loading ? "…" : underReview + submitted}
            </div>
            <div className="hud-pod-sub">Active committee evaluation queue</div>
          </div>

          <div className="hud-pod">
            <div className="hud-pod-label">
              <span>Deficiencies Flagged</span>
              <AlertTriangle size={14} color="#f59e0b" />
            </div>
            <div className="hud-pod-value" style={{ color: "#f59e0b" }}>
              {loading ? "…" : correctionRequired}
            </div>
            <div className="hud-pod-sub">Requiring applicant resubmission</div>
          </div>

          <div className="hud-pod">
            <div className="hud-pod-label">
              <span>Approvals Cleared</span>
              <CheckCircle2 size={14} color="#34d399" />
            </div>
            <div className="hud-pod-value" style={{ color: "#34d399" }}>
              {loading ? "…" : approved}
            </div>
            <div className="hud-pod-sub">Formal statutory approval issued</div>
          </div>
        </div>

        {/* Hero Quick Action Deck */}
        <div className="hero-action-deck">
          <button className="hero-action-btn-primary" onClick={onNewApp}>
            <Plus size={16} strokeWidth={2.4} />
            <span>File Statutory Application</span>
          </button>
          <button className="hero-action-btn-secondary" onClick={() => onNavigate("AI compliance")}>
            <Sparkles size={15} color="#60a5fa" />
            <span>Compliance AI Radar</span>
          </button>
          <button className="hero-action-btn-secondary" onClick={() => onNavigate("Notifications")}>
            <Mail size={15} color="#a78bfa" />
            <span>Dispatch & Email Audit</span>
          </button>
          <button className="hero-action-btn-secondary" onClick={handleExportJson} disabled={recentApps.length === 0 || exporting}>
            <Download size={15} />
            <span>Export Register (JSON)</span>
          </button>
          <button
            className="hero-action-btn-secondary"
            onClick={onRefresh}
            style={{ marginLeft: "auto", background: "transparent" }}
            title="Refresh database state"
          >
            <RefreshCw size={14} />
            <span>Sync Cluster</span>
          </button>
        </div>
      </section>

      {error && (
        <div className="error">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button className="link" onClick={onRefresh} style={{ marginLeft: "auto" }}>Retry</button>
        </div>
      )}

      {/* ================================================================
          2. INTERACTIVE CONNECTED LIFECYCLE STEPPER
          ================================================================ */}
      <section className="pipeline-stepper-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--ink)" }}>
              Interactive Statutory Lifecycle Stepper
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--muted)" }}>
              Click any stage below to dynamically filter the institutional register
            </p>
          </div>
          {activeFilter && (
            <button
              type="button"
              className="btn"
              style={{ fontSize: 11.5, padding: "4px 10px", color: "var(--primary)" }}
              onClick={() => setActiveFilter(null)}
            >
              Clear filter: <b>{activeFilter}</b> ✕
            </button>
          )}
        </div>

        <div className="stepper-nodes-row">
          {pipeline.map(({ stage, count, percentage, config }) => {
            const IconComponent = config.icon;
            const isSelected = activeFilter === stage;
            return (
              <div
                key={stage}
                className={`stepper-node-item ${isSelected ? "selected" : ""}`}
                onClick={() => setActiveFilter(isSelected ? null : stage)}
              >
                <div
                  className="stepper-node-icon"
                  style={{
                    background: config.bg,
                    color: config.color,
                    border: `1px solid ${config.border}`
                  }}
                >
                  <IconComponent size={16} />
                </div>
                <div className="stepper-node-title">{stage}</div>
                <span
                  className="stepper-node-badge"
                  style={{
                    background: config.bg,
                    color: config.color
                  }}
                >
                  {count} ({percentage}%)
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================================================================
          3. MIDDLE SECTION: REGULATORY ATTENTION & PIPELINE HEALTH
          ================================================================ */}
      <section className="middle">
        {/* Needs Regulatory Attention Panel */}
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Needs Regulatory Attention</h2>
              <p>Filings flagged with defects or undergoing scrutiny review</p>
            </div>
            <span className="status red" style={{ fontWeight: 800 }}>
              {attentionItems.length.toString().padStart(2, "0")} BOTTLENECKS
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
                    <b style={{ fontSize: 13.5, color: "var(--ink)" }}>{app.institution}</b>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                      <span className="app-id" style={{ fontSize: 11 }}>{app.id}</span> · {app.type}
                    </div>
                  </div>
                  <span className={`status ${getStatusColor(app.status)}`}>
                    {app.status}
                  </span>
                </div>

                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
                  Contact: <b style={{ color: "var(--ink)" }}>{app.contact_name}</b> ({app.contact_mobile})
                </div>

                <button
                  className="link"
                  onClick={() => onSelectApp(app.id)}
                  style={{ fontSize: 12, padding: "2px 0", fontWeight: 700 }}
                >
                  <span>Scrutinize & Action Application</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            ))
          ) : (
            <div className="empty" style={{ padding: "36px 16px" }}>
              <CheckCircle2 size={36} color="#059669" style={{ margin: "0 auto 10px" }} />
              <div style={{ fontWeight: 800, color: "var(--ink)", marginBottom: 4 }}>
                All Applications Fully Processed
              </div>
              <div style={{ fontSize: 12.5, color: "var(--muted)" }}>No applications currently require urgent committee intervention.</div>
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <button className="link" onClick={() => onNavigate("Applications")}>
              <span>Review entire institutional register</span>
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>

        {/* AI Compliance Surveillance Card */}
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow" style={{ marginBottom: 4 }}>
                <Sparkles size={12} />
                <span>SURVEILLANCE RADAR</span>
              </div>
              <h2>Statutory Compliance AI</h2>
              <p>Automated verification checklist across mandatory legal deeds</p>
            </div>
            <button className="link" onClick={() => onNavigate("AI compliance")}>
              <span>Launch AI Radar</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          <div style={{ padding: 18, background: "var(--panel-card)", borderRadius: 14, border: "1px solid var(--line)", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>Mandatory Record Checklist</span>
              <span className="status green" style={{ padding: "2px 8px" }}>4 Required</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12, color: "var(--ink-secondary)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Check size={14} color="#059669" />
                <span>1. Society / Trust Institution Registration</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Check size={14} color="#059669" />
                <span>2. Faculty Ratio & AICTE Qualifications</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Check size={14} color="#059669" />
                <span>3. Built-Up Space & Infrastructure Report</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Check size={14} color="#059669" />
                <span>4. Audited Financial Statements & Corpus</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--primary-light)", borderRadius: 10, border: "1px solid var(--line)" }}>
            <span style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600 }}>
              Scrutiny readiness rating:
            </span>
            <span style={{ fontSize: 14, fontWeight: 900, color: "var(--primary)", fontFamily: "Outfit, sans-serif" }}>
              Active AI Scanning
            </span>
          </div>
        </div>
      </section>

      {/* ================================================================
          4. STATUTORY ACCREDITED CAMPUS SHOWCASE
          ================================================================ */}
      <section className="panel campus-showcase-panel">
        <div className="panel-head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>
              <Building2 size={12} color="#f97316" />
              <span style={{ color: "var(--saffron, #f97316)" }}>CAMPUS & INFRASTRUCTURE REGISTRY</span>
            </div>
            <h2>Accredited Institutional Campuses</h2>
            <p>Verified physical infrastructure, lab capacity, and faculty-cadre records</p>
          </div>
          <button className="link" onClick={() => onNavigate("Applications")}>
            <span>View All Campuses</span>
            <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="campus-showcase-grid">
          {CAMPUS_SHOWCASES.map((campus) => (
            <div key={campus.id} className="campus-card">
              <div className="campus-img-wrap">
                <img
                  src={campus.image}
                  alt={campus.name}
                  className="campus-img"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=600&q=80";
                  }}
                />
                <div className="campus-img-overlay" />
                <span className={`campus-overlay-badge ${campus.statusClass}`}>
                  {campus.status}
                </span>
                <span className="campus-category-pill">
                  {campus.category}
                </span>
              </div>

              <div className="campus-info">
                <div className="campus-code">
                  <Award size={12} color="var(--saffron, #f97316)" />
                  <span>{campus.code}</span>
                </div>
                <h3 className="campus-name" title={campus.name}>
                  {campus.name}
                </h3>
                <div className="campus-location">
                  <MapPin size={12} />
                  <span>{campus.location}</span>
                </div>

                <div className="campus-metric-row">
                  <span className="campus-metric-tag">{campus.builtUp}</span>
                  <span className="campus-year">{campus.facultyCount}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================
          5. LIVE RECENT APPLICATIONS TABLE
          ================================================================ */}
      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <h2>
              {activeFilter ? `${activeFilter} Applications (${displayApps.length})` : "Recent Institutional Filings"}
            </h2>
            <p>Live synchronized records streamed directly from MongoDB Atlas</p>
          </div>
          <button className="link" onClick={() => onNavigate("Applications")}>
            <span>Full Register</span>
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
                <th>SCRUTINY STATUS</th>
                <th>AUTHORIZED CONTACT</th>
                <th>DATE FILED</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="loading">
                    <RefreshCw size={24} style={{ color: "#2563eb", animation: "spin 1s linear infinite" }} />
                    <span>Connecting to MongoDB Atlas & streaming records…</span>
                  </td>
                </tr>
              ) : displayApps.length > 0 ? (
                displayApps.map((a, idx) => (
                  <tr key={a.id} onClick={() => onSelectApp(a.id)}>
                    <td>
                      <span className="app-id">{a.id}</span>
                      <span className="sub">Cluster Indexed</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="table-inst-avatar">
                          <img
                            src={INSTITUTION_AVATARS[idx % INSTITUTION_AVATARS.length]}
                            alt={a.institution || "Campus"}
                            className="table-inst-img"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              const fb = e.currentTarget.parentElement?.querySelector(".table-inst-fallback");
                              if (fb) fb.style.display = "grid";
                            }}
                          />
                          <div className="table-inst-fallback" style={{ display: "none" }}>
                            {a.institution ? a.institution.charAt(0).toUpperCase() : "I"}
                          </div>
                        </div>
                        <div>
                          <b style={{ color: "var(--ink)" }}>{a.institution}</b>
                          <span className="sub">AICTE ID: {a.institution_id}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 600,
                          color: "var(--ink-secondary)",
                          background: "var(--bg-subtle)",
                          border: "1px solid var(--line)",
                          padding: "3px 8px",
                          borderRadius: 6,
                          fontSize: 11.5
                        }}
                      >
                        {a.type}
                      </span>
                    </td>
                    <td>
                      <span className={`status ${getStatusColor(a.status)}`}>
                        {a.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--ink)" }}>{a.contact_name}</div>
                      <span className="sub">{a.contact_mobile}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#64748b", fontSize: 12 }}>
                        <Calendar size={13} />
                        <span>{new Date(a.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td>
                      <button
                        className="btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectApp(a.id);
                        }}
                        style={{ padding: "5px 12px", fontSize: 11.5 }}
                      >
                        <span>Inspect</span>
                        <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="empty">
                    {activeFilter
                      ? `No applications currently match stage '${activeFilter}'.`
                      : "No applications found. Click '+ File Statutory Application' to register a new submission."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-foot">
          <span>
            Showing <b>{displayApps.length}</b> of <b>{total}</b> total applications
          </span>
          <span>
            Database Cluster: <b>aicte_workflow</b> (MongoDB Atlas)
          </span>
        </div>
      </section>
    </div>
  );
}
