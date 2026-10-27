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
  Lock
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
      <div className="panel" style={{ maxWidth: 800 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#eff6ff",
              color: "#2563eb",
              display: "grid",
              placeItems: "center"
            }}
          >
            <Lock size={18} />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>Role-Based Access Control</h2>
            <p style={{ margin: 0 }}>Administrative privileges required for user management</p>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          You are currently signed in as <b>{currentUser?.name || "Guest"}</b> with active role:{" "}
          <span className="status blue">{currentUser?.role || "Institution User"}</span>.
        </div>

        <div className="notice" style={{ marginTop: 16 }}>
          <Shield size={18} color="#2563eb" style={{ flexShrink: 0 }} />
          <div>
            <b>Administrative Access Required:</b> Only authorized AICTE HQ Administrators can modify user roles, assign reviewers, or access global user registers. Sign in with the administrator account (<code>admin@aicte.gov.in</code>) to manage users.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel table-panel">
      <div className="panel-head">
        <div>
          <div className="eyebrow">
            <Users size={14} />
            <span>Identity & Access Management</span>
          </div>
          <h2>User & Reviewer Governance</h2>
          <p>Manage portal accounts and assign scrutiny committee review privileges</p>
        </div>
        <button className="btn" onClick={loadUsers}>
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
              <th>NAME & EMAIL</th>
              <th>INSTITUTION / BUREAU</th>
              <th>CURRENT ROLE</th>
              <th>CHANGE ROLE</th>
              <th>REGISTERED</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="loading">Loading accounts from MongoDB Atlas…</td>
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
                          placeItems: "center"
                        }}
                      >
                        {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div>
                        <b>{u.name}</b>
                        <span className="sub">{u.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Building2 size={14} color="#64748b" />
                      <span>{u.institution_name || u.institution_id || "AICTE Headquarters"}</span>
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
                      style={{ fontSize: 12, padding: "6px 10px" }}
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
