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
  Shield,
  Menu,
  X,
  Search,
  ExternalLink
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

  // On-demand slide drawer state ("Come and go")
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Permanent Statutory Color Theme: Tiranga Executive
  const theme = "tiranga";

  useEffect(() => {
    localStorage.setItem("aicte_portal_theme", "tiranga");
    document.documentElement.setAttribute("data-theme", "tiranga");
  }, []);

  // Keyboard shortcut listener: Ctrl+B or Cmd+B to toggle sidebar; Escape to close
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
      if (e.key === "Escape" && sidebarOpen) {
        setSidebarOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sidebarOpen]);

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
      setError(`Cannot connect to backend: ${err.message}. Ensure FastAPI server is running.`);
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

  async function handleQuickLogin(email, password) {
    try {
      const res = await api.login(email, password);
      setStoredAuth(res.token, res.user);
      setCurrentUser(res.user);
      notify(`Session switched to ${res.user.name} (${res.user.role})`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      notify(`Switch failed: ${err.message}`);
    }
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
        { id: "Notifications", label: "Dispatch & Email Audit", icon: Mail }
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
    <div className="shell" data-theme={theme}>
      {/* On-Demand Slide Drawer Overlay ("Come and Go") */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay active"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        {/* Brand Header */}
        <div className="brand">
          <div className="brand-icon">
            <Shield size={22} strokeWidth={2.4} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>aicte<span style={{ color: "var(--primary)" }}>flow</span></b>
            <small>STATUTORY APPROVAL BUREAU</small>
          </div>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
            title="Close drawer (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Workspace Card */}
        <div className="workspace">
          <div className="ws-title">
            <Building2 size={16} color="var(--primary)" />
            <span>AICTE HQ Bureau</span>
          </div>
          <small>
            {currentUser ? (
              <span style={{ color: "var(--primary)", fontWeight: 700 }}>
                ● {currentUser.role} Active
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
                  onClick={() => {
                    setNav(item.id);
                    setSidebarOpen(false);
                  }}
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
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 800,
                      fontSize: 12,
                      color: "#fff",
                      boxShadow: "0 2px 8px rgba(37, 99, 235, 0.4)"
                    }}
                  >
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12.5, color: "#fff", lineHeight: 1.2 }}>{currentUser.name}</div>
                    <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 2 }}>{currentUser.role}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign out"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8,
                    padding: "6px 8px",
                    color: "#cbd5e1",
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer"
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
                style={{ width: "100%", fontSize: 12.5, padding: "10px" }}
                onClick={() => {
                  setIsAuthOpen(true);
                  setSidebarOpen(false);
                }}
              >
                <LogIn size={15} />
                <span>Sign In / Switch Role</span>
              </button>
              <small style={{ textAlign: "center", marginTop: 6, display: "block" }}>
                1-Click Demo Personas Available
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
            {/* Sidebar On-Demand Toggle ("Come and Go") */}
            <button
              type="button"
              className="sidebar-toggle-btn"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label="Toggle Navigation Drawer"
              title="Toggle Navigation (Ctrl+B)"
            >
              <Menu size={18} strokeWidth={2.2} />
              <span className="sidebar-toggle-text">Menu</span>
            </button>

            {/* Portal Brand Emblem */}
            <div className="topbar-brand">
              <div className="topbar-brand-icon">
                <Shield size={16} strokeWidth={2.4} />
              </div>
              <span className="topbar-brand-name">
                aicte<span style={{ color: "var(--primary)" }}>flow</span>
              </span>
              <span className="topbar-brand-badge">STATUTORY</span>
            </div>

            <div className="breadcrumb-nav">
              <ChevronRight size={14} color="var(--muted-light)" />
              <span className="breadcrumb-current">{nav}</span>
            </div>
          </div>

          <div className="topbar-right">
            {/* MongoDB Connection Status Indicator */}
            <span className={`tag ${connected ? "success" : "danger"}`}>
              <span className={`pulse-dot ${connected ? "online" : "offline"}`} />
              <span className="tag-text-desktop">{connected ? "MONGODB ATLAS CONNECTED" : "BACKEND OFFLINE"}</span>
              <span className="tag-text-mobile">{connected ? "CONNECTED" : "OFFLINE"}</span>
            </span>

            {/* Quick File Action */}
            <button
              className="btn primary topbar-action-btn"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus size={15} strokeWidth={2.4} />
              <span className="btn-text-desktop">File Application</span>
              <span className="btn-text-mobile">New</span>
            </button>

            {/* Auth Profile Pill */}
            {currentUser ? (
              <div
                className="topbar-user-pill"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 12px 4px 6px",
                  borderRadius: 24,
                  background: "var(--panel-card)",
                  border: "1px solid var(--line)"
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: "var(--primary)",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 11,
                    display: "grid",
                    placeItems: "center"
                  }}
                >
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
                </div>
                <span className="topbar-user-name" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>
                  {currentUser.name}
                </span>
                <span
                  className={`status ${
                    currentUser.role === "Administrator" ? "red" : currentUser.role === "Reviewer" ? "blue" : "green"
                  } topbar-user-role`}
                  style={{ padding: "2px 8px", fontSize: 10.5 }}
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
                <span className="btn-text-desktop">Sign In</span>
                <span className="btn-text-mobile">Login</span>
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
              currentUser={currentUser}
              onQuickLogin={handleQuickLogin}
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
              <span>© 2026 All India Council for Technical Education (AICTE) · Statutory Approval Workflow Automation Platform</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span>Cluster: <b>aicte_workflow</b> (MongoDB Atlas)</span>
              <span>FastAPI Microservice: <b>v3.12 Engine</b></span>
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
        <div className="toast-container">
          <div className="toast">
            <Sparkles size={18} color="#60a5fa" style={{ flexShrink: 0 }} />
            <span>{toast}</span>
          </div>
        </div>
      )}
    </div>
  );
}
