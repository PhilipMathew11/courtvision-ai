"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Search, ShieldAlert, Users, X } from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface TradePlayer {
  nba_id: number;
  full_name: string;
  team: string;
  position: string;
  height: string;
  stats: Record<string, number | string | null>;
}

interface TradeData {
  teams: string[];
  players: TradePlayer[];
  data_season: string | null;
}

const COMPARISON_STATS = [
  { key: "pts", label: "Points", abbreviation: "PPG" },
  { key: "reb", label: "Rebounds", abbreviation: "RPG" },
  { key: "ast", label: "Assists", abbreviation: "APG" },
  { key: "stl", label: "Steals", abbreviation: "SPG" },
  { key: "blk", label: "Blocks", abbreviation: "BPG" },
];

function numeric(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function packageStat(players: TradePlayer[], key: string) {
  if (players.length === 0) return 0;
  const values = players.map((player) => numeric(player.stats[key]));
  if (values.some((value) => value === null)) return null;
  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

function formatStat(value: number | null) {
  return value === null ? "—" : value.toFixed(1);
}

function netStat(received: number | null, sent: number | null) {
  if (received === null || sent === null) return null;
  return received - sent;
}

function formatChange(value: number | null) {
  if (value === null) return "not available";
  if (Math.abs(value) < 0.05) return "no change";
  return `${value > 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}`;
}

function TradeAsset({ player, onRemove }: { player: TradePlayer; onRemove: () => void }) {
  const ppg = numeric(player.stats.pts);
  const rpg = numeric(player.stats.reb);
  const apg = numeric(player.stats.ast);
  const season = typeof player.stats.season === "string" ? player.stats.season : null;
  const hasSeasonStats = season !== null
    && [player.stats.pts, player.stats.reb, player.stats.ast, player.stats.stl, player.stats.blk]
      .some((value) => numeric(value) !== null);

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      padding: "12px 13px", borderRadius: 10, background: "var(--cv-bg)",
      border: "1px solid var(--cv-border)",
    }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ color: "var(--cv-text)", fontSize: 14, fontWeight: 650 }}>{player.full_name}</p>
        <p style={{ color: "var(--cv-muted)", fontSize: 11, marginTop: 3 }}>
          {player.position} · {player.height}
          {season && ` · ${season}`}
          {ppg !== null && ` · ${ppg.toFixed(1)} PPG`}
          {rpg !== null && ` · ${rpg.toFixed(1)} RPG`}
          {apg !== null && ` · ${apg.toFixed(1)} APG`}
        </p>
        {!hasSeasonStats && (
          <p style={{ color: "var(--cv-gold)", fontSize: 11, marginTop: 5 }}>
            No NBA season stats on record
          </p>
        )}
      </div>
      <button
        type="button"
        aria-label={`Remove ${player.full_name}`}
        onClick={onRemove}
        style={{
          border: 0, background: "transparent", color: "var(--cv-muted)",
          padding: 5, cursor: "pointer", flexShrink: 0,
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

function TeamTradeColumn({
  team,
  teams,
  players,
  selectedIds,
  onTeamChange,
  onAdd,
  onRemove,
  outgoingTo,
}: {
  team: string;
  teams: string[];
  players: TradePlayer[];
  selectedIds: number[];
  onTeamChange: (team: string) => void;
  onAdd: (nbaId: number) => void;
  onRemove: (nbaId: number) => void;
  outgoingTo: string;
}) {
  const [query, setQuery] = useState("");
  const teamPlayers = useMemo(
    () => players.filter((player) => player.team === team),
    [players, team],
  );
  const selectedPlayers = teamPlayers.filter((player) => selectedIds.includes(player.nba_id));
  const availablePlayers = teamPlayers.filter((player) =>
    !selectedIds.includes(player.nba_id)
    && player.full_name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <section className="stat-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div>
          <p style={{ color: "var(--cv-orange)", textTransform: "uppercase", fontSize: 10, fontWeight: 700, letterSpacing: "0.09em" }}>
            Trade with {outgoingTo || "other team"}
          </p>
          <h2 className="font-display" style={{ color: "var(--cv-text)", fontSize: 18, marginTop: 3 }}>
            {team} sends
          </h2>
        </div>
        <span className="badge badge-default"><Users size={12} /> {teamPlayers.length} players</span>
      </div>

      <label style={{ display: "grid", gap: 6, color: "var(--cv-muted)", fontSize: 11 }}>
        Team
        <select value={team} onChange={(event) => onTeamChange(event.target.value)} style={selectStyle}>
          {teams.map((abbreviation) => (
            <option key={abbreviation} value={abbreviation}>{abbreviation}</option>
          ))}
        </select>
      </label>

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
          <Search size={14} style={{ position: "absolute", left: 11, top: 12, color: "var(--cv-muted)" }} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search this roster"
            aria-label={`Search ${team} roster`}
            style={{ ...selectStyle, paddingLeft: 32, width: "100%" }}
          />
        </div>
        <select
          aria-label={`Choose ${team} player`}
          value=""
          onChange={(event) => {
            if (event.target.value) onAdd(Number(event.target.value));
            setQuery("");
          }}
          style={{ ...selectStyle, maxWidth: 150 }}
        >
          <option value="">Add player</option>
          {availablePlayers.map((player) => (
            <option key={player.nba_id} value={player.nba_id}>{player.full_name}</option>
          ))}
        </select>
      </div>

      {selectedPlayers.length ? (
        <div style={{ display: "grid", gap: 8 }}>
          {selectedPlayers.map((player) => (
            <TradeAsset key={player.nba_id} player={player} onRemove={() => onRemove(player.nba_id)} />
          ))}
        </div>
      ) : (
        <div style={{
          minHeight: 84, display: "grid", placeItems: "center", textAlign: "center",
          color: "var(--cv-muted)", fontSize: 12, border: "1px dashed var(--cv-border-bright)",
          borderRadius: 10, padding: 14,
        }}>
          Choose players from this roster to include in the deal.
        </div>
      )}

      <div style={{ borderTop: "1px solid var(--cv-border)", paddingTop: 12, display: "flex", justifyContent: "space-between", gap: 12 }}>
        <span style={{ color: "var(--cv-muted)", fontSize: 11 }}>Players in package</span>
        <strong style={{ color: "var(--cv-text)", fontSize: 12 }}>{selectedPlayers.length}</strong>
      </div>
    </section>
  );
}

const selectStyle: React.CSSProperties = {
  minHeight: 38,
  background: "var(--cv-bg)",
  border: "1px solid var(--cv-border-bright)",
  borderRadius: 8,
  padding: "8px 10px",
  color: "var(--cv-text)",
  fontSize: 12,
  outline: "none",
};

export default function TradePage() {
  const [data, setData] = useState<TradeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [aToB, setAToB] = useState<number[]>([]);
  const [bToA, setBToA] = useState<number[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`${API}/trade/players`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.detail || `Trade data failed (${response.status})`);
        if (!Array.isArray(payload.teams) || !Array.isArray(payload.players)) {
          throw new Error("Trade data response was incomplete.");
        }
        if (active) {
          setData(payload as TradeData);
          const playerId = Number(new URLSearchParams(window.location.search).get("player"));
          const linkedPlayer = Number.isInteger(playerId)
            ? payload.players.find((player: TradePlayer) => player.nba_id === playerId)
            : undefined;
          if (linkedPlayer) {
            const otherTeam = payload.teams.find((team: string) => team !== linkedPlayer.team);
            setTeamA(linkedPlayer.team);
            setTeamB(otherTeam || "");
            setAToB([linkedPlayer.nba_id]);
          } else {
            setTeamA(payload.teams[0] || "");
            setTeamB(payload.teams[1] || "");
          }
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load trade data.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const players = data?.players ?? [];
  const getPlayer = (id: number) => players.find((player) => player.nba_id === id);
  const hasAssets = aToB.length + bToA.length > 0;
  const canAnalyze = aToB.length > 0 && bToA.length > 0;
  const aSentPlayers = aToB.map(getPlayer).filter((player): player is TradePlayer => Boolean(player));
  const bSentPlayers = bToA.map(getPlayer).filter((player): player is TradePlayer => Boolean(player));
  const aIncomingPlayers = bSentPlayers;
  const bIncomingPlayers = aSentPlayers;
  const aStatChanges = COMPARISON_STATS.map((stat) => ({
    ...stat,
    change: netStat(
      packageStat(aIncomingPlayers, stat.key),
      packageStat(aSentPlayers, stat.key),
    ),
  }));
  const knownStatChanges = aStatChanges.filter(
    (stat): stat is typeof stat & { change: number } => stat.change !== null,
  );
  const aStatGains = knownStatChanges
    .filter((stat) => stat.change > 0.05)
    .map((stat) => `+${stat.change.toFixed(1)} ${stat.abbreviation}`);
  const aStatLosses = knownStatChanges
    .filter((stat) => stat.change < -0.05)
    .map((stat) => `${stat.change.toFixed(1)} ${stat.abbreviation}`);
  const hasMissingStats = COMPARISON_STATS.some((stat) =>
    [aIncomingPlayers, bIncomingPlayers, aSentPlayers, bSentPlayers]
      .some((playersInPackage) => packageStat(playersInPackage, stat.key) === null),
  );
  const selectedPlayers = [...aSentPlayers, ...bSentPlayers];
  const playersWithMissingStats = selectedPlayers
    .filter((player) => COMPARISON_STATS.some((stat) => numeric(player.stats[stat.key]) === null))
    .map((player) => player.full_name);
  const aStatImpact = [
    aStatGains.length ? `adds ${aStatGains.join(", ")}` : "",
    aStatLosses.length
      ? `gives up ${aStatLosses.map((value) => `−${value.slice(1)}`).join(", ")}`
      : "",
  ].filter(Boolean).join(" and ");
  const tradeAnalysis = canAnalyze
    ? [
        `${teamA} gives up ${aSentPlayers.map((player) => player.full_name).join(", ") || "no players"} and receives ${aIncomingPlayers.map((player) => player.full_name).join(", ") || "no players"}.`,
        knownStatChanges.length
          ? `${teamA} ${aStatImpact || "has no change in the available stats"} per game relative to the players it sends.`
          : "Net stat changes cannot be calculated from the available player data.",
        hasMissingStats
          ? `Some stats are unavailable for ${playersWithMissingStats.join(", ") || "one or more players"}, so this is only a partial comparison.`
          : "",
        "Each player's latest available season is shown beside their name; per-game stats alone don't establish overall trade value.",
      ].filter(Boolean).join(" ")
    : "";
  const clearTrade = () => {
    setAToB([]);
    setBToA([]);
  };

  return (
    <PageWrapper>
      <div style={{ maxWidth: 1100, minWidth: 0, margin: "0 auto", display: "grid", gap: 20 }}>
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <p style={{ color: "var(--cv-orange)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Trade Lab
            </p>
            <h1 className="font-display" style={{ color: "var(--cv-text)", fontSize: 28, fontWeight: 700, marginTop: 4 }}>
              Build a trade
            </h1>
            <p style={{ color: "var(--cv-muted)", fontSize: 14, marginTop: 5 }}>
              Put together a player-for-player deal and compare the player packages on both sides.
            </p>
          </div>
          <span className="badge badge-ai"><ArrowLeftRight size={12} /> TRADE SIMULATOR</span>
        </header>

        <div role="note" style={{
          display: "flex", alignItems: "flex-start", gap: 9, padding: 12, borderRadius: 9,
          color: "var(--cv-muted)", background: "rgba(245,158,11,0.07)",
          border: "1px solid rgba(245,158,11,0.2)", fontSize: 12,
        }}>
          <ShieldAlert size={15} color="var(--cv-gold)" style={{ flexShrink: 0, marginTop: 1 }} />
          Stats use each player's latest available season, which may differ between players.
          Salary-cap matching, contracts, draft picks, and trade legality are not checked.
        </div>

        {error && (
          <div role="alert" style={{ color: "#FCA5A5", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", padding: 13, borderRadius: 9, fontSize: 13 }}>
            {error}
          </div>
        )}
        {loading && <p role="status" style={{ color: "var(--cv-muted)", fontSize: 13 }}>Loading active players and team rosters…</p>}

        {data && data.teams.length >= 2 && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", gap: 14 }}>
              <TeamTradeColumn
                team={teamA}
                teams={data.teams.filter((team) => team !== teamB)}
                players={players}
                selectedIds={aToB}
                outgoingTo={teamB}
                onTeamChange={(team) => { setTeamA(team); setAToB([]); }}
                onAdd={(nbaId) => setAToB((ids) => ids.includes(nbaId) ? ids : [...ids, nbaId])}
                onRemove={(nbaId) => setAToB((ids) => ids.filter((id) => id !== nbaId))}
              />
              <TeamTradeColumn
                team={teamB}
                teams={data.teams.filter((team) => team !== teamA)}
                players={players}
                selectedIds={bToA}
                outgoingTo={teamA}
                onTeamChange={(team) => { setTeamB(team); setBToA([]); }}
                onAdd={(nbaId) => setBToA((ids) => ids.includes(nbaId) ? ids : [...ids, nbaId])}
                onRemove={(nbaId) => setBToA((ids) => ids.filter((id) => id !== nbaId))}
              />
            </div>

            <section className="stat-card" style={{ padding: 18, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <h2 className="font-display" style={{ color: "var(--cv-text)", fontSize: 17 }}>Trade summary</h2>
                  <p style={{ color: "var(--cv-muted)", fontSize: 12, marginTop: 4 }}>
                    Review what each team sends and receives.
                  </p>
                </div>
                <button type="button" onClick={clearTrade} disabled={!hasAssets} className="btn-primary" style={{ padding: "8px 12px", fontSize: 12 }}>
                  Clear trade
                </button>
              </div>
              {canAnalyze && (
                <>
                  <p style={{
                    marginTop: 14, padding: 14, borderRadius: 9,
                    background: "var(--cv-bg)", border: "1px solid var(--cv-border)",
                    color: "var(--cv-text)", fontSize: 13, lineHeight: 1.65,
                    overflowWrap: "anywhere",
                  }}>
                    {tradeAnalysis}
                  </p>
                  <div style={{ overflowX: "auto", minWidth: 0, marginTop: 14 }}>
                    <table style={{ width: "100%", minWidth: 720, borderCollapse: "collapse", textAlign: "left", fontSize: 12 }}>
                      <thead>
                        <tr style={{ color: "var(--cv-muted)", borderBottom: "1px solid var(--cv-border)" }}>
                          <th style={tableCellStyle}>Per-game stat</th>
                          <th style={tableCellStyle}>{teamA} receives</th>
                          <th style={tableCellStyle}>{teamA} sends</th>
                          <th style={tableCellStyle}>{teamA} change</th>
                          <th style={tableCellStyle}>{teamB} receives</th>
                          <th style={tableCellStyle}>{teamB} sends</th>
                          <th style={tableCellStyle}>{teamB} change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {COMPARISON_STATS.map((stat) => {
                          const aReceived = packageStat(aIncomingPlayers, stat.key);
                          const aSent = packageStat(aSentPlayers, stat.key);
                          const bReceived = packageStat(bIncomingPlayers, stat.key);
                          const bSent = packageStat(bSentPlayers, stat.key);
                          const aChange = netStat(aReceived, aSent);
                          const bChange = netStat(bReceived, bSent);
                          return (
                            <tr key={stat.key} style={{ color: "var(--cv-text)", borderBottom: "1px solid var(--cv-border)" }}>
                              <td style={tableCellStyle}>{stat.label} ({stat.abbreviation})</td>
                              <td style={tableCellStyle}>{formatStat(aReceived)}</td>
                              <td style={tableCellStyle}>{formatStat(aSent)}</td>
                              <td style={{ ...tableCellStyle, color: aChange === null ? "var(--cv-muted)" : aChange >= 0 ? "var(--cv-green)" : "#FCA5A5" }}>
                                {formatChange(aChange)}
                              </td>
                              <td style={tableCellStyle}>{formatStat(bReceived)}</td>
                              <td style={tableCellStyle}>{formatStat(bSent)}</td>
                              <td style={{ ...tableCellStyle, color: bChange === null ? "var(--cv-muted)" : bChange >= 0 ? "var(--cv-green)" : "#FCA5A5" }}>
                                {formatChange(bChange)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {hasAssets && !canAnalyze && (
                <p style={{ marginTop: 14, color: "var(--cv-muted)", fontSize: 12 }}>
                  Add at least one player to both teams to compare the packages’ stats.
                </p>
              )}
              <p style={{ color: "var(--cv-subtle)", fontSize: 11, marginTop: 12 }}>
                {data.data_season ? `Latest season in database: ${data.data_season}.` : "Player data is from the local database."}
                {" "}Package totals add the selected players’ per-game averages; seasons are shown beside player names.
              </p>
            </section>
          </>
        )}

        {!loading && data && data.teams.length < 2 && (
          <div className="stat-card" style={{ padding: 22, color: "var(--cv-muted)", fontSize: 13 }}>
            Trade Lab needs active player profiles from at least two teams.
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

const tableCellStyle: React.CSSProperties = {
  padding: "10px 9px",
  whiteSpace: "nowrap",
};
