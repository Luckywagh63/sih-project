"use client";
import { useState, useEffect, useCallback } from "react";
import { api, getStoredUser, clearStoredAuth, setStoredAuth } from "../lib/api";
import {
  LayoutDashboard,
  FileSpreadsheet,
  ShieldCheck,
  Mail,
  Users,
  Server,
  Plus,
  ChevronRight,
  LogOut,
  LogIn,
  Building2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Shield
} from "lucide-react";

import DashboardView from "../components/DashboardView";
import ApplicationsView from "../components/ApplicationsView";
import ComplianceView from "../components/ComplianceView";
import NotificationsView from "../components/NotificationsView";
import UsersView from "../components/UsersView";
import SettingsView from "../components/SettingsView";
import AuthModal from "../components/AuthModal";
import CreateApplicationModal from "../components/CreateApplicationModal";
import ApplicationDetailModal from "../components/ApplicationDetailModal";

export default function Home() {
  const [nav, setNav] = useState("Overview");
  const [stats, setStats] = useState(null);
  const [recentApps, setRecentApps] = useState([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Authentication State
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedDocType, setSelectedDocType] = useState(null);

  // Toast notification helper
  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3800);
  };

  // Initial auth load from localStorage
  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      setCurrentUser(user);
      api.me().then((verified) => {
        setCurrentUser(verified);
        setStoredAuth(null, verified);
      }).catch(() => {
        clearStoredAuth();
        setCurrentUser(null);
      });
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [healthRes, statsRes] = await Promise.all([
        api.health(),
        api.stats()
      ]);

      setConnected(healthRes.status === "healthy" || healthRes.database?.connected);
      setStats(statsRes);
      setRecentApps(statsRes.recent || []);
      setError("");
    } catch (err) {
      setConnected(false);
      setError(`Cannot connect to backend: ${err.message}. Ensure FastAPI server is running on http://127.0.0.1:8000.`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  function handleLogout() {
    clearStoredAuth();
    setCurrentUser(null);
    notify("Logged out successfully.");
    setRefreshKey((k) => k + 1);
  }

  function handleAppCreated(created) {
    notify(`Application ${created.id} successfully created and registered!`);
    setRefreshKey((k) => k + 1);
    setSelectedAppId(created.id);
  }

  // Navigation schema with Lucide icons
  const navGroups = [
    {
      group: "WORKSPACE",
      items: [
        { id: "Overview", label: "Executive Overview", icon: LayoutDashboard },
        { id: "Applications", label: "Application Register", icon: FileSpreadsheet, count: stats?.total }
      ]
    },
    {
      group: "REGULATORY INTELLIGENCE",
      items: [
        { id: "AI compliance", label: "Document Compliance", icon: ShieldCheck },
        { id: "Notifications", label: "Email Dispatch Audit", icon: Mail }
      ]
    },
    {
      group: "GOVERNANCE & SYSTEM",
      items: [
        { id: "Users", label: "Reviewers & Users", icon: Users },
        { id: "Settings", label: "Infrastructure Topology", icon: Server }
      ]
    }
  ];

  return (
    <div className="shell">
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Brand Header */}
        <div className="brand">
          <div className="brand-icon">
            <Shield size={22} strokeWidth={2.4} />
          </div>
          <div>
            <b>aicte<span style={{ color: "#60a5fa" }}>flow</span></b>
            <small>STATUTORY APPROVAL BUREAU</small>
          </div>
        </div>

        {/* Workspace Card */}
        <div className="workspace">
          <div className="ws-title">
            <Building2 size={16} color="#60a5fa" />
            <span>AICTE HQ Bureau</span>
          </div>
          <small>
            {currentUser ? (
              <span style={{ color: "#93c5fd", fontWeight: 600 }}>
                ● {currentUser.role} Scope
              </span>
            ) : (
              "Public Access Portal"
            )}
          </small>
        </div>

        {/* Navigation Groups */}
        {navGroups.map(({ group, items }) => (
          <div key={group} style={{ marginBottom: 10 }}>
            <div className="nav-label">{group}</div>
            {items.map((item) => {
              const IconComponent = item.icon;
              const isActive = nav === item.id;
              return (
                <button
                  key={item.id}
                  className={`nav-item ${isActive ? "active" : ""}`}
                  onClick={() => setNav(item.id)}
                >
                  <div className="nav-item-inner">
                    <IconComponent size={16} strokeWidth={isActive ? 2.2 : 1.8} />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && item.count !== null && (
                    <span className="nav-badge">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* User Card at Bottom */}
        <div className="sidebar-bottom">
          {currentUser ? (
            <div className="user-card-mini">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 700,
                      fontSize: 12,
                      color: "#fff"
                    }}
                  >
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12, color: "#fff" }}>{currentUser.name}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>{currentUser.role}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign out"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 6,
                    padding: "5px 7px",
                    color: "#cbd5e1",
                    display: "flex",
                    alignItems: "center"
                  }}
                >
                  <LogOut size={13} />
                </button>
              </div>
            </div>
          ) : (
            <div>
              <button
                type="button"
                className="btn primary"
                style={{ width: "100%", fontSize: 12, padding: "10px" }}
                onClick={() => setIsAuthOpen(true)}
              >
                <LogIn size={15} />
                Sign In / Switch Role
              </button>
              <small style={{ textAlign: "center", marginTop: 6, display: "block" }}>
                Demo credentials available
              </small>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <span className="breadcrumb-tag">AICTE Portal</span>
            <ChevronRight size={14} color="#94a3b8" />
            <span className="breadcrumb-current">{nav}</span>
          </div>

          <div className="topbar-right">
            {/* MongoDB Connection Status Indicator */}
            <span className={`tag ${connected ? "success" : "danger"}`}>
              <span className={`pulse-dot ${connected ? "online" : "offline"}`} />
              {connected ? "MONGODB ATLAS CONNECTED" : "BACKEND OFFLINE"}
            </span>

            {/* Quick File Action */}
            <button
              className="btn primary"
              onClick={() => setIsCreateOpen(true)}
              style={{ padding: "8px 14px" }}
            >
              <Plus size={15} strokeWidth={2.4} />
              <span>File Application</span>
            </button>

            {/* Auth Profile Pill */}
            {currentUser ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 10px 4px 6px",
                  borderRadius: 20,
                  background: "#f1f5f9",
                  border: "1px solid var(--line)"
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "#2563eb",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 11,
                    display: "grid",
                    placeItems: "center"
                  }}
                >
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>
                  {currentUser.name}
                </span>
                <span
                  className={`status ${
                    currentUser.role === "Administrator" ? "red" : currentUser.role === "Reviewer" ? "blue" : "green"
                  }`}
                  style={{ padding: "2px 8px", fontSize: 10 }}
                >
                  {currentUser.role}
                </span>
              </div>
            ) : (
              <button
                className="btn"
                onClick={() => setIsAuthOpen(true)}
                style={{ padding: "8px 14px" }}
              >
                <LogIn size={14} />
                Sign In
              </button>
            )}
          </div>
        </header>

        {/* Content Views */}
        <div className="content">
          {nav === "Overview" && (
            <DashboardView
              stats={stats}
              recentApps={recentApps}
              connected={connected}
              loading={loading}
              error={error}
              onSelectApp={(id) => setSelectedAppId(id)}
              onNewApp={() => setIsCreateOpen(true)}
              onNavigate={(v) => setNav(v)}
              onRefresh={() => setRefreshKey((k) => k + 1)}
            />
          )}

          {nav === "Applications" && (
            <ApplicationsView
              onSelectApp={(id) => setSelectedAppId(id)}
              onNewApp={() => setIsCreateOpen(true)}
              refreshKey={refreshKey}
            />
          )}

          {nav === "AI compliance" && (
            <ComplianceView
              onSelectApp={(id, docTypeOrTab) => {
                setSelectedAppId(id);
                if (docTypeOrTab === "documents" || docTypeOrTab === "overview" || docTypeOrTab === "compliance") {
                  setSelectedTab(docTypeOrTab);
                  setSelectedDocType(null);
                } else if (docTypeOrTab) {
                  setSelectedTab("documents");
                  setSelectedDocType(docTypeOrTab);
                } else {
                  setSelectedTab("overview");
                  setSelectedDocType(null);
                }
              }}
            />
          )}

          {nav === "Notifications" && (
            <NotificationsView />
          )}

          {nav === "Users" && (
            <UsersView currentUser={currentUser} notify={notify} />
          )}

          {nav === "Settings" && (
            <SettingsView currentUser={currentUser} onLogout={handleLogout} />
          )}

          {/* Footer */}
          <footer className="footer">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Shield size={14} color="#64748b" />
              <span>© 2026 All India Council for Technical Education (AICTE) · Approval Workflow Automation Platform</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span>Database: <b>aicte_workflow</b> (MongoDB Atlas)</span>
              <span>Backend API: <b>FastAPI v3.12</b></span>
            </div>
          </footer>
        </div>
      </main>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          notify(`Welcome back, ${user.name} (${user.role})!`);
          setRefreshKey((k) => k + 1);
        }}
      />

      <CreateApplicationModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleAppCreated}
        currentUser={currentUser}
      />

      <ApplicationDetailModal
        appId={selectedAppId}
        initialTab={selectedTab}
        initialDocType={selectedDocType}
        isOpen={Boolean(selectedAppId)}
        onClose={() => {
          setSelectedAppId(null);
          setSelectedDocType(null);
        }}
        currentUser={currentUser}
        onUpdated={() => setRefreshKey((k) => k + 1)}
        notify={notify}
      />

      {/* Floating Modern Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#0f172a",
            color: "#ffffff",
            padding: "14px 20px",
            borderRadius: 14,
            fontSize: 13,
            boxShadow: "0 12px 35px rgba(0,0,0,0.25)",
            zIndex: 1000,
            borderLeft: "4px solid #3b82f6",
            display: "flex",
            alignItems: "center",
            gap: 12,
            animation: "fadeIn 0.2s ease"
          }}
        >
          <Sparkles size={18} color="#60a5fa" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
