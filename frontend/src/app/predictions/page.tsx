"use client";
import { useState, useEffect } from "react";
import { FlaskConical, TrendingUp, Search, Zap, Brain } from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, Cell, AreaChart, Area, CartesianGrid,
} from "recharts";

const API = "http://localhost:8000/api/v1";

const NBA_TEAMS = [
  "ATL","BOS","BKN","CHA","CHI","CLE","DAL","DEN","DET","GSW",
  "HOU","IND","LAC","LAL","MEM","MIA","MIL","MIN","NOP","NYK",
  "OKC","ORL","PHI","PHX","POR","SAC","SAS","TOR","UTA","WAS",
];

interface TeamStats {
  pts: number; reb: number; ast: number;
  stl: number; blk: number; tov: number;
  fg_pct: number; fg3_pct: number; ft_pct: number;
  players: number; off_score: number; def_score: number;
}

interface TrendPoint { season: string; pts: number; fg_pct: number; }

interface MatchupResult {
  home_team: string;
  away_team: string;
  home_stats: TeamStats;
  away_stats: TeamStats;
  probability: { home_win_pct: number; away_win_pct: number; confidence: string; method?: string };
  key_factors: string[];
  home_players: Array<{ name: string; pts: number; reb: number; ast: number; position: string; stl: number; blk: number }>;
  away_players: Array<{ name: string; pts: number; reb: number; ast: number; position: string; stl: number; blk: number }>;
  home_trend: TrendPoint[];
  away_trend: TrendPoint[];
  season: string;
  model: string;
}

function WinProbGauge({ homePct, homeTeam, awayTeam, confidence, method }: {
  homePct: number; homeTeam: string; awayTeam: string; confidence: string; method?: string;
}) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 100); return () => clearTimeout(t); }, [homePct]);

  const confColor = confidence === "High" ? "#10B981" : confidence === "Medium" ? "#F97316" : "var(--cv-muted)";
  const confBg    = confidence === "High" ? "rgba(16,185,129,0.12)" : confidence === "Medium" ? "rgba(249,115,22,0.12)" : "rgba(90,100,128,0.15)";
  const confBorder= confidence === "High" ? "rgba(16,185,129,0.25)" : "rgba(249,115,22,0.25)";

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ position: "relative", display: "inline-block", width: 200, height: 200 }}>
        <ResponsiveContainer width={200} height={200}>
          <RadialBarChart cx={100} cy={100} innerRadius={60} outerRadius={90} startAngle={180} endAngle={0}
            data={[{ value: animated ? homePct : 0 }, { value: 100 }]}>
            <RadialBar dataKey="value" cornerRadius={6} background={{ fill: "var(--cv-border)" }}>
              <Cell fill="#F97316" />
            </RadialBar>
          </RadialBarChart>
        </ResponsiveContainer>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -20%)", textAlign: "center" }}>
          <p className="font-stat" style={{ fontSize: 28, fontWeight: 800, color: "var(--cv-orange)", lineHeight: 1 }}>{homePct}%</p>
          <p style={{ fontSize: 11, color: "var(--cv-muted)" }}>{homeTeam} wins</p>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <div style={{ textAlign: "center" }}>
          <p className="font-stat" style={{ fontSize: 22, fontWeight: 700, color: "#F97316" }}>{homePct}%</p>
          <p style={{ fontSize: 11, color: "var(--cv-muted)" }}>{homeTeam}</p>
        </div>
        <div style={{ fontSize: 13, color: "var(--cv-subtle)", alignSelf: "center" }}>vs</div>
        <div style={{ textAlign: "center" }}>
          <p className="font-stat" style={{ fontSize: 22, fontWeight: 700, color: "#3B82F6" }}>{100 - homePct}%</p>
          <p style={{ fontSize: 11, color: "var(--cv-muted)" }}>{awayTeam}</p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
        <span style={{ padding: "4px 12px", borderRadius: 100, fontSize: 12, fontWeight: 700, background: confBg, color: confColor, border: `1px solid ${confBorder}` }}>
          {confidence} Confidence
        </span>
        {method && (
          <span style={{ padding: "4px 12px", borderRadius: 100, fontSize: 11, fontWeight: 600, background: "rgba(139,92,246,0.12)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.25)" }}>
            {method}
          </span>
        )}
      </div>
    </div>
  );
}

function StatCompare({ label, home, away, homeTeam, awayTeam }: {
  label: string; home: number; away: number; homeTeam: string; awayTeam: string;
}) {
  const max = Math.max(home, away) * 1.2;
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 11, color: "var(--cv-muted)", marginBottom: 6, fontWeight: 600 }}>{label}</p>
      <div style={{ height: 40 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[{ name: homeTeam, value: home }, { name: awayTeam, value: away }]} layout="vertical" margin={{ left: 0, right: 0 }}>
            <XAxis type="number" domain={[0, max]} hide />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "var(--cv-muted)" }} width={35} />
            <Tooltip contentStyle={{ background: "#161B24", border: "1px solid #2A3750", borderRadius: 6, fontSize: 11 }} formatter={(v: number) => [v.toFixed(1), label]} />
            <Bar dataKey="value" radius={4} maxBarSize={14}>
              <Cell fill="#F97316" />
              <Cell fill="#3B82F6" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TeamSelector({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const isHome = label.includes("Home");
  return (
    <div style={{ flex: 1 }}>
      <p style={{ fontSize: 11, color: "var(--cv-muted)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
        {NBA_TEAMS.map((t) => (
          <button key={t} onClick={() => onChange(t)} style={{
            padding: "6px 4px", borderRadius: 7, fontSize: 10, fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            background: value === t ? (isHome ? "rgba(249,115,22,0.2)" : "rgba(59,130,246,0.2)") : "var(--cv-surface)",
            border: `1px solid ${value === t ? (isHome ? "rgba(249,115,22,0.5)" : "rgba(59,130,246,0.5)") : "var(--cv-border)"}`,
            color: value === t ? (isHome ? "#F97316" : "#3B82F6") : "var(--cv-muted)",
            cursor: "pointer", transition: "all 120ms",
          }}>{t}</button>
        ))}
      </div>
    </div>
  );
}

function PlayerProjection() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{ players: Array<{ name: string; team: string; position: string; current: Record<string, number>; season_totals: Record<string, number> }> } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/predictions/player/${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Player not found");
      setResult(await res.json());
    } catch { setError("Player not found — try a different name"); setResult(null); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 400 }}>
          <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--cv-muted)" }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Search player... (e.g. Jokic, Tatum, Curry)"
            style={{ width: "100%", background: "var(--cv-card)", border: "1px solid var(--cv-border)", borderRadius: 9, padding: "10px 14px 10px 36px", fontSize: 14, color: "var(--cv-text)", outline: "none" }}
            onFocus={(e) => (e.target.style.borderColor = "rgba(249,115,22,0.5)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--cv-border)")} />
        </div>
        <button onClick={search} disabled={loading} className="btn-primary" style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 6 }}>
          <Zap style={{ width: 14, height: 14 }} /> {loading ? "Searching..." : "Search"}
        </button>
      </div>
      {error && <p style={{ color: "#EF4444", fontSize: 13 }}>{error}</p>}
      {result && result.players.map((p) => (
        <div key={p.name} className="insight-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, #F97316, #EA6A0A)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "white" }}>
              {p.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
            </div>
            <div>
              <h3 className="font-display" style={{ fontSize: 16, fontWeight: 700, color: "var(--cv-text)" }}>{p.name}</h3>
              <p style={{ fontSize: 12, color: "var(--cv-muted)" }}>{p.team} · {p.position} · 2025-26</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 16 }}>
            {[
              { label: "PPG",  value: p.current.pts,     color: "#F97316" },
              { label: "RPG",  value: p.current.reb,     color: "#3B82F6" },
              { label: "APG",  value: p.current.ast,     color: "#10B981" },
              { label: "FG%",  value: p.current.fg_pct,  color: "#8B5CF6" },
              { label: "3P%",  value: p.current.fg3_pct, color: "#F59E0B" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center", padding: "12px 8px", background: "var(--cv-surface)", borderRadius: 9, border: "1px solid var(--cv-border)" }}>
                <p className="font-stat" style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</p>
                <p style={{ fontSize: 10, color: "var(--cv-muted)", marginTop: 3 }}>{s.label}</p>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
            {[
              { label: "STL", value: p.current.stl, color: "#10B981" },
              { label: "BLK", value: p.current.blk, color: "#6366F1" },
              { label: "TOV", value: p.current.tov, color: "#EF4444" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center", padding: "10px 8px", background: "var(--cv-surface)", borderRadius: 9, border: "1px solid var(--cv-border)" }}>
                <p className="font-stat" style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</p>
                <p style={{ fontSize: 10, color: "var(--cv-muted)", marginTop: 3 }}>{s.label}</p>
              </div>
            ))}
          </div>
          <div style={{ padding: "12px 14px", background: "rgba(249,115,22,0.06)", borderRadius: 9, border: "1px solid rgba(249,115,22,0.15)" }}>
            <p style={{ fontSize: 11, color: "var(--cv-orange)", fontWeight: 600, marginBottom: 6 }}>Season Totals ({p.current.gp} GP)</p>
            <div style={{ display: "flex", gap: 20 }}>
              <span style={{ fontSize: 13, color: "var(--cv-text)" }}><strong>{p.season_totals.pts}</strong> PTS</span>
              <span style={{ fontSize: 13, color: "var(--cv-text)" }}><strong>{p.season_totals.reb}</strong> REB</span>
              <span style={{ fontSize: 13, color: "var(--cv-text)" }}><strong>{p.season_totals.ast}</strong> AST</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PredictionsPage() {
  const [tab, setTab] = useState<"matchup" | "player">("matchup");
  const [homeTeam, setHomeTeam] = useState("NYK");
  const [awayTeam, setAwayTeam] = useState("BOS");
  const [result, setResult] = useState<MatchupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const predict = async () => {
    if (homeTeam === awayTeam) { setError("Select two different teams"); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch(`${API}/predictions/matchup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ home_team: homeTeam, away_team: awayTeam }),
      });
      if (!res.ok) throw new Error("Prediction failed");
      setResult(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Prediction failed");
    } finally { setLoading(false); }
  };

  const trendData = result?.home_trend?.map((h, i) => ({
    season: h.season,
    [result.home_team]: h.pts,
    [result.away_team]: result.away_trend[i]?.pts ?? 0,
  })) ?? [];

  return (
    <PageWrapper>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 11, color: "var(--cv-orange)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Prediction Lab</p>
          <h1 className="font-display" style={{ fontSize: 26, fontWeight: 700, color: "var(--cv-text)", letterSpacing: "-0.02em" }}>Win Probability Engine</h1>
          <p style={{ color: "var(--cv-muted)", fontSize: 14, marginTop: 4 }}>
            ML model · 6 seasons · 3,380 records · Real NBA data
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span className="badge badge-ml">ML · GradientBoosting</span>
          <span className="badge badge-live">
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#10B981", display: "inline-block" }} />
            2025-26
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--cv-border)" }}>
        {[
          { key: "matchup", label: "Matchup Predictor", icon: TrendingUp },
          { key: "player",  label: "Player Stats",      icon: Search },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as "matchup" | "player")} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", background: "none", border: "none",
            borderBottom: tab === key ? "2px solid var(--cv-orange)" : "2px solid transparent",
            color: tab === key ? "var(--cv-text)" : "var(--cv-muted)",
            fontWeight: tab === key ? 600 : 400, fontSize: 14, cursor: "pointer",
            marginBottom: -1, transition: "all 150ms",
          }}>
            <Icon style={{ width: 14, height: 14 }} /> {label}
          </button>
        ))}
      </div>

      {tab === "player" && <PlayerProjection />}

      {tab === "matchup" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Team selectors */}
          <div className="insight-card" style={{ padding: 20 }}>
            <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
              <TeamSelector value={homeTeam} onChange={setHomeTeam} label="🏠 Home Team" />
              <div style={{ display: "flex", alignItems: "center", paddingTop: 28, color: "var(--cv-subtle)", fontSize: 18, fontWeight: 700 }}>vs</div>
              <TeamSelector value={awayTeam} onChange={setAwayTeam} label="✈️ Away Team" />
            </div>
            {error && <p style={{ color: "#EF4444", fontSize: 13, marginBottom: 10 }}>{error}</p>}
            <button onClick={predict} disabled={loading} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 24px" }}>
              <FlaskConical style={{ width: 15, height: 15 }} />
              {loading ? "Analyzing with ML..." : `Predict ${homeTeam} vs ${awayTeam}`}
            </button>
          </div>

          {result && (
            <>
              {/* Win probability + Key factors */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="insight-card" style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <p className="eyebrow" style={{ marginBottom: 8 }}>Win Probability</p>
                  <WinProbGauge
                    homePct={result.probability.home_win_pct}
                    homeTeam={result.home_team}
                    awayTeam={result.away_team}
                    confidence={result.probability.confidence}
                    method={result.probability.method}
                  />
                </div>

                <div className="insight-card" style={{ padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Brain style={{ width: 14, height: 14, color: "var(--cv-orange)" }} />
                    <p className="eyebrow" style={{ margin: 0 }}>Key Factors</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {result.key_factors.map((f, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                          background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.2)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 700, color: "var(--cv-orange)",
                        }}>{i + 1}</div>
                        <p style={{ fontSize: 13, color: "var(--cv-text)", lineHeight: 1.5 }}>{f}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Historical trend */}
              {trendData.length > 0 && (
                <div className="insight-card" style={{ padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <div>
                      <p className="eyebrow">6-Season History</p>
                      <h3 className="font-display" style={{ fontSize: 15, fontWeight: 600, color: "var(--cv-text)" }}>Scoring Trend (2020–2026)</h3>
                    </div>
                    <div style={{ display: "flex", gap: 16 }}>
                      {[{ color: "#F97316", label: result.home_team }, { color: "#3B82F6", label: result.away_team }].map((l) => (
                        <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 10, height: 3, background: l.color, borderRadius: 2 }} />
                          <span style={{ fontSize: 11, color: "var(--cv-muted)" }}>{l.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ height: 160 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="homeGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#F97316" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="awayGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="season" tick={{ fontSize: 9, fill: "#5A6480" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 9, fill: "#5A6480" }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: "#161B24", border: "1px solid #2A3750", borderRadius: 6, fontSize: 11 }} />
                        <Area type="monotone" dataKey={result.home_team} stroke="#F97316" strokeWidth={2} fill="url(#homeGrad)" dot={false} />
                        <Area type="monotone" dataKey={result.away_team} stroke="#3B82F6" strokeWidth={2} fill="url(#awayGrad)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Stat comparison */}
              <div className="insight-card" style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <p className="eyebrow">Team Comparison</p>
                    <h3 className="font-display" style={{ fontSize: 15, fontWeight: 600, color: "var(--cv-text)" }}>2025-26 Stats</h3>
                  </div>
                  <div style={{ display: "flex", gap: 16 }}>
                    {[{ color: "#F97316", label: result.home_team }, { color: "#3B82F6", label: result.away_team }].map((l) => (
                      <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 10, height: 3, background: l.color, borderRadius: 2 }} />
                        <span style={{ fontSize: 11, color: "var(--cv-muted)" }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <StatCompare label="Points Per Game"  home={result.home_stats.pts}     away={result.away_stats.pts}     homeTeam={result.home_team} awayTeam={result.away_team} />
                    <StatCompare label="3PT %"            home={result.home_stats.fg3_pct}  away={result.away_stats.fg3_pct}  homeTeam={result.home_team} awayTeam={result.away_team} />
                    <StatCompare label="Assists"          home={result.home_stats.ast}      away={result.away_stats.ast}      homeTeam={result.home_team} awayTeam={result.away_team} />
                  </div>
                  <div>
                    <StatCompare label="FG %"             home={result.home_stats.fg_pct}   away={result.away_stats.fg_pct}   homeTeam={result.home_team} awayTeam={result.away_team} />
                    <StatCompare label="Steals + Blocks"  home={result.home_stats.stl + result.home_stats.blk} away={result.away_stats.stl + result.away_stats.blk} homeTeam={result.home_team} awayTeam={result.away_team} />
                    <StatCompare label="Turnovers"        home={result.home_stats.tov}      away={result.away_stats.tov}      homeTeam={result.home_team} awayTeam={result.away_team} />
                  </div>
                </div>
              </div>

              {/* Top players */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[
                  { team: result.home_team, players: result.home_players, color: "#F97316" },
                  { team: result.away_team, players: result.away_players, color: "#3B82F6" },
                ].map(({ team, players, color }) => (
                  <div key={team} className="insight-card" style={{ padding: 16 }}>
                    <p className="eyebrow" style={{ color, marginBottom: 10 }}>{team} Key Players</p>
                    {players.map((p, i) => (
                      <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < players.length - 1 ? "1px solid var(--cv-border)" : "none" }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg, ${color}, ${color}99)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "white" }}>
                          {p.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--cv-text)" }}>{p.name}</p>
                          <p style={{ fontSize: 10, color: "var(--cv-muted)" }}>{p.position}</p>
                        </div>
                        <div style={{ display: "flex", gap: 12, textAlign: "right" }}>
                          <div>
                            <p className="font-stat" style={{ fontSize: 14, fontWeight: 700, color }}>{p.pts}</p>
                            <p style={{ fontSize: 9, color: "var(--cv-muted)" }}>PPG</p>
                          </div>
                          <div>
                            <p className="font-stat" style={{ fontSize: 14, fontWeight: 700, color: "var(--cv-muted)" }}>{p.reb}</p>
                            <p style={{ fontSize: 9, color: "var(--cv-muted)" }}>RPG</p>
                          </div>
                          <div>
                            <p className="font-stat" style={{ fontSize: 14, fontWeight: 700, color: "var(--cv-muted)" }}>{p.ast}</p>
                            <p style={{ fontSize: 9, color: "var(--cv-muted)" }}>APG</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </PageWrapper>
  );
}