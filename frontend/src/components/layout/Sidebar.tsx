"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2, Brain, Radar, Dna, FlaskConical,
  ArrowLeftRight, Zap, Target, MessageSquare, Home,
} from "lucide-react";

const navItems = [
  { label: "Home",            href: "/",            icon: Home },
  { label: "Analytics Hub",   href: "/analytics",   icon: BarChart2 },
  { label: "Coach AI",        href: "/coach",       icon: Brain },
  { label: "Scout AI",        href: "/scout",       icon: Radar },
  { label: "Player DNA",      href: "/player-dna",  icon: Dna },
  { label: "Prediction Lab",  href: "/predictions", icon: FlaskConical },
  { label: "Trade Lab",       href: "/trade",       icon: ArrowLeftRight },
  { label: "Fantasy",         href: "/fantasy",     icon: Zap },
  { label: "Shot IQ",         href: "/shot-iq",     icon: Target },
  { label: "AI Chat",         href: "/chat",        icon: MessageSquare },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: "220px",
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      borderRight: "1px solid var(--cv-border)",
      background: "var(--cv-surface)",
    }}>
      {/* Logo */}
      <div style={{
        height: "56px",
        display: "flex",
        alignItems: "center",
        padding: "0 1.25rem",
        borderBottom: "1px solid var(--cv-border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          {/* Basketball icon */}
          <div style={{
            width: "28px", height: "28px",
            borderRadius: "50%",
            background: "var(--cv-orange)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 14px rgba(249,115,22,0.4)",
            flexShrink: 0,
          }}>
            <svg viewBox="0 0 24 24" style={{ width: "16px", height: "16px", fill: "none", stroke: "rgba(0,0,0,0.6)", strokeWidth: "1.8" }}>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 3C12 3 9 7.5 9 12s3 9 3 9" />
              <path d="M12 3C12 3 15 7.5 15 12s-3 9-3 9" />
              <path d="M3 12h18" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--cv-text)", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              CourtVision
            </p>
            <p style={{ fontSize: "0.625rem", color: "var(--cv-orange)", lineHeight: 1.1, marginTop: "2px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
              AI PLATFORM
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "0.75rem 0.5rem", overflowY: "auto" }}>
        <p style={{ fontSize: "0.625rem", color: "var(--cv-muted)", textTransform: "uppercase", letterSpacing: "0.1em", padding: "0.25rem 0.75rem 0.5rem", fontWeight: 600 }}>
          Platform
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${active ? "active" : ""}`}
              style={{ marginBottom: "1px" }}
            >
              <Icon
                className="nav-icon"
                style={{ width: "16px", height: "16px", flexShrink: 0, color: active ? "var(--cv-orange)" : "var(--cv-subtle)" }}
              />
              <span>{item.label}</span>
              {active && (
                <div style={{ marginLeft: "auto", width: "5px", height: "5px", borderRadius: "50%", background: "var(--cv-orange)" }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "0.75rem", borderTop: "1px solid var(--cv-border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem 0.5rem" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--cv-green)", boxShadow: "0 0 6px rgba(16,185,129,0.6)" }} />
          <p style={{ fontSize: "0.6875rem", color: "var(--cv-muted)" }}>v0.1.0 — Phase 1</p>
        </div>
      </div>
    </aside>
  );
}
