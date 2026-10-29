"use client";
import { useState, useRef, useEffect } from "react";
import { Shield, Sparkles } from "lucide-react";

export const THEMES = [
  {
    id: "tiranga",
    name: "Tiranga Executive",
    description: "Official Statutory Theme · Saffron, Navy & Emerald",
    icon: Shield,
    previewBg: "#070e1c",
    previewAccent: "#f97316"
  }
];

export default function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="theme-switcher-container" ref={dropdownRef}>
      <button
        type="button"
        className="theme-switcher-btn"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Statutory Theme: Tiranga Executive"
        title="Official Statutory Theme: Tiranga Executive (Indian Saffron, Navy & Emerald)"
      >
        <span className="tricolor-dots">
          <span className="tricolor-dot-saffron" />
          <span className="tricolor-dot-white" />
          <span className="tricolor-dot-green" />
        </span>
        <span className="theme-switcher-name">🇮🇳 Tiranga Executive</span>
      </button>

      {open && (
        <div className="theme-dropdown-menu" style={{ width: 280 }}>
          <div className="theme-dropdown-header">
            <span>Official Regulatory Theme</span>
          </div>
          <div style={{ padding: "10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #f97316 0%, #1e40af 50%, #059669 100%)",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "0 0 12px rgba(249, 115, 22, 0.4)",
                  color: "#fff"
                }}
              >
                <Shield size={16} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)" }}>Tiranga Executive</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>AICTE Bureau Standard Design</div>
              </div>
            </div>
            <p style={{ fontSize: 11.5, color: "var(--ink-secondary)", margin: "0 0 10px", lineHeight: 1.4 }}>
              Statutory regulatory portal theme inspired by the Indian National Tricolor with Deep Saffron, Ashoka Navy, and Emerald Green accents.
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(249, 115, 22, 0.2)", color: "#fb923c", border: "1px solid rgba(249, 115, 22, 0.4)" }}>
                #F97316 Saffron
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(56, 189, 248, 0.18)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.4)" }}>
                #0284C7 Navy
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(16, 185, 129, 0.18)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.4)" }}>
                #10B981 Emerald
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
