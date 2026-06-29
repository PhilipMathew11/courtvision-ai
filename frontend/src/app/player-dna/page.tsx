"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, Dna, Users, TrendingUp, Zap } from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip,
} from "recharts";

const API = "http://localhost:8000/api/v1";

const DNA_LABELS: Record<string, string> = {
  shooting:     "Shooting",
  playmaking:   "Playmaking",
  finishing:    "Finishing",
  defense:      "Defense",
  rebounding:   "Rebounding",
  rim_pressure: "Rim Pressure",
  gravity:      "Gravity",
  passing:      "Passing",
  transition:   "Transition",
  isolation:    "Isolation",
  pick_and_roll:"Pick & Roll",
};

interface Player {
  nba_id: number;
  full_name: string;
  team: string;
  position: string;
  dna: Record<string, number>;
  stats: Record<string, number | string>;
  similarity?: number;
}

function RadarChartCard({ player, color = "#F97316", comparePlayer }: {
  player: Player;
  color?: string;
  comparePlayer?: Player;
}) {
  const data = Object.entries(DNA_LABELS).map(([key, label]) => ({
    dimension: label,
    value: player.dna[key] ?? 0,
    compare: comparePlayer?.dna[key] ?? 0,
  }));

  return (
    <div style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="rgba(255,255,255,0.08)" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: "var(--cv-muted)", fontSize: 10, fontFamily: "Inter" }}
          />
          <Tooltip
            contentStyle={{
              background: "#161B24", border: "1px solid #2A3750",
              borderRadius: 8, fontSize: 12,
            }}
            formatter={(val: number, name: string) => [
              `${val.toFixed(1)}`, name === "value" ? player.full_name : comparePlayer?.full_name
            ]}
          />
          <Radar
            name="value"
            dataKey="value"
            stroke={color}
            fill={color}
            fillOpacity={0.25}
            strokeWidth={2}
          />
          {comparePlayer && (
            <Radar
              name="compare"
              dataKey="compare"
              stroke="#3B82F6"
              fill="#3B82F6"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "var(--cv-muted)" }}>{DNA_LABELS[label] || label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>{value.toFixed(1)}</span>
      </div>
      <div style={{ height: 4, background: "var(--cv-border)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 4,
          background: `linear-gradient(90deg, ${color}, ${color}99)`,
          width: `${value}%`,
          transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
        }} />
      </div>
    </div>
  );
}

function PlayerAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg, #F97316, #EA6A0A)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.3, fontWeight: 700, color: "white", flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

export default function PlayerDNAPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Player[]>([]);
  const [selected, setSelected] = useState<Player | null>(null);
  const [similar, setSimilar] = useState<Player[]>([]);
  const [compare, setCompare] = useState<Player | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/dna/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  const selectPlayer = async (p: Player) => {
    setSelected(p);
    setCompare(null);
    setResults([]);
    setQuery("");
    setLoadingSimilar(true);
    try {
      const res = await fetch(`${API}/dna/${p.nba_id}/similar?limit=5`);
      const data = await res.json();
      setSimilar(data.similar || []);
    } catch { setSimilar([]); }
    finally { setLoadingSimilar(false); }
  };

  const topDimensions = selected
    ? Object.entries(selected.dna).sort((a, b) => b[1] - a[1]).slice(0, 3)
    : [];

  return (
    <PageWrapper>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 11, color: "var(--cv-orange)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
            Player DNA
          </p>
          <h1 className="font-display" style={{ fontSize: 26, fontWeight: 700, color: "var(--cv-text)", letterSpacing: "-0.02em" }}>
            Basketball Fingerprints
          </h1>
          <p style={{ color: "var(--cv-muted)", fontSize: 14, marginTop: 4 }}>
            11 dimensions. Every active NBA player. Real stats.
          </p>
        </div>
        <span className="badge badge-live">
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#10B981", display: "inline-block" }} />
          485 Players
        </span>
      </div>

      {/* Search */}
      <div style={{ position: "relative", maxWidth: 480 }}>
        <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "var(--cv-muted)" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any NBA player... (e.g. LeBron, Curry, Jokic)"
          style={{
            width: "100%", background: "var(--cv-card)",
            border: "1px solid var(--cv-border)", borderRadius: 10,
            padding: "11px 14px 11px 38px", fontSize: 14,
            color: "var(--cv-text)", outline: "none",
            transition: "border-color 150ms",
          }}
          onFocus={(e) => (e.target.style.borderColor = "rgba(249,115,22,0.5)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--cv-border)")}
        />

        {/* Dropdown results */}
        {results.length > 0 && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50,
            background: "var(--cv-card)", border: "1px solid var(--cv-border)",
            borderRadius: 10, overflow: "hidden",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}>
            {results.map((p) => (
              <div
                key={p.nba_id}
                onClick={() => selectPlayer(p)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", cursor: "pointer",
                  transition: "background 150ms",
                  borderBottom: "1px solid var(--cv-border)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cv-card-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <PlayerAvatar name={p.full_name} size={32} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--cv-text)" }}>{p.full_name}</p>
                  <p style={{ fontSize: 11, color: "var(--cv-muted)" }}>{p.team} · {p.position}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Empty state */}
      {!selected && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "60px 20px", textAlign: "center",
          background: "var(--cv-card)", border: "1px solid var(--cv-border)", borderRadius: 16,
        }}>
          <div style={{ padding: 16, borderRadius: 16, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)", marginBottom: 16 }}>
            <Dna style={{ width: 32, height: 32, color: "var(--cv-orange)" }} />
          </div>
          <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: "var(--cv-text)", marginBottom: 8 }}>
            Search any NBA player
          </h3>
          <p style={{ fontSize: 14, color: "var(--cv-muted)", maxWidth: 360 }}>
            See their basketball DNA across 11 dimensions and find their most similar players in the league.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap", justifyContent: "center" }}>
            {["LeBron James", "Stephen Curry", "Nikola Jokic", "Jayson Tatum"].map((name) => (
              <button
                key={name}
                onClick={() => setQuery(name)}
                className="prompt-chip"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Player DNA view */}
      {selected && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Player header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

            {/* Left: radar + info */}
            <div className="insight-card" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <PlayerAvatar name={selected.full_name} size={48} />
                <div>
                  <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: "var(--cv-text)" }}>
                    {selected.full_name}
                  </h2>
                  <p style={{ fontSize: 13, color: "var(--cv-muted)" }}>
                    {selected.team} · {selected.position}
                  </p>
                  {selected.stats && (
                    <p style={{ fontSize: 12, color: "var(--cv-orange)", fontWeight: 600, marginTop: 2 }}>
                      {selected.stats.pts} PPG · {selected.stats.reb} RPG · {selected.stats.ast} APG
                    </p>
                  )}
                </div>
                {compare && (
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 2, background: "#F97316", borderRadius: 2 }} />
                    <span style={{ fontSize: 11, color: "var(--cv-muted)" }}>{selected.full_name.split(" ")[1]}</span>
                    <div style={{ width: 8, height: 2, background: "#3B82F6", borderRadius: 2 }} />
                    <span style={{ fontSize: 11, color: "var(--cv-muted)" }}>{compare.full_name.split(" ")[1]}</span>
                  </div>
                )}
              </div>

              <RadarChartCard player={selected} comparePlayer={compare ?? undefined} />

              {/* Top dimensions */}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {topDimensions.map(([key, val]) => (
                  <div key={key} style={{
                    flex: 1, padding: "8px 10px", textAlign: "center",
                    background: "rgba(249,115,22,0.08)",
                    border: "1px solid rgba(249,115,22,0.2)",
                    borderRadius: 8,
                  }}>
                    <p style={{ fontSize: 16, fontWeight: 800, color: "var(--cv-orange)" }}>{val.toFixed(0)}</p>
                    <p style={{ fontSize: 10, color: "var(--cv-muted)", marginTop: 2 }}>{DNA_LABELS[key]}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: DNA bars */}
            <div className="insight-card" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h3 className="font-display" style={{ fontSize: 15, fontWeight: 600, color: "var(--cv-text)" }}>
                  DNA Breakdown
                </h3>
                <Zap style={{ width: 14, height: 14, color: "var(--cv-orange)" }} />
              </div>

              {Object.entries(selected.dna).map(([key, val]) => (
                <StatBar key={key} label={key} value={val} color="#F97316" />
              ))}

              {selected.stats && (
                <div style={{ marginTop: 16, padding: "10px 12px", background: "var(--cv-surface)", borderRadius: 8 }}>
                  <p style={{ fontSize: 10, color: "var(--cv-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontWeight: 600 }}>
                    {selected.stats.season} Season Stats
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {[
                      { label: "FG%", value: `${selected.stats.fg_pct}%` },
                      { label: "3P%", value: `${selected.stats.fg3_pct}%` },
                      { label: "FT%", value: `${selected.stats.ft_pct}%` },
                      { label: "TS%", value: `${selected.stats.ts_pct}%` },
                      { label: "GP",  value: selected.stats.gp },
                      { label: "MIN", value: selected.stats.min },
                    ].map((s) => (
                      <div key={s.label} style={{ textAlign: "center" }}>
                        <p className="font-stat" style={{ fontSize: 15, fontWeight: 700, color: "var(--cv-text)" }}>{s.value}</p>
                        <p style={{ fontSize: 10, color: "var(--cv-muted)" }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Similar players */}
          <div className="insight-card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <p className="eyebrow">DNA Matching</p>
                <h3 className="font-display" style={{ fontSize: 15, fontWeight: 600, color: "var(--cv-text)" }}>
                  Most Similar Players
                </h3>
              </div>
              <Users style={{ width: 15, height: 15, color: "var(--cv-orange)" }} />
            </div>

            {loadingSimilar ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 100, borderRadius: 10 }} />
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
                {similar.map((p) => (
                  <div
                    key={p.nba_id}
                    onClick={() => setCompare(compare?.nba_id === p.nba_id ? null : p)}
                    style={{
                      padding: 12, background: compare?.nba_id === p.nba_id ? "rgba(59,130,246,0.1)" : "var(--cv-surface)",
                      border: `1px solid ${compare?.nba_id === p.nba_id ? "rgba(59,130,246,0.4)" : "var(--cv-border)"}`,
                      borderRadius: 10, cursor: "pointer", textAlign: "center",
                      transition: "all 150ms",
                    }}
                    onMouseEnter={(e) => { if (compare?.nba_id !== p.nba_id) (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(249,115,22,0.35)"; }}
                    onMouseLeave={(e) => { if (compare?.nba_id !== p.nba_id) (e.currentTarget as HTMLDivElement).style.borderColor = "var(--cv-border)"; }}
                  >
                    <PlayerAvatar name={p.full_name} size={36} />
                    <p style={{ fontSize: 11, fontWeight: 600, color: "var(--cv-text)", marginTop: 6, lineHeight: 1.3 }}>{p.full_name}</p>
                    <p style={{ fontSize: 10, color: "var(--cv-muted)" }}>{p.team}</p>
                    <div style={{
                      marginTop: 6, padding: "2px 6px",
                      background: "rgba(16,185,129,0.1)",
                      border: "1px solid rgba(16,185,129,0.2)",
                      borderRadius: 100, display: "inline-block",
                    }}>
                      <span style={{ fontSize: 10, color: "#10B981", fontWeight: 700 }}>{p.similarity}%</span>
                    </div>
                    {compare?.nba_id === p.nba_id && (
                      <p style={{ fontSize: 9, color: "#3B82F6", marginTop: 4, fontWeight: 600 }}>COMPARING</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p style={{ fontSize: 11, color: "var(--cv-subtle)", marginTop: 12 }}>
              Click a player to overlay their DNA on the radar chart
            </p>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}