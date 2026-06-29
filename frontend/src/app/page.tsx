"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  BarChart2, Brain, Radar, Dna, FlaskConical,
  ArrowLeftRight, Zap, Target, MessageSquare,
  TrendingUp, Activity, Users, ChevronRight,
  Send, Flame, Star, ArrowUp, ArrowDown, Minus,
  Eye, Sparkles,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { PageWrapper } from "@/components/layout/PageWrapper";

const modules = [
  { name: "Analytics Hub",     href: "/analytics",   icon: BarChart2,      badge: "Live", badgeClass: "badge-live",  color: "#3B82F6", description: "Live scores, standings, and advanced stats." },
  { name: "Coach AI",          href: "/coach",        icon: Brain,          badge: "AI",   badgeClass: "badge-ai",    color: "#8B5CF6", description: "Ask why any team won, lost, or underperformed." },
  { name: "Scout AI",          href: "/scout",        icon: Radar,          badge: "AI",   badgeClass: "badge-ai",    color: "#8B5CF6", description: "Find players that match your ideal profile." },
  { name: "Player DNA",        href: "/player-dna",   icon: Dna,            badge: null,   badgeClass: "",            color: "#F97316", description: "Basketball fingerprints across 11 dimensions." },
  { name: "Prediction Lab",    href: "/predictions",  icon: FlaskConical,   badge: "ML",   badgeClass: "badge-ml",    color: "#10B981", description: "Win probability and performance forecasts." },
  { name: "Trade Lab",         href: "/trade",        icon: ArrowLeftRight, badge: null,   badgeClass: "",            color: "#6366F1", description: "Simulate trades and evaluate championship windows." },
  { name: "Fantasy Assistant", href: "/fantasy",      icon: Zap,            badge: "ML",   badgeClass: "badge-ml",    color: "#F59E0B", description: "ML-powered sleepers, busts, and lineup picks." },
  { name: "Shot IQ",           href: "/shot-iq",      icon: Target,         badge: null,   badgeClass: "",            color: "#EC4899", description: "Shot quality scoring and expected value analysis." },
  { name: "AI Chat",           href: "/chat",         icon: MessageSquare,  badge: "AI",   badgeClass: "badge-ai",    color: "#8B5CF6", description: "RAG-grounded basketball Q&A, backed by real data." },
];

const liveGames = [
  { home: "BOS", away: "MIA", homeScore: 87, awayScore: 81, quarter: "Q3", time: "4:22", homeWin: 71 },
  { home: "LAL", away: "GSW", homeScore: 64, awayScore: 71, quarter: "Q2", time: "8:05", homeWin: 38 },
  { home: "DEN", away: "PHX", homeScore: 102, awayScore: 99, quarter: "Q4", time: "1:47", homeWin: 58 },
];

const trendingPlayers = [
  { name: "Jayson Tatum",    team: "BOS", pts: 34.2, trend: "up",   pct: "+12%", rank: 1 },
  { name: "Nikola Jokic",    team: "DEN", pts: 26.8, trend: "up",   pct: "+4%",  rank: 2 },
  { name: "Luka Doncic",     team: "DAL", pts: 31.1, trend: "down", pct: "-3%",  rank: 3 },
  { name: "Shai Gilgeous",   team: "OKC", pts: 30.5, trend: "up",   pct: "+8%",  rank: 4 },
  { name: "Anthony Edwards", team: "MIN", pts: 27.9, trend: "same", pct: "0%",   rank: 5 },
];

const momentumData = [
  { min: "0",  bos: 2,  mia: 0  },
  { min: "4",  bos: 8,  mia: 5  },
  { min: "8",  bos: 14, mia: 12 },
  { min: "12", bos: 19, mia: 22 },
  { min: "Q2", bos: 28, mia: 31 },
  { min: "20", bos: 38, mia: 39 },
  { min: "24", bos: 47, mia: 44 },
  { min: "Q3", bos: 59, mia: 56 },
  { min: "32", bos: 71, mia: 65 },
  { min: "36", bos: 87, mia: 81 },
];

const aiPrompts = [
  "Why did Boston dominate Q3?",
  "Compare Jokic and Giannis",
  "Who's underrated this season?",
  "Best 3-and-D wings in the league",
  "Explain drop coverage",
  "Lakers trade deadline targets",
];

const aiInsight = {
  title: "Boston's Q3 Dominance",
  body: "The Celtics outscored Miami 28–18 in Q3 primarily through transition offense (8 fast-break points) and Tatum's mid-range isolation game (6/8 FG). Miami's zone defense collapsed when Haywood stopped rotating on the weak side.",
  confidence: 94,
  tags: ["Game Analysis", "Tactics", "Celtics"],
};

const quickStats = [
  { label: "Active Players",  value: "450", suffix: "+", icon: Users,      color: "#F97316" },
  { label: "Games Analyzed",  value: "1230", suffix: "", icon: Activity,   color: "#10B981" },
  { label: "Prediction Acc.", value: "98.2", suffix: "%", icon: TrendingUp, color: "#3B82F6" },
];

function useCounter(target: number, duration = 1400) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const tick = () => {
          const elapsed = Date.now() - start;
          const p = Math.min(elapsed / duration, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          setCount(Math.round(ease * target));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, duration]);
  return { count, ref };
}

function AnimatedStat({ value, suffix, label, icon: Icon, color }: {
  value: string; suffix: string; label: string;
  icon: React.ComponentType<{ style?: React.CSSProperties }>; color: string;
}) {
  const numVal = parseFloat(value.replace(",", ""));
  const { count, ref } = useCounter(numVal);
  const display = value.includes(".") ? count.toFixed(1) : count.toLocaleString();
  return (
    <div ref={ref} className="stat-card" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px" }}>
      <div style={{ padding: 8, borderRadius: 8, background: `${color}18`, border: `1px solid ${color}28`, flexShrink: 0 }}>
        <Icon style={{ width: 18, height: 18, color }} />
      </div>
      <div>
        <p className="font-stat" style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1.1 }}>
          {display}{suffix}
        </p>
        <p style={{ fontSize: 12, color: "var(--cv-muted)", marginTop: 2 }}>{label}</p>
      </div>
    </div>
  );
}

function WinProbBar({ home, away, homeWin }: { home: string; away: string; homeWin: number }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 200); return () => clearTimeout(t); }, []);
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "#3B82F6", fontWeight: 600 }}>{home} {homeWin}%</span>
        <span style={{ fontSize: 11, color: "var(--cv-muted)", fontWeight: 600 }}>{away} {100 - homeWin}%</span>
      </div>
      <div className="win-prob-track">
        <div style={{
          height: "100%", borderRadius: 6,
          background: "linear-gradient(90deg, #3B82F6, #60A5FA)",
          width: animated ? `${homeWin}%` : "0%",
          transition: "width 1.1s cubic-bezier(0.16,1,0.3,1)",
        }} />
      </div>
    </div>
  );
}

function AnimatedCourt() {
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.10, pointerEvents: "none" }}
      viewBox="0 0 1000 340"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <g stroke="#F97316" strokeWidth="1.6" fill="none" strokeLinecap="round">
        <rect x="16" y="12" width="968" height="316" rx="4" className="court-draw" />
        <line x1="500" y1="12" x2="500" y2="328" className="court-draw court-draw-delay" />
        <circle cx="500" cy="170" r="56" className="court-draw court-draw-delay" />
        <circle cx="500" cy="170" r="3" fill="#F97316" className="court-draw" />
        <rect x="16" y="100" width="165" height="140" className="court-draw court-draw-delay2" />
        <path d="M 16 60 A 218 218 0 0 1 16 280" className="court-draw court-draw-delay2" />
        <rect x="819" y="100" width="165" height="140" className="court-draw court-draw-delay2" />
        <path d="M 984 60 A 218 218 0 0 0 984 280" className="court-draw court-draw-delay2" />
        <path d="M 100 280 Q 300 80 450 195" className="shot-arc" stroke="#F97316" strokeWidth="1" strokeDasharray="6 4" style={{ animationDelay: "1.5s" }} />
        <path d="M 160 290 Q 340 70 500 170" className="shot-arc" stroke="#F59E0B" strokeWidth="1" strokeDasharray="4 6" style={{ animationDelay: "2s", opacity: 0.6 }} />
      </g>
      <g opacity="0.5">
        <circle cx="700" cy="170" r="14" fill="#F97316" opacity="0.3" className="heat-dot" style={{ animationDelay: "0s" }} />
        <circle cx="780" cy="130" r="9"  fill="#F59E0B" opacity="0.3" className="heat-dot" style={{ animationDelay: "0.4s" }} />
        <circle cx="750" cy="210" r="11" fill="#EF4444" opacity="0.25" className="heat-dot" style={{ animationDelay: "0.8s" }} />
        <circle cx="840" cy="160" r="7"  fill="#F97316" opacity="0.2" className="heat-dot" style={{ animationDelay: "1.2s" }} />
      </g>
    </svg>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#161B24", border: "1px solid #2A3750", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
      <p style={{ color: "var(--cv-muted)", marginBottom: 4 }}>Min {label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.dataKey === "bos" ? "#3B82F6" : "#EF4444", fontWeight: 600 }}>
          {p.dataKey.toUpperCase()}: {p.value}
        </p>
      ))}
    </div>
  );
}

export default function HomePage() {
  const [aiQuery, setAiQuery] = useState("");
  const [activePrompt, setActivePrompt] = useState<string | null>(null);

  return (
    <PageWrapper>
      {/* ── HERO ── */}
      <div style={{
        position: "relative", borderRadius: 18, overflow: "hidden",
        border: "1px solid rgba(249,115,22,0.18)", background: "var(--cv-card)",
        padding: "2.25rem 2rem 2rem", minHeight: 260,
      }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 22px, rgba(249,115,22,0.03) 22px, rgba(249,115,22,0.03) 23px)" }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent 5%, #F97316 35%, #EA6A0A 65%, transparent 95%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 55% 90% at 65% 50%, rgba(249,115,22,0.08) 0%, transparent 65%)", pointerEvents: "none" }} />
        <AnimatedCourt />
        <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1fr auto", gap: 32, alignItems: "center" }}>
          <div style={{ maxWidth: 480 }}>
            <span className="badge badge-live" style={{ display: "inline-flex", marginBottom: 16 }}>
              <span className="live-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", display: "inline-block" }} />
              Season Active · 3 Games Live
            </span>
            <h1 className="font-display" style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)", fontWeight: 700, lineHeight: 1.2, color: "#F0F2F7", marginBottom: 14 }}>
              Basketball Intelligence,<br />
              <span className="gradient-text">Beyond the Box Score</span>
            </h1>
            <p style={{ color: "var(--cv-muted)", fontSize: 15, marginBottom: 24, lineHeight: 1.7, maxWidth: 400 }}>
              Every platform tells you <strong style={{ color: "#F0F2F7" }}>what</strong> happened.
              CourtVision AI explains <strong style={{ color: "#F97316" }}>why</strong>.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/coach" className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Brain style={{ width: 15, height: 15 }} /> Ask Coach AI
              </Link>
              <Link href="/analytics" className="btn-secondary">View Analytics</Link>
            </div>
          </div>

          {/* Live game card */}
          <div style={{ background: "rgba(8,9,13,0.7)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 14, padding: "18px 20px", minWidth: 220, backdropFilter: "blur(8px)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#EF4444", display: "inline-block" }} className="live-dot" />
              <span style={{ fontSize: 11, color: "#EF4444", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Live · Q3 4:22</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--cv-text)", marginBottom: 4 }}>BOS</p>
                <p className="font-stat" style={{ fontSize: 32, fontWeight: 800, color: "#3B82F6", lineHeight: 1 }}>87</p>
              </div>
              <p style={{ fontSize: 10, color: "var(--cv-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>vs</p>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--cv-text)", marginBottom: 4 }}>MIA</p>
                <p className="font-stat" style={{ fontSize: 32, fontWeight: 800, color: "var(--cv-muted)", lineHeight: 1 }}>81</p>
              </div>
            </div>
            <WinProbBar home="BOS" away="MIA" homeWin={71} />
            <div style={{ marginTop: 12, padding: "8px 10px", background: "rgba(249,115,22,0.08)", borderRadius: 8, border: "1px solid rgba(249,115,22,0.15)" }}>
              <p style={{ fontSize: 11, color: "var(--cv-orange)", fontWeight: 600, marginBottom: 2 }}>
                <Sparkles style={{ width: 11, height: 11, display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                AI Insight
              </p>
              <p style={{ fontSize: 12, color: "var(--cv-muted)", lineHeight: 1.4 }}>
                Tatum's mid-range is 6/8 FG — Miami's zone is breaking down.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── QUICK STATS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {quickStats.map((s) => <AnimatedStat key={s.label} {...s} />)}
      </div>

      {/* ── LIVE GAMES + MOMENTUM ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 16 }}>
        <div className="insight-card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <p className="eyebrow">Tonight</p>
              <h3 className="font-display" style={{ fontSize: 15, fontWeight: 600, color: "var(--cv-text)" }}>Live Games</h3>
            </div>
            <span className="badge badge-live">
              <span className="live-dot" style={{ width: 5, height: 5, borderRadius: "50%", background: "#10B981", display: "inline-block" }} />
              3 Live
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {liveGames.map((g, i) => (
              <div key={i} className="live-game-card" style={{ minWidth: "unset" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: "#EF4444", fontWeight: 700 }}>{g.quarter} · {g.time}</span>
                  <Eye style={{ width: 11, height: 11, color: "var(--cv-muted)" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className="font-display" style={{ fontSize: 14, fontWeight: 700, color: "var(--cv-text)" }}>{g.home}</span>
                  <div>
                    <span className="font-stat" style={{ fontSize: 17, fontWeight: 800, color: g.homeScore > g.awayScore ? "#10B981" : "var(--cv-muted)" }}>{g.homeScore}</span>
                    <span style={{ color: "var(--cv-subtle)", margin: "0 6px", fontSize: 12 }}>–</span>
                    <span className="font-stat" style={{ fontSize: 17, fontWeight: 800, color: g.awayScore > g.homeScore ? "#10B981" : "var(--cv-muted)" }}>{g.awayScore}</span>
                  </div>
                  <span className="font-display" style={{ fontSize: 14, fontWeight: 700, color: "var(--cv-text)" }}>{g.away}</span>
                </div>
                <WinProbBar home={g.home} away={g.away} homeWin={g.homeWin} />
              </div>
            ))}
          </div>
        </div>

        <div className="insight-card" style={{ padding: 18 }}>
          <div style={{ marginBottom: 16 }}>
            <p className="eyebrow">BOS vs MIA · Live</p>
            <h3 className="font-display" style={{ fontSize: 15, fontWeight: 600, color: "var(--cv-text)" }}>Score Momentum</h3>
          </div>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={momentumData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="bosGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="miaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="min" tick={{ fontSize: 10, fill: "#5A6480" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#5A6480" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="bos" stroke="#3B82F6" strokeWidth={2} fill="url(#bosGrad)" dot={false} animationDuration={1200} />
                <Area type="monotone" dataKey="mia" stroke="#EF4444" strokeWidth={2} fill="url(#miaGrad)" dot={false} animationDuration={1400} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
            {[{ color: "#3B82F6", label: "BOS" }, { color: "#EF4444", label: "MIA" }].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 2, background: l.color, borderRadius: 2 }} />
                <span style={{ fontSize: 12, color: "var(--cv-muted)" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── COACH AI ── */}
      <div style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.06) 0%, rgba(139,92,246,0.04) 100%)", border: "1px solid rgba(249,115,22,0.18)", borderRadius: 16, padding: 24, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: 200, height: "100%", background: "radial-gradient(ellipse at 100% 50%, rgba(139,92,246,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Brain style={{ width: 16, height: 16, color: "var(--cv-orange)" }} />
            <p className="eyebrow" style={{ margin: 0 }}>AI Intelligence</p>
          </div>
          <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: "var(--cv-text)", marginBottom: 6 }}>Ask Coach AI anything</h3>
          <p style={{ fontSize: 13, color: "var(--cv-muted)", marginBottom: 18 }}>Grounded in real stats. Every answer has a source.</p>
          <div className="ai-input-wrap" style={{ marginBottom: 14 }}>
            <Brain style={{ width: 16, height: 16, color: "var(--cv-orange)", flexShrink: 0 }} />
            <input value={aiQuery} onChange={(e) => setAiQuery(e.target.value)} placeholder="Why did Boston lose? Compare Jokic and Giannis..." />
            <Link href={`/chat${aiQuery ? `?q=${encodeURIComponent(aiQuery)}` : ""}`}>
              <button style={{ padding: "6px 12px", background: "var(--cv-orange)", border: "none", borderRadius: 7, color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}>
                <Send style={{ width: 13, height: 13 }} /> Ask
              </button>
            </Link>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {aiPrompts.map((p) => (
              <button key={p} className="prompt-chip" onClick={() => { setActivePrompt(p); setAiQuery(p); }}
                style={{ background: activePrompt === p ? "rgba(249,115,22,0.12)" : undefined, borderColor: activePrompt === p ? "rgba(249,115,22,0.5)" : undefined, color: activePrompt === p ? "var(--cv-text)" : undefined }}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── TRENDING + INSIGHT ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="insight-card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <p className="eyebrow">Right Now</p>
              <h3 className="font-display" style={{ fontSize: 15, fontWeight: 600, color: "var(--cv-text)" }}>Trending Players</h3>
            </div>
            <Flame style={{ width: 16, height: 16, color: "#F97316" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {trendingPlayers.map((p) => {
              const TrendIcon = p.trend === "up" ? ArrowUp : p.trend === "down" ? ArrowDown : Minus;
              const trendColor = p.trend === "up" ? "#10B981" : p.trend === "down" ? "#EF4444" : "var(--cv-muted)";
              const gradients = ["#F97316, #FB923C", "#8B5CF6, #A78BFA", "#3B82F6, #60A5FA", "#10B981, #34D399", "#F59E0B, #FCD34D"];
              return (
                <div key={p.name} className="trending-row">
                  <span className="font-stat" style={{ fontSize: 12, color: "var(--cv-subtle)", width: 16, flexShrink: 0 }}>{p.rank}</span>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${gradients[p.rank - 1]})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "white", flexShrink: 0 }}>
                    {p.name.split(" ").map(w => w[0]).join("")}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--cv-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                    <p style={{ fontSize: 11, color: "var(--cv-muted)" }}>{p.team} · {p.pts} PPG</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <TrendIcon style={{ width: 12, height: 12, color: trendColor }} />
                    <span style={{ fontSize: 11, color: trendColor, fontWeight: 600 }}>{p.pct}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="insight-card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <p className="eyebrow">AI Analysis</p>
              <h3 className="font-display" style={{ fontSize: 15, fontWeight: 600, color: "var(--cv-text)" }}>Insight of the Day</h3>
            </div>
            <Sparkles style={{ width: 16, height: 16, color: "#8B5CF6" }} />
          </div>
          <h4 className="font-display" style={{ fontSize: 15, fontWeight: 700, color: "var(--cv-text)", marginBottom: 8 }}>{aiInsight.title}</h4>
          <p style={{ fontSize: 13, color: "var(--cv-muted)", lineHeight: 1.65, marginBottom: 14 }}>{aiInsight.body}</p>
          <div style={{ background: "var(--cv-surface)", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "var(--cv-muted)" }}>Confidence Score</span>
              <span className="font-stat" style={{ fontSize: 12, color: "#10B981", fontWeight: 700 }}>{aiInsight.confidence}%</span>
            </div>
            <div className="win-prob-track">
              <div style={{ height: "100%", borderRadius: 6, background: "linear-gradient(90deg, #10B981, #34D399)", width: `${aiInsight.confidence}%`, transition: "width 1.2s cubic-bezier(0.16,1,0.3,1)" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {aiInsight.tags.map((tag) => (
              <span key={tag} style={{ padding: "3px 10px", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 100, fontSize: 11, color: "#8B5CF6", fontWeight: 600 }}>{tag}</span>
            ))}
          </div>
          <Link href="/coach" style={{ textDecoration: "none", display: "block" }}>
            <button style={{ width: "100%", padding: 8, background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 8, color: "#8B5CF6", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Deep dive with Coach AI →
            </button>
          </Link>
        </div>
      </div>

      {/* ── MODULES ── */}
      <div>
        <div style={{ marginBottom: 16 }}>
          <p className="eyebrow">Platform</p>
          <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: "var(--cv-text)" }}>Nine Intelligence Tools</h2>
          <p style={{ fontSize: 13, color: "var(--cv-muted)", marginTop: 4 }}>One unified platform for every basketball decision.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link key={mod.href} href={mod.href} style={{ textDecoration: "none" }}>
                <div className="module-card" style={{ height: "100%", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${mod.color}60, transparent)`, opacity: 0, transition: "opacity 200ms ease" }} className="module-top-line" />
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                    <div className="module-icon" style={{ padding: 8, borderRadius: 9, background: `${mod.color}14`, border: `1px solid ${mod.color}28` }}>
                      <Icon style={{ width: 16, height: 16, color: mod.color }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {mod.badge && <span className={`badge ${mod.badgeClass}`}>{mod.badge}</span>}
                      <ChevronRight className="module-arrow" style={{ width: 13, height: 13, color: "var(--cv-subtle)" }} />
                    </div>
                  </div>
                  <h3 className="module-name font-display" style={{ fontWeight: 600, fontSize: 15, color: "var(--cv-text)", marginBottom: 6 }}>{mod.name}</h3>
                  <p style={{ fontSize: 13, color: "var(--cv-muted)", lineHeight: 1.55, marginBottom: 14 }}>{mod.description}</p>
                  <div style={{ fontSize: 12, color: mod.color, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, opacity: 0.7 }} className="module-action">
                    <Star style={{ width: 11, height: 11 }} />
                    Open {mod.name.split(" ")[0]}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

    </PageWrapper>
  );
}