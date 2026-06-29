"use client";
import { useEffect, useState } from "react";
import { Users, Activity, Search, TrendingUp, Shield } from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";

interface Player {
  id: number;
  full_name: string;
  team_abbreviation: string;
  position: string;
  is_active: boolean;
}

interface Team {
  id: number;
  full_name: string;
  abbreviation: string;
  city: string;
  year_founded: number;
}

export default function AnalyticsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"players" | "teams">("players");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const API = "http://localhost:8000/api/v1";

  useEffect(() => {
    fetch(`${API}/teams/`)
      .then((r) => r.json())
      .then((data) => setTeams(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = search ? `&search=${encodeURIComponent(search)}` : "";
    fetch(`${API}/players/?limit=20&offset=0${q}`)
      .then((r) => r.json())
      .then((data) => {
        setPlayers(data.players || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [search]);

  const conferences = {
    East: ["ATL","BOS","BKN","CHA","CHI","CLE","DET","IND","MIA","MIL","NYK","ORL","PHI","TOR","WAS"],
    West: ["DAL","DEN","GSW","HOU","LAC","LAL","MEM","MIN","NOP","OKC","PHX","POR","SAC","SAS","UTA"],
  };

  return (
    <PageWrapper>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 11, color: "var(--cv-orange)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
            Analytics Hub
          </p>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 700, color: "var(--cv-text)", letterSpacing: "-0.02em" }}>
            League Intelligence
          </h1>
          <p style={{ color: "var(--cv-muted)", fontSize: 14, marginTop: 4 }}>
            Real NBA data — 30 teams, {total.toLocaleString()}+ players
          </p>
        </div>
        <span className="badge badge-live">
          <span className="live-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", display: "inline-block" }} />
          Live Data
        </span>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { label: "Total Teams",    value: teams.length, icon: Shield,   color: "#F97316" },
          { label: "Total Players",  value: total,        icon: Users,    color: "#3B82F6" },
          { label: "Active Players", value: "530+",       icon: Activity, color: "#10B981" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="stat-card" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px" }}>
              <div style={{ padding: 8, borderRadius: 8, background: `${s.color}18`, border: `1px solid ${s.color}28`, flexShrink: 0 }}>
                <Icon style={{ width: 18, height: 18, color: s.color }} />
              </div>
              <div>
                <p className="font-stat" style={{ fontSize: 24, fontWeight: 700, color: s.color, lineHeight: 1.1 }}>{s.value}</p>
                <p style={{ fontSize: 12, color: "var(--cv-muted)", marginTop: 2 }}>{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--cv-border)", paddingBottom: 0 }}>
        {(["players", "teams"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 16px",
              background: "none",
              border: "none",
              borderBottom: tab === t ? "2px solid var(--cv-orange)" : "2px solid transparent",
              color: tab === t ? "var(--cv-text)" : "var(--cv-muted)",
              fontWeight: tab === t ? 600 : 400,
              fontSize: 14,
              cursor: "pointer",
              textTransform: "capitalize",
              transition: "all 150ms ease",
              marginBottom: -1,
            }}
          >
            {t === "players" ? `Players (${total.toLocaleString()})` : `Teams (${teams.length})`}
          </button>
        ))}
      </div>

      {/* Players tab */}
      {tab === "players" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ position: "relative", maxWidth: 400 }}>
            <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--cv-muted)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search players..."
              style={{
                width: "100%", background: "var(--cv-card)", border: "1px solid var(--cv-border)",
                borderRadius: 8, padding: "9px 14px 9px 36px", fontSize: 14,
                color: "var(--cv-text)", outline: "none", transition: "border-color 150ms",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(249,115,22,0.5)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--cv-border)")}
            />
          </div>

          <div style={{ background: "var(--cv-card)", border: "1px solid var(--cv-border)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{
              display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr",
              padding: "10px 16px", borderBottom: "1px solid var(--cv-border)",
              background: "var(--cv-surface)",
            }}>
              {["Player", "Team", "Position", "Status"].map((h) => (
                <span key={h} style={{ fontSize: 11, fontWeight: 600, color: "var(--cv-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</span>
              ))}
            </div>

            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "12px 16px", borderBottom: "1px solid var(--cv-border)" }}>
                  {[180, 60, 80, 60].map((w, j) => (
                    <div key={j} className="skeleton" style={{ height: 14, width: w, borderRadius: 4 }} />
                  ))}
                </div>
              ))
            ) : players.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--cv-muted)" }}>
                {search ? `No players found for "${search}"` : "No players loaded yet — run the pipeline first"}
              </div>
            ) : (
              players.map((p, i) => (
                <div
                  key={p.id}
                  style={{
                    display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr",
                    padding: "12px 16px",
                    borderBottom: i < players.length - 1 ? "1px solid var(--cv-border)" : "none",
                    transition: "background 150ms",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cv-card-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                      background: "linear-gradient(135deg, #F97316, #EA6A0A)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, color: "white",
                    }}>
                      {p.full_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "var(--cv-text)" }}>{p.full_name}</span>
                  </div>
                  <span style={{ fontSize: 13, color: "var(--cv-muted)", alignSelf: "center" }}>
                    {p.team_abbreviation || "—"}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--cv-muted)", alignSelf: "center" }}>
                    {p.position || "—"}
                  </span>
                  <div style={{ alignSelf: "center" }}>
                    <span className={`badge ${p.is_active ? "badge-live" : "badge-default"}`}>
                      {p.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Teams tab */}
      {tab === "teams" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {(["East", "West"] as const).map((conf) => (
            <div key={conf}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <TrendingUp style={{ width: 14, height: 14, color: "var(--cv-orange)" }} />
                <p style={{ fontSize: 11, fontWeight: 600, color: "var(--cv-orange)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  {conf}ern Conference
                </p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                {teams
                  .filter((t) => conferences[conf].includes(t.abbreviation))
                  .map((team) => (
                    <div key={team.id} className="module-card" style={{ padding: 14, textAlign: "center" }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, margin: "0 auto 8px",
                        background: "linear-gradient(135deg, rgba(249,115,22,0.2), rgba(249,115,22,0.05))",
                        border: "1px solid rgba(249,115,22,0.2)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "'JetBrains Mono',monospace", fontWeight: 700,
                        fontSize: 12, color: "var(--cv-orange)",
                      }}>
                        {team.abbreviation}
                      </div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--cv-text)", marginBottom: 2 }}>{team.city}</p>
                      <p style={{ fontSize: 11, color: "var(--cv-muted)" }}>Est. {team.year_founded}</p>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}