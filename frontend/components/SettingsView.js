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
  KeyRound,
  Cpu,
  Globe,
  Radio,
  FileCheck
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
    <div style={{ animation: "fadeIn 0.25s ease" }}>
      <div className="panel" style={{ marginBottom: 24 }}>
        <div className="panel-head">
          <div>
            <div className="eyebrow">
              <Server size={13} />
              <span>INFRASTRUCTURE TOPOLOGY & CLUSTER TELEMETRY</span>
            </div>
            <h2>System Health & Microservices Architecture</h2>
            <p>Verification of connected microservices, MongoDB Atlas clusters, document storage, and notification gateways</p>
          </div>
          <button className="btn" onClick={loadHealth} title="Re-probe cluster endpoints">
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
          <div className="loading">
            <RefreshCw size={24} style={{ color: "#2563eb", animation: "spin 1s linear infinite" }} />
            <span>Probing backend and database connectivity…</span>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 20 }}>
            {/* MongoDB Atlas Card */}
            <div
              style={{
                padding: 22,
                background: "linear-gradient(135deg, #f8faff 0%, #f0fdf4 100%)",
                borderRadius: 14,
                border: "1px solid #bbf7d0",
                boxShadow: "0 2px 10px rgba(16, 185, 129, 0.05)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 9,
                      background: "#ecfdf5",
                      color: "#059669",
                      display: "grid",
                      placeItems: "center",
                      border: "1px solid #a7f3d0"
                    }}
                  >
                    <Database size={18} />
                  </div>
                  <div>
                    <b style={{ fontSize: 14, color: "#1e293b", display: "block" }}>MongoDB Atlas Database</b>
                    <span style={{ fontSize: 11, color: "#64748b" }}>Production Cluster</span>
                  </div>
                </div>
                <span className={`status ${db?.connected ? "green" : "red"}`}>
                  {db?.connected ? "CONNECTED" : "OFFLINE"}
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: "#475569", display: "flex", flexDirection: "column", gap: 8 }}>
                <div>Target Database: <b>{db?.database || "aicte_workflow"}</b></div>
                <div>Status Message: {db?.message}</div>
                {db?.latency_ms !== null && <div>Cluster Latency: <b style={{ color: "#059669" }}>{db?.latency_ms} ms</b></div>}
                <div>Active Collections: <b>{db?.collections?.join(", ") || "None"}</b></div>
              </div>
            </div>

            {/* Email Notification Card */}
            <div
              style={{
                padding: 22,
                background: "linear-gradient(135deg, #f8faff 0%, #eff6ff 100%)",
                borderRadius: 14,
                border: "1px solid #bfdbfe",
                boxShadow: "0 2px 10px rgba(37, 99, 235, 0.05)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 9,
                      background: "#eff6ff",
                      color: "#2563eb",
                      display: "grid",
                      placeItems: "center",
                      border: "1px solid #bfdbfe"
                    }}
                  >
                    <Mail size={18} />
                  </div>
                  <div>
                    <b style={{ fontSize: 14, color: "#1e293b", display: "block" }}>Notification Gateway</b>
                    <span style={{ fontSize: 11, color: "#64748b" }}>Email & SMS Gateway</span>
                  </div>
                </div>
                <span className={`status ${email?.configured ? "green" : "blue"}`}>
                  {email?.configured ? "LIVE SMTP" : "DEV SIMULATOR"}
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: "#475569", display: "flex", flexDirection: "column", gap: 8 }}>
                <div>Sender: <b>{email?.sender || "aicte.portal@gov.in"}</b></div>
                <div>SMTP Server: <b>{email?.host || "smtp.gmail.com:587"}</b></div>
                <div>Provider Mode: <b>{email?.provider}</b></div>
                <div>Notice: {email?.note}</div>
              </div>
            </div>

            {/* File Storage Card */}
            <div
              style={{
                padding: 22,
                background: "#f8fafc",
                borderRadius: 14,
                border: "1px solid var(--line)",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 9,
                      background: "#f1f5f9",
                      color: "#475569",
                      display: "grid",
                      placeItems: "center",
                      border: "1px solid #e2e8f0"
                    }}
                  >
                    <HardDrive size={18} />
                  </div>
                  <div>
                    <b style={{ fontSize: 14, color: "#1e293b", display: "block" }}>Document Storage Engine</b>
                    <span style={{ fontSize: 11, color: "#64748b" }}>Safe Magic Byte Scanner</span>
                  </div>
                </div>
                <span className="status green">ONLINE</span>
              </div>
              <div style={{ fontSize: 12.5, color: "#475569", display: "flex", flexDirection: "column", gap: 8 }}>
                <div>Architecture: <b>Isolated storage + Mongo indexes</b></div>
                <div>Configurable Max Size: <b>{storage?.max_file_size_mb || 10} MB</b></div>
                <div>Allowed Formats: <b>{storage?.supported_types?.join(", ") || "PDF, PNG, JPG, JPEG"}</b></div>
                <div>Magic Byte Verification: <b style={{ color: "#059669" }}>Enforced</b></div>
              </div>
            </div>

            {/* Current Session Card */}
            <div
              style={{
                padding: 22,
                background: "#f8fafc",
                borderRadius: 14,
                border: "1px solid var(--line)",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 9,
                      background: "#f5f3ff",
                      color: "#7c3aed",
                      display: "grid",
                      placeItems: "center",
                      border: "1px solid #ddd6fe"
                    }}
                  >
                    <KeyRound size={18} />
                  </div>
                  <div>
                    <b style={{ fontSize: 14, color: "#1e293b", display: "block" }}>Active Authentication Session</b>
                    <span style={{ fontSize: 11, color: "#64748b" }}>Security Scope</span>
                  </div>
                </div>
                <span className="status blue">{currentUser?.role || "Guest"}</span>
              </div>
              <div style={{ fontSize: 12.5, color: "#475569", display: "flex", flexDirection: "column", gap: 8 }}>
                <div>User Name: <b>{currentUser?.name || "Not signed in"}</b></div>
                <div>Email: {currentUser?.email || "—"}</div>
                <div>Assigned Bureau: <b>{currentUser?.institution_name || "Headquarters"}</b></div>
                {currentUser && (
                  <div style={{ marginTop: 8 }}>
                    <button type="button" className="btn danger" onClick={onLogout} style={{ fontSize: 11.5, padding: "7px 12px" }}>
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

      {/* Configuration & Architecture Topology Guide */}
      <div className="panel">
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 10px" }}>Production Topology & Environment Configuration</h3>
        <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 18 }}>
          Credentials and connection strings are managed securely through <code>backend/.env</code> and never exposed to public web clients.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 16 }}>
          <div style={{ padding: 18, background: "var(--panel-card)", border: "1px solid var(--line)", borderRadius: 12 }}>
            <b style={{ fontSize: 13, color: "var(--ink)" }}>1. MongoDB Atlas Cluster:</b>
            <ol style={{ fontSize: 12, color: "var(--muted)", paddingLeft: 18, marginTop: 8, lineHeight: 1.6 }}>
              <li>Create a free cluster on cloud.mongodb.com.</li>
              <li>Under Database Access, create a user with readWrite permissions.</li>
              <li>Under Network Access, allow your IP address or 0.0.0.0/0.</li>
              <li>Set connection string in <code>backend/.env</code> as <code>MONGODB_URI</code>.</li>
            </ol>
          </div>

          <div style={{ padding: 18, background: "var(--panel-card)", border: "1px solid var(--line)", borderRadius: 12 }}>
            <b style={{ fontSize: 13, color: "var(--ink)" }}>2. Notification Gateway (SMTP / Twilio):</b>
            <ol style={{ fontSize: 12, color: "var(--muted)", paddingLeft: 18, marginTop: 8, lineHeight: 1.6 }}>
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
