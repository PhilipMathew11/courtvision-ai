"use client";
import { clsx } from "clsx";
import { ReactNode, ButtonHTMLAttributes } from "react";

// ── Button ──────────────────────────────────────────────
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "orange";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function Button({ variant = "primary", size = "md", className, children, ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed";
  const sizeClass = size === "sm" ? "px-2.5 py-1.5 text-xs" : size === "lg" ? "px-6 py-3 text-base" : "px-4 py-2 text-sm";
  const styles: Record<string, React.CSSProperties> = {
    primary:   { background: "var(--cv-orange)", color: "white" },
    secondary: { background: "transparent", color: "var(--cv-text)", border: "1px solid var(--cv-border-bright)" },
    ghost:     { background: "transparent", color: "var(--cv-muted)" },
    danger:    { background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" },
    orange:    { background: "rgba(249,115,22,0.1)", color: "var(--cv-orange)", border: "1px solid rgba(249,115,22,0.2)" },
  };
  return (
    <button className={clsx(base, sizeClass, className)} style={styles[variant]} {...props}>
      {children}
    </button>
  );
}

// ── Badge ────────────────────────────────────────────────
interface BadgeProps { children: ReactNode; variant?: "default" | "live" | "orange" | "green" | "red" | "purple"; className?: string; }

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variantClass = {
    default: "badge badge-default",
    live:    "badge badge-live",
    green:   "badge badge-live",
    orange:  "badge badge-ml",
    purple:  "badge badge-ai",
    red:     "badge",
  }[variant] ?? "badge badge-default";

  return (
    <span className={clsx(variantClass, className)}>
      {variant === "live" && <span className="live-dot" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10B981", display: "inline-block" }} />}
      {children}
    </span>
  );
}

// ── Card ─────────────────────────────────────────────────
interface CardProps { children: ReactNode; className?: string; hover?: boolean; glow?: boolean; onClick?: () => void; }

export function Card({ children, className, hover, glow, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        hover ? "module-card" : "stat-card",
        glow && "glow-orange",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────
export function Divider({ className }: { className?: string }) {
  return <div className={clsx("h-px", className)} style={{ background: "var(--cv-border)" }} />;
}

// ── Input ─────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
}
export function Input({ icon, className, style, ...props }: InputProps) {
  return (
    <div style={{ position: "relative" }}>
      {icon && <div style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--cv-muted)" }}>{icon}</div>}
      <input
        className={className}
        style={{
          width: "100%",
          background: "var(--cv-card)",
          border: "1px solid var(--cv-border)",
          borderRadius: "8px",
          padding: icon ? "0.5rem 1rem 0.5rem 2.25rem" : "0.5rem 1rem",
          fontSize: "0.8125rem",
          color: "var(--cv-text)",
          outline: "none",
          ...style,
        }}
        onFocus={(e) => { e.target.style.borderColor = "rgba(249,115,22,0.5)"; }}
        onBlur={(e) => { e.target.style.borderColor = "var(--cv-border)"; }}
        {...props}
      />
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("skeleton rounded-lg", className)} />;
}

// ── Section Header ────────────────────────────────────────
interface SectionHeaderProps { title: string; subtitle?: string; action?: ReactNode; }
export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem" }}>
      <div>
        <h2 className="font-display" style={{ fontSize: "1.0625rem", fontWeight: 600, color: "var(--cv-text)" }}>{title}</h2>
        {subtitle && <p style={{ fontSize: "0.8125rem", color: "var(--cv-muted)", marginTop: "0.25rem" }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ── Stat ─────────────────────────────────────────────────
interface StatProps { label: string; value: string | number; sub?: string; accent?: "blue" | "orange" | "green" | "purple"; }
export function Stat({ label, value, sub, accent = "orange" }: StatProps) {
  const colors = { blue: "#3B82F6", orange: "#F97316", green: "#10B981", purple: "#8B5CF6" };
  return (
    <div>
      <p style={{ fontSize: "0.6875rem", color: "var(--cv-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.25rem" }}>{label}</p>
      <p className="font-stat" style={{ fontSize: "1.5rem", fontWeight: 700, color: colors[accent] }}>{value}</p>
      {sub && <p style={{ fontSize: "0.75rem", color: "var(--cv-muted)", marginTop: "0.2rem" }}>{sub}</p>}
    </div>
  );
}
