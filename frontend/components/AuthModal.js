"use client";
import { useState } from "react";
import { api, setStoredAuth } from "../lib/api";
import {
  LogIn,
  UserPlus,
  Shield,
  X,
  KeyRound,
  Building2,
  Sparkles,
  AlertCircle,
  UserCheck,
  CheckCircle2
} from "lucide-react";

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [tab, setTab] = useState("login"); // 'login' or 'register'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleLogin(e, demoEmail = null, demoPw = null) {
    if (e) e.preventDefault();
    setLoading(true);
    setError("");
    const loginEmail = demoEmail || email;
    const loginPw = demoPw || password;

    try {
      const res = await api.login(loginEmail, loginPw);
      setStoredAuth(res.token, res.user);
      onAuthSuccess(res.user);
      onClose();
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.register({
        email,
        password,
        name,
        institution_id: institutionId,
        institution_name: institutionName
      });
      setStoredAuth(res.token, res.user);
      onAuthSuccess(res.user);
      onClose();
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="modal-bg"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={{ maxWidth: 540 }}>
        {/* Modal Header */}
        <div className="modal-head">
          <div>
            <div className="eyebrow">
              <Shield size={13} />
              <span>STATUTORY SECURE ACCESS GATEWAY</span>
            </div>
            <h2>{tab === "login" ? "AICTE Single Sign-On Portal" : "Institutional Bureau Registration"}</h2>
            <p>Access AICTE Statutory Approval Automation & Surveillance System</p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        {/* Tab Switch */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
          <button
            type="button"
            className={`btn ${tab === "login" ? "primary" : ""}`}
            style={{ flex: 1, padding: "10px" }}
            onClick={() => { setTab("login"); setError(""); }}
          >
            <LogIn size={15} />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            className={`btn ${tab === "register" ? "primary" : ""}`}
            style={{ flex: 1, padding: "10px" }}
            onClick={() => { setTab("register"); setError(""); }}
          >
            <UserPlus size={15} />
            <span>Register Institution</span>
          </button>
        </div>

        {error && (
          <div className="error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {tab === "login" ? (
          <form onSubmit={handleLogin}>
            <label>
              Official Registered Email Address
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="principal@institution.edu.in"
              />
            </label>
            <label>
              Security Password
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </label>

            {/* Quick 1-Click Demo Switcher */}
            <div
              style={{
                margin: "18px 0",
                padding: "16px",
                background: "linear-gradient(135deg, #f8faff 0%, #eff6ff 100%)",
                borderRadius: 12,
                border: "1px solid #bfdbfe"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#1e3a8a", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>
                <Sparkles size={14} color="#2563eb" />
                <span>Instant 1-Click Evaluation Personas</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <button
                  type="button"
                  className="btn"
                  style={{ fontSize: 11.5, padding: "9px 8px", display: "flex", flexDirection: "column", gap: 2, alignItems: "center", background: "var(--panel-card)" }}
                  onClick={() => handleLogin(null, "admin@aicte.gov.in", "AdminSecure@2026")}
                  disabled={loading}
                >
                  <span style={{ fontWeight: 800, color: "#e11d48" }}>Admin HQ</span>
                  <span style={{ fontSize: 9.5, color: "var(--muted)" }}>admin@aicte</span>
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ fontSize: 11.5, padding: "9px 8px", display: "flex", flexDirection: "column", gap: 2, alignItems: "center", background: "var(--panel-card)" }}
                  onClick={() => handleLogin(null, "reviewer@aicte.gov.in", "ReviewerSecure@2026")}
                  disabled={loading}
                >
                  <span style={{ fontWeight: 800, color: "var(--primary)" }}>Reviewer</span>
                  <span style={{ fontSize: 9.5, color: "var(--muted)" }}>reviewer@aicte</span>
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ fontSize: 11.5, padding: "9px 8px", display: "flex", flexDirection: "column", gap: 2, alignItems: "center", background: "var(--panel-card)" }}
                  onClick={() => handleLogin(null, "principal@mit.edu.in", "MitSecure@2026")}
                  disabled={loading}
                >
                  <span style={{ fontWeight: 800, color: "#059669" }}>College User</span>
                  <span style={{ fontSize: 9.5, color: "var(--muted)" }}>principal@mit</span>
                </button>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn primary" disabled={loading}>
                {loading ? "Authenticating…" : "Sign In to Portal"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <label>
              Authorized Principal / Representative Name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. R. K. Sharma (Principal)"
              />
            </label>
            <label>
              Official Institutional Email Address
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="principal@college.edu.in"
              />
            </label>
            <label>
              Security Password (min 6 characters)
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose secure password"
              />
            </label>
            <div className="detail-grid">
              <label>
                Permanent Institution ID
                <input
                  required
                  value={institutionId}
                  onChange={(e) => setInstitutionId(e.target.value)}
                  placeholder="AICTE-1-XXXXXX"
                />
              </label>
              <label>
                Institution Full Legal Name
                <input
                  required
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder="Apex Institute of Technology"
                />
              </label>
            </div>

            <div className="notice" style={{ marginTop: 14 }}>
              <UserCheck size={16} />
              <span>Registered institutions can file approval applications, upload mandatory statutory documents, and receive real-time SMS updates.</span>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn primary" disabled={loading}>
                {loading ? "Registering…" : "Register Institution"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
