"use client";
import { Search, Bell, ChevronDown } from "lucide-react";

export function Header({ title, subtitle }: { title?: string; subtitle?: string }) {
  return (
    <header style={{
      height: "56px",
      borderBottom: "1px solid var(--cv-border)",
      background: "rgba(12,14,20,0.85)",
      backdropFilter: "blur(12px)",
      display: "flex",
      alignItems: "center",
      padding: "0 1.5rem",
      gap: "1rem",
      flexShrink: 0,
    }}>
      {title ? (
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--cv-text)", fontFamily: "'Space Grotesk',sans-serif", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {title}
          </h1>
          {subtitle && <p style={{ fontSize: "0.75rem", color: "var(--cv-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subtitle}</p>}
        </div>
      ) : (
        <div style={{ flex: 1 }} />
      )}

      {/* Search */}
      <div style={{ position: "relative", width: "240px" }}>
        <Search style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", width: "13px", height: "13px", color: "var(--cv-muted)" }} />
        <input
          placeholder="Search players, teams…"
          style={{
            width: "100%",
            background: "var(--cv-card)",
            border: "1px solid var(--cv-border)",
            borderRadius: "8px",
            padding: "0.4rem 0.75rem 0.4rem 2rem",
            fontSize: "0.8125rem",
            color: "var(--cv-text)",
            outline: "none",
            transition: "border-color 150ms ease",
          }}
          onFocus={(e) => (e.target.style.borderColor = "rgba(249,115,22,0.5)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--cv-border)")}
        />
      </div>

      {/* Bell */}
      <button
        style={{
          position: "relative",
          padding: "0.5rem",
          borderRadius: "8px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--cv-muted)",
          transition: "background 150ms ease, color 150ms ease",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--cv-card)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--cv-text)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--cv-muted)"; }}
      >
        <Bell style={{ width: "16px", height: "16px" }} />
        <span style={{ position: "absolute", top: "6px", right: "6px", width: "6px", height: "6px", borderRadius: "50%", background: "var(--cv-orange)" }} />
      </button>

      {/* Avatar */}
      <button
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.25rem 0.375rem 0.25rem 0.5rem",
          borderRadius: "8px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          transition: "background 150ms ease",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--cv-card)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
      >
        <div style={{
          width: "24px", height: "24px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, var(--cv-orange), var(--cv-purple))",
        }} />
        <ChevronDown style={{ width: "12px", height: "12px", color: "var(--cv-muted)" }} />
      </button>
    </header>
  );
}
