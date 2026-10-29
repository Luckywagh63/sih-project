"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import {
  Search,
  RefreshCw,
  Plus,
  Filter,
  Building2,
  Calendar,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  AlertCircle,
  X,
  FileSpreadsheet,
  ArrowRight,
  Clock,
  Sparkles
} from "lucide-react";

const STATUSES = [
  "All statuses",
  "Draft",
  "Submitted",
  "Under Review",
  "Correction Required",
  "Resubmitted",
  "Approved",
  "Rejected"
];

const TYPES = [
  "All types",
  "New Approval",
  "Extension of Approval",
  "Course Addition",
  "Intake Change"
];

export default function ApplicationsView({ onSelectApp, onNewApp, refreshKey }) {
  const [apps, setApps] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [type, setType] = useState("All types");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.applications({
        search,
        status,
        type,
        page,
        limit
      });
      setApps(res.items || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
    } catch (err) {
      setError(err.message || "Failed to load applications from MongoDB Atlas.");
    } finally {
      setLoading(false);
    }
  }, [search, status, type, page, limit]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

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

  const hasActiveFilters = Boolean(search || status !== "All statuses" || type !== "All types");

  return (
    <div className="panel table-panel" style={{ animation: "fadeIn 0.25s ease" }}>
      {/* Panel Header */}
      <div className="panel-head">
        <div>
          <div className="eyebrow">
            <FileSpreadsheet size={13} />
            <span>CENTRAL STATUTORY APPLICATION REGISTER</span>
          </div>
          <h2>AICTE Institutional Submissions</h2>
          <p>Search, inspect, and evaluate statutory applications stored in MongoDB Atlas</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn" onClick={load} title="Refresh dataset from cluster">
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
        <div className="error" style={{ margin: "14px 24px" }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Toolbar Filters */}
      <div className="toolbar">
        <div className="search-input-wrap">
          <Search size={15} className="search-icon" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by ID, Institution name, AICTE ID, contact person..."
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(""); setPage(1); }}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: 0,
                color: "#94a3b8",
                cursor: "pointer",
                padding: 4
              }}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          style={{ minWidth: 160 }}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={type}
          onChange={(e) => { setType(e.target.value); setPage(1); }}
          style={{ minWidth: 170 }}
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            className="btn"
            onClick={() => {
              setSearch("");
              setStatus("All statuses");
              setType("All types");
              setPage(1);
            }}
            title="Reset filters"
          >
            <RotateCcw size={13} />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>APPLICATION ID</th>
              <th>INSTITUTION NAME</th>
              <th>AICTE PERMANENT ID</th>
              <th>APPLICATION TYPE</th>
              <th>SCRUTINY STATUS</th>
              <th>ASSIGNED REVIEWER</th>
              <th>LAST UPDATED</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="loading">
                  <RefreshCw size={24} style={{ color: "#2563eb", animation: "spin 1s linear infinite" }} />
                  <span>Loading applications from MongoDB Atlas…</span>
                </td>
              </tr>
            ) : apps.length > 0 ? (
              apps.map((app) => (
                <tr key={app.id} onClick={() => onSelectApp(app.id)}>
                  <td>
                    <span className="app-id">{app.id}</span>
                    <span className="sub">Created {new Date(app.created_at).toLocaleDateString()}</span>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                          color: "#2563eb",
                          display: "grid",
                          placeItems: "center",
                          fontWeight: 700,
                          fontSize: 12,
                          border: "1px solid #bfdbfe",
                          flexShrink: 0
                        }}
                      >
                        {app.institution ? app.institution.charAt(0).toUpperCase() : "I"}
                      </div>
                      <div>
                        <b style={{ color: "var(--ink)" }}>{app.institution}</b>
                        <span className="sub">{app.contact_name}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--ink-secondary)",
                        background: "var(--bg-subtle)",
                        border: "1px solid var(--line)",
                        padding: "3px 7px",
                        borderRadius: 5
                      }}
                    >
                      {app.institution_id}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: "#334155" }}>{app.type}</span>
                  </td>
                  <td>
                    <span className={`status ${getStatusColor(app.status)}`}>
                      {app.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                      <UserCheck size={14} color={app.assigned_reviewer_name ? "#2563eb" : "#94a3b8"} />
                      <span style={{ fontWeight: app.assigned_reviewer_name ? 600 : 400, color: app.assigned_reviewer_name ? "#1e293b" : "#94a3b8" }}>
                        {app.assigned_reviewer_name || "Unassigned"}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#64748b", fontSize: 12 }}>
                      <Clock size={13} />
                      <span>{new Date(app.updated_at).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td>
                    <button
                      className="btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectApp(app.id);
                      }}
                      style={{ padding: "5px 10px", fontSize: 11.5 }}
                    >
                      <span>Inspect</span>
                      <ArrowRight size={13} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="empty">
                  {hasActiveFilters
                    ? "No applications match the specified search filters. Try adjusting keywords or status."
                    : "Database is currently empty. Click '+ File Application' to register your first institutional workflow."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="table-foot">
        <span>
          Showing <b>{apps.length}</b> of <b>{total}</b> records in MongoDB Atlas
        </span>
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
    </div>
  );
}
