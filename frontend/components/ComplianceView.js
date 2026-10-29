"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck,
  Building2,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Info,
  UploadCloud,
  FileText,
  RotateCcw,
  Layers,
  ChevronRight
} from "lucide-react";

export default function ComplianceView({ onSelectApp }) {
  const [apps, setApps] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState("");
  const [selectedApp, setSelectedApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCompliance = useCallback(async (appId) => {
    if (!appId) return;
    try {
      const fullApp = await api.getApplication(appId);
      setSelectedApp(fullApp);
    } catch (err) {
      setError(err.message || "Failed to load compliance report.");
    }
  }, []);

  const loadApps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.applications({ limit: 50 });
      const items = res.items || [];
      setApps(items);
      if (items.length > 0) {
        setSelectedAppId(items[0].id);
        loadCompliance(items[0].id);
      }
    } catch (err) {
      setError(err.message || "Failed to load applications.");
    } finally {
      setLoading(false);
    }
  }, [loadCompliance]);

  useEffect(() => {
    loadApps();
  }, [loadApps]);

  function handleSelectChange(e) {
    const id = e.target.value;
    setSelectedAppId(id);
    loadCompliance(id);
  }

  const comp = selectedApp?.compliance;

  // Circular gauge calculations
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const score = comp?.score ?? 0;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreColor = (sc) => {
    if (sc >= 90) return "#059669";
    if (sc >= 60) return "#d97706";
    return "#e11d48";
  };

  return (
    <div style={{ animation: "fadeIn 0.25s ease" }}>
      <div className="panel" style={{ marginBottom: 24 }}>
        {/* Panel Header */}
        <div className="panel-head">
          <div>
            <div className="eyebrow">
              <Sparkles size={13} />
              <span>AICTE STATUTORY AI INTELLIGENCE & COMPLIANCE ENGINE</span>
            </div>
            <h2>Automated Preliminary Document Compliance</h2>
            <p>Scans mandatory attachments, institutional criteria, and regulatory checklists before scrutiny convening.</p>
          </div>
          {apps.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", width: "100%", marginTop: 8 }}>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                <Building2 size={15} color="#2563eb" />
                <span>Target Application:</span>
              </label>
              <select
                value={selectedAppId}
                onChange={handleSelectChange}
                style={{ fontSize: 13, padding: "9px 14px", flex: "1 1 280px", minWidth: 0, fontWeight: 600 }}
              >
                {apps.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.id} — {a.institution} ({a.status})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && (
          <div className="error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="loading">
            <Sparkles size={26} style={{ color: "#2563eb", animation: "pulse 1.5s infinite" }} />
            <span>Evaluating statutory compliance criteria across institutional attachments…</span>
          </div>
        ) : !selectedApp ? (
          <div className="empty">
            No applications found in the database. Create an application first to evaluate compliance.
          </div>
        ) : comp ? (
          <div>
            {/* Banner with Circular Gauge & Score */}
            <div
              style={{
                padding: "26px 30px",
                background: "linear-gradient(135deg, #090e1c 0%, #111d38 50%, #1e3a8a 100%)",
                borderRadius: 16,
                color: "white",
                marginBottom: 24,
                boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.25)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                position: "relative",
                overflow: "hidden"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                  {/* Circular SVG Gauge */}
                  <div style={{ position: "relative", width: 104, height: 104, display: "grid", placeItems: "center" }}>
                    <svg width="104" height="104" style={{ transform: "rotate(-90deg)" }}>
                      <circle
                        cx="52"
                        cy="52"
                        r={radius}
                        fill="transparent"
                        stroke="rgba(255,255,255,0.15)"
                        strokeWidth="10"
                      />
                      <circle
                        cx="52"
                        cy="52"
                        r={radius}
                        fill="transparent"
                        stroke={getScoreColor(comp.score)}
                        strokeWidth="10"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}
                      />
                    </svg>
                    <div style={{ position: "absolute", textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 900, fontFamily: "Outfit, sans-serif", color: "#ffffff", lineHeight: 1 }}>
                        {comp.score}%
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#93c5fd", letterSpacing: 0.8, textTransform: "uppercase" }}>
                        Score
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: "#93c5fd", fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase" }}>
                      PRELIMINARY STATUTORY SCORECARD
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#ffffff", fontFamily: "Outfit, sans-serif", margin: "4px 0" }}>
                      {comp.score === 100 ? "Fully Compliant with AICTE Norms" : "Conditional Compliance — Action Required"}
                    </div>
                    <div style={{ fontSize: 13, color: "#cbd5e1", maxWidth: 540 }}>
                      {comp.verdict}
                    </div>

                    {comp.score < 100 && (
                      <button
                        className="btn primary"
                        style={{ marginTop: 14, padding: "8px 16px", fontSize: 12 }}
                        onClick={() => onSelectApp && onSelectApp(selectedAppId, "documents")}
                      >
                        <UploadCloud size={15} />
                        <span>Upload Missing Documents to Reach 100% →</span>
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span
                    className={`status ${comp.risk_level === "Low" ? "green" : comp.risk_level === "Medium" ? "amber" : "red"}`}
                    style={{ fontSize: 12.5, padding: "7px 16px", fontWeight: 800 }}
                  >
                    {comp.risk_level.toUpperCase()} REGULATORY RISK
                  </span>
                  <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 8, fontWeight: 500 }}>
                    <b>{comp.documents_present}</b> of <b>{comp.documents_required}</b> statutory documents attached
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 18,
                  fontSize: 11.5,
                  color: "#94a3b8",
                  borderTop: "1px solid rgba(255, 255, 255, 0.12)",
                  paddingTop: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}
              >
                <Info size={14} color="#60a5fa" />
                <span><b>Statutory Notice:</b> {comp.disclaimer}</span>
              </div>
            </div>

            {/* Document Checklist & Field Checklist */}
            <div className="middle">
              {/* 1. Statutory Documents Checklist */}
              <div className="panel" style={{ margin: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <FileCheck size={18} color="#2563eb" />
                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
                      1. Mandatory Statutory Documents ({comp.documents_present}/{comp.documents_required})
                    </h3>
                  </div>
                  {comp.documents_present < comp.documents_required && (
                    <button
                      className="link"
                      onClick={() => onSelectApp && onSelectApp(selectedAppId, "documents")}
                      style={{ fontSize: 11.5 }}
                    >
                      <UploadCloud size={13} />
                      <span>Upload Area →</span>
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {comp.document_checklist?.map((d) => (
                    <div
                      key={d.type}
                      style={{
                        padding: 14,
                        background: d.resolved ? "#f0fdf4" : "#fff1f2",
                        border: `1px solid ${d.resolved ? "#bbf7d0" : "#fecdd3"}`,
                        borderRadius: 10,
                        transition: "all 0.15s ease"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {d.resolved ? (
                            <CheckCircle2 size={16} color="#059669" />
                          ) : (
                            <XCircle size={16} color="#e11d48" />
                          )}
                          <span style={{ fontWeight: 700, fontSize: 12.5, color: "var(--ink)" }}>{d.type}</span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className={`status ${d.resolved ? "green" : "red"}`}>
                            {d.resolved ? "Uploaded" : "Missing"}
                          </span>
                          {!d.resolved && (
                            <button
                              type="button"
                              className="btn primary"
                              style={{ padding: "4px 10px", fontSize: 11 }}
                              onClick={() => onSelectApp && onSelectApp(selectedAppId, d.type)}
                            >
                              <UploadCloud size={13} />
                              <span>Upload Now</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 6, paddingLeft: 24 }}>
                        {d.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Institutional Fields Checklist */}
              <div className="panel" style={{ margin: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <Building2 size={18} color="#4f46e5" />
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
                    2. Institutional Fields Checklist
                  </h3>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {comp.field_checklist?.map((f) => (
                    <div
                      key={f.field}
                      style={{
                        padding: 13,
                        background: f.resolved ? "#f0fdf4" : "#fffbeb",
                        border: `1px solid ${f.resolved ? "#bbf7d0" : "#fde68a"}`,
                        borderRadius: 10
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {f.resolved ? (
                            <CheckCircle2 size={16} color="#059669" />
                          ) : (
                            <AlertTriangle size={16} color="#d97706" />
                          )}
                          <span style={{ fontWeight: 700, fontSize: 12.5, color: "var(--ink)" }}>{f.label}</span>
                        </div>
                        <span className={`status ${f.resolved ? "green" : "amber"}`}>
                          {f.resolved ? "Valid" : "Needs Review"}
                        </span>
                      </div>
                      {f.value && (
                        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4, paddingLeft: 24 }}>
                          Value: <b style={{ color: "var(--ink)" }}>{f.value}</b>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actionable Issues Section */}
            {comp.issues?.length > 0 && (
              <div className="panel" style={{ marginTop: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <AlertTriangle size={18} color="#e11d48" />
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                    Actionable Deficiencies & Rectification Steps ({comp.issues.length})
                  </h3>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {comp.issues.map((issue, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: 16,
                        background: "var(--panel-card)",
                        border: "1px solid var(--line)",
                        borderRadius: 12,
                        borderLeft: `4px solid ${issue.severity === "High" ? "#e11d48" : "#d97706"}`
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <b style={{ fontSize: 13, color: "var(--ink)" }}>{issue.item} ({issue.category})</b>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className={`status ${issue.severity === "High" ? "red" : "amber"}`}>
                            {issue.status}
                          </span>
                          {issue.category === "Document" && (
                            <button
                              type="button"
                              className="btn primary"
                              style={{ padding: "4px 10px", fontSize: 11 }}
                              onClick={() => onSelectApp && onSelectApp(selectedAppId, issue.item)}
                            >
                              <UploadCloud size={13} />
                              <span>Upload {issue.item}</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>
                        {issue.message}
                      </div>
                      <div style={{ fontSize: 12, color: "#2563eb", marginTop: 6, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                        <ArrowRight size={14} />
                        <span><b>Resolution:</b> {issue.resolution}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
