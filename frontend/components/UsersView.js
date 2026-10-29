"use client";
import { useState, useEffect } from "react";
import { api } from "../lib/api";
import {
  Users,
  Shield,
  UserCheck,
  RefreshCw,
  AlertCircle,
  Building2,
  Calendar,
  Lock,
  CheckCircle2,
  KeyRound,
  ShieldAlert
} from "lucide-react";

const ROLES = ["Administrator", "Reviewer", "Institution User"];

export default function UsersView({ currentUser, notify }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  const isAdmin = currentUser?.role === "Administrator";

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const res = await api.users();
      setUsers(res.items || []);
    } catch (err) {
      setError(err.message || "Failed to load registered users.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(userId, newRole) {
    if (!confirm(`Change user role to '${newRole}'?`)) return;
    setUpdatingId(userId);
    try {
      await api.updateUserRole(userId, newRole);
      notify(`Role updated to ${newRole}`);
      await loadUsers();
    } catch (err) {
      setError(err.message || "Failed to update role.");
    } finally {
      setUpdatingId("");
    }
  }

  if (!isAdmin) {
    return (
      <div style={{ maxWidth: 860, margin: "0 auto", animation: "fadeIn 0.25s ease" }}>
        <div className="panel" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                color: "#2563eb",
                display: "grid",
                placeItems: "center",
                border: "1px solid #bfdbfe",
                flexShrink: 0
              }}
            >
              <Lock size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0 }}>Role-Based Access Control (RBAC) Governance</h2>
              <p style={{ margin: "2px 0 0" }}>Administrative authorization required for user & reviewer governance</p>
            </div>
          </div>

          <div style={{ padding: 14, background: "#f8fafc", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13, marginBottom: 16 }}>
            Currently active session: <b>{currentUser?.name || "Guest Public Access"}</b> with scope:{" "}
            <span className="status blue">{currentUser?.role || "Institution User"}</span>.
          </div>

          <div className="notice">
            <Shield size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <b>Administrative Authorization Required:</b>
              <div style={{ marginTop: 4, lineHeight: 1.5 }}>
                Only authorized AICTE HQ Administrators can view global registers, reassign scrutinizing reviewers, or elevate user privilege tiers. To test administrative capabilities, click <b>&quot;Sign In / Switch Role&quot;</b> and select the pre-seeded Administrator account (<code>admin@aicte.gov.in</code>).
              </div>
            </div>
          </div>
        </div>

        {/* Role Permissions Matrix Card */}
        <div className="panel">
          <h3 style={{ margin: "0 0 14px", fontSize: 15 }}>Regulatory Permission Matrix</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
            <div style={{ padding: 16, background: "#f8fafc", borderRadius: 12, border: "1px solid var(--line)" }}>
              <div style={{ fontWeight: 800, color: "#e11d48", fontSize: 13, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <span className="status red" style={{ padding: "2px 8px" }}>Administrator</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
                <li>Full platform governance & override</li>
                <li>Assign and reallocate Reviewers</li>
                <li>Promote/demote user security roles</li>
                <li>Inspect all applications and audit records</li>
              </ul>
            </div>

            <div style={{ padding: 16, background: "#f8fafc", borderRadius: 12, border: "1px solid var(--line)" }}>
              <div style={{ fontWeight: 800, color: "#2563eb", fontSize: 13, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <span className="status blue" style={{ padding: "2px 8px" }}>Reviewer</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
                <li>Perform preliminary and final scrutiny</li>
                <li>Transition application status (Review/Approve/Reject)</li>
                <li>Record formal committee feedback</li>
                <li>Inspect institutional compliance checklists</li>
              </ul>
            </div>

            <div style={{ padding: 16, background: "#f8fafc", borderRadius: 12, border: "1px solid var(--line)" }}>
              <div style={{ fontWeight: 800, color: "#059669", fontSize: 13, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <span className="status green" style={{ padding: "2px 8px" }}>Institution User</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
                <li>File new AICTE statutory applications</li>
                <li>Upload mandatory compliance documents</li>
                <li>Address deficiencies and resubmit</li>
                <li>Receive automated SMS & email updates</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel table-panel" style={{ animation: "fadeIn 0.25s ease" }}>
      <div className="panel-head">
        <div>
          <div className="eyebrow">
            <Users size={13} />
            <span>IDENTITY & ROLE-BASED ACCESS CONTROL (RBAC)</span>
          </div>
          <h2>User & Reviewer Governance Register</h2>
          <p>Oversee registered institutional accounts and assign statutory scrutiny privileges</p>
        </div>
        <button className="btn" onClick={loadUsers} title="Refresh user list">
          <RefreshCw size={14} />
          <span>Refresh Users</span>
        </button>
      </div>

      {error && (
        <div className="error" style={{ margin: "14px 24px" }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>USER ID</th>
              <th>ACCOUNT HOLDER & EMAIL</th>
              <th>AFFILIATED INSTITUTION</th>
              <th>ACTIVE ROLE</th>
              <th>ROLE OVERRIDE</th>
              <th>REGISTRATION DATE</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="loading">
                  <RefreshCw size={24} style={{ color: "#2563eb", animation: "spin 1s linear infinite" }} />
                  <span>Loading user register from MongoDB Atlas…</span>
                </td>
              </tr>
            ) : users.length > 0 ? (
              users.map((u) => (
                <tr key={u.id}>
                  <td><span className="app-id">{u.id}</span></td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: 12,
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0
                        }}
                      >
                        {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div>
                        <b style={{ color: "var(--ink)" }}>{u.name}</b>
                        <span className="sub">{u.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Building2 size={14} color="#64748b" />
                      <span style={{ fontWeight: 500, color: "#334155" }}>
                        {u.institution_name || u.institution_id || "AICTE Headquarters (HQ)"}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`status ${u.role === "Administrator" ? "red" : u.role === "Reviewer" ? "blue" : "green"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <select
                      value={u.role}
                      disabled={updatingId === u.id || u.id === currentUser?.id}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      style={{ fontSize: 12, padding: "6px 10px", fontWeight: 600 }}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#64748b", fontSize: 12 }}>
                      <Calendar size={13} />
                      <span>{new Date(u.created_at).toLocaleDateString()}</span>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="empty">No registered users found in the database.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="table-foot">
        <span>Total registered accounts: <b>{users.length}</b></span>
        <span>Governance: <b>AICTE Role Enforcement Active</b></span>
      </div>
    </div>
  );
}
