"use client";
import { useState, useEffect } from "react";
import { api } from "../lib/api";
import {
  Server,
  Database,
  Mail,
  HardDrive,
  ShieldCheck,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertCircle,
  KeyRound
} from "lucide-react";

export default function SettingsView({ currentUser, onLogout }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadHealth();
  }, []);

  async function loadHealth() {
    setLoading(true);
    setError("");
    try {
      const data = await api.health();
      setHealth(data);
    } catch (err) {
      setError(err.message || "Could not reach backend API server.");
    } finally {
      setLoading(false);
    }
  }

  const db = health?.database;
  const email = health?.email;
  const storage = health?.storage;

  return (
    <div>
      <div className="panel" style={{ marginBottom: 24 }}>
        <div className="panel-head">
          <div>
            <div className="eyebrow">
              <Server size={14} />
              <span>Infrastructure Topology</span>
            </div>
            <h2>System Health & Connected Gateways</h2>
            <p>Verification of connected microservices, MongoDB Atlas clusters, and notification gateways</p>
          </div>
          <button className="btn" onClick={loadHealth}>
            <RefreshCw size={14} />
            <span>Recheck Topology</span>
          </button>
        </div>

        {error && (
          <div className="error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="loading">Probing backend and database connectivity…</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {/* MongoDB Atlas Card */}
            <div
              style={{
                padding: 20,
                background: "linear-gradient(135deg, #f8faff 0%, #f0fdf4 100%)",
                borderRadius: 14,
                border: "1px solid #bbf7d0",
                boxShadow: "0 2px 8px rgba(16, 185, 129, 0.05)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Database size={18} color="#059669" />
                  <b style={{ fontSize: 14, color: "#1e293b" }}>MongoDB Atlas Database</b>
                </div>
                <span className={`status ${db?.connected ? "green" : "red"}`}>
                  {db?.connected ? "CONNECTED" : "OFFLINE"}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#475569", display: "flex", flexDirection: "column", gap: 8 }}>
                <div>Target Database: <b>{db?.database || "aicte_workflow"}</b></div>
                <div>Status Message: {db?.message}</div>
                {db?.latency_ms !== null && <div>Ping Latency: <b>{db?.latency_ms} ms</b></div>}
                <div>Active Collections: <b>{db?.collections?.join(", ") || "None"}</b></div>
              </div>
            </div>

            {/* Email Notification Card */}
            <div
              style={{
                padding: 20,
                background: "linear-gradient(135deg, #f8faff 0%, #eff6ff 100%)",
                borderRadius: 14,
                border: "1px solid #bfdbfe",
                boxShadow: "0 2px 8px rgba(37, 99, 235, 0.05)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Mail size={18} color="#2563eb" />
                  <b style={{ fontSize: 14, color: "#1e293b" }}>Email Notification Gateway</b>
                </div>
                <span className={`status ${email?.configured ? "green" : "blue"}`}>
                  {email?.configured ? "LIVE SMTP" : "DEV / AUDIT"}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#475569", display: "flex", flexDirection: "column", gap: 8 }}>
                <div>Sender: <b>{email?.sender || "aicte.portal@gov.in"}</b></div>
                <div>SMTP Server: <b>{email?.host || "smtp.gmail.com:587"}</b></div>
                <div>Provider Mode: <b>{email?.provider}</b></div>
                <div>Notice: {email?.note}</div>
              </div>
            </div>

            {/* File Storage Card */}
            <div
              style={{
                padding: 20,
                background: "#f8fafc",
                borderRadius: 14,
                border: "1px solid var(--line)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <HardDrive size={18} color="#475569" />
                  <b style={{ fontSize: 14, color: "#1e293b" }}>Document Storage Engine</b>
                </div>
                <span className="status green">ONLINE</span>
              </div>
              <div style={{ fontSize: 12, color: "#475569", display: "flex", flexDirection: "column", gap: 8 }}>
                <div>Architecture: <b>Local disk + MongoDB metadata</b></div>
                <div>Configurable Max Size: <b>{storage?.max_file_size_mb || 10} MB</b></div>
                <div>Allowed Formats: <b>{storage?.supported_types?.join(", ") || "PDF, PNG, JPG, JPEG"}</b></div>
                <div>Magic Byte Verification: <b>Enforced</b></div>
              </div>
            </div>

            {/* Authentication Card */}
            <div
              style={{
                padding: 20,
                background: "#f8fafc",
                borderRadius: 14,
                border: "1px solid var(--line)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <KeyRound size={18} color="#7c3aed" />
                  <b style={{ fontSize: 14, color: "#1e293b" }}>Current Session & RBAC</b>
                </div>
                <span className="status blue">{currentUser?.role || "Guest"}</span>
              </div>
              <div style={{ fontSize: 12, color: "#475569", display: "flex", flexDirection: "column", gap: 8 }}>
                <div>User Name: <b>{currentUser?.name || "Not signed in"}</b></div>
                <div>Email: {currentUser?.email || "—"}</div>
                <div>Assigned Scope: <b>{currentUser?.institution_name || "Headquarters"}</b></div>
                {currentUser && (
                  <div style={{ marginTop: 8 }}>
                    <button type="button" className="btn danger" onClick={onLogout} style={{ fontSize: 11 }}>
                      <LogOut size={13} />
                      <span>Sign Out of Session</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Configuration Guide */}
      <div className="panel">
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 10px" }}>Production Deployment Configuration</h3>
        <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>
          Credentials and secrets are managed exclusively through <code>backend/.env</code> and never exposed to the client.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          <div style={{ padding: 16, background: "#fff", border: "1px solid var(--line)", borderRadius: 12 }}>
            <b style={{ fontSize: 13, color: "#1e293b" }}>Setting up MongoDB Atlas:</b>
            <ol style={{ fontSize: 12, color: "#475569", paddingLeft: 18, marginTop: 8, lineHeight: 1.6 }}>
              <li>Create a free cluster on cloud.mongodb.com.</li>
              <li>Under Database Access, create a user with readWrite permissions.</li>
              <li>Under Network Access, allow your IP address or 0.0.0.0/0.</li>
              <li>Set connection string in <code>backend/.env</code> as <code>MONGODB_URI</code>.</li>
            </ol>
          </div>

          <div style={{ padding: 16, background: "#fff", border: "1px solid var(--line)", borderRadius: 12 }}>
            <b style={{ fontSize: 13, color: "#1e293b" }}>Email Gateway (SMTP):</b>
            <ol style={{ fontSize: 12, color: "#475569", paddingLeft: 18, marginTop: 8, lineHeight: 1.6 }}>
              <li>Use any standard SMTP provider or Gmail App Passwords.</li>
              <li>Set <code>SMTP_HOST=smtp.gmail.com</code> and <code>SMTP_PORT=587</code>.</li>
              <li>Set <code>SMTP_USER</code> and <code>SMTP_PASSWORD</code> in <code>backend/.env</code>.</li>
              <li>Official AICTE HTML email templates dispatch on every status transition.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
