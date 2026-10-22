"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  ArrowLeftRight, Brain, Check, Search, Shield,
  Sparkles, Target, Users,
} from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";

const API = "http://localhost:8000/api/v1";

const examples = [
  "I need a strong defender with a bit of shooting, around 5'11",
  "Find a playmaking guard around 6'2 who can create for teammates",
  "I need a wing who rebounds well and can defend",
];

const skillLabels: Record<string, string> = {
  defense: "Defense",
  shooting: "Shooting",
  playmaking: "Playmaking",
  finishing: "Finishing",
  rebounding: "Rebounding",
  rim_pressure: "Rim pressure",
  gravity: "Off-ball gravity",
  passing: "Passing",
  transition: "Transition",
  isolation: "Isolation",
  pick_and_roll: "Pick-and-roll",
};

interface Criteria {
  target_height_inches: number | null;
  height_tolerance_inches: number;
  height_range: { min_inches: number; max_inches: number } | null;
  weights: Record<string, number>;
  skill_labels: Record<string, string>;
  min_games: number;
}

interface ScoutMatch {
  nba_id: number;
  full_name: string;
  team: string;
  position: string;
  height: string;
  height_inches: number | null;
  score: number;
  skill_scores: Record<string, number>;
  reasons: string[];
  stats: Record<string, number | string | null>;
}

interface ScoutResponse {
  interpretation: string;
  criteria: Criteria;
  total_candidates: number;
  data_season: string | null;
  data_source: string;
  matches: ScoutMatch[];
}

function inchesToHeight(inches: number) {
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

function numberValue(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function PlayerMatchCard({ player, rank }: { player: ScoutMatch; rank: number }) {
  const stats = player.stats;
  const points = numberValue(stats.pts);
  const rebounds = numberValue(stats.reb);
  const assists = numberValue(stats.ast);
  const games = numberValue(stats.gp);
  const orderedSkills = Object.entries(player.skill_scores)
    .sort((a, b) => b[1] - a[1]);

  return (
    <article className="stat-card" style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          display: "grid", placeItems: "center",
          color: "var(--cv-orange)", fontWeight: 700,
          background: "rgba(249,115,22,0.1)",
          border: "1px solid rgba(249,115,22,0.2)",
        }}>
          {String(rank).padStart(2, "0")}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div>
              <h3 className="font-display" style={{ fontSize: 17, color: "var(--cv-text)", fontWeight: 700 }}>
                {player.full_name}
              </h3>
              <p style={{ fontSize: 12, color: "var(--cv-muted)", marginTop: 3 }}>
                {player.team} · {player.position} · {player.height}
              </p>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p className="font-stat" style={{ fontSize: 21, fontWeight: 700, color: "#10B981" }}>
                {Math.round(player.score)}
              </p>
              <p style={{ fontSize: 10, color: "var(--cv-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Match score
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 13 }}>
            {orderedSkills.map(([skill, score]) => (
              <span key={skill} className="badge badge-default" style={{ textTransform: "none", letterSpacing: 0 }}>
                {skillLabels[skill] || skill} <strong style={{ color: "var(--cv-text)" }}>{Math.round(score)}</strong>
              </span>
            ))}
          </div>

          <div style={{
            display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 13,
            paddingTop: 12, borderTop: "1px solid var(--cv-border)",
          }}>
            {[
              ["PPG", points],
              ["RPG", rebounds],
              ["APG", assists],
              ["GP", games],
            ].map(([label, value]) => value !== null && (
              <span key={String(label)} style={{ fontSize: 12, color: "var(--cv-muted)" }}>
                <strong style={{ color: "var(--cv-text)" }}>
                  {Number(value).toFixed(label === "GP" ? 0 : 1)}
                </strong>{" "}
                {label}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <Link
              href={`/trade?player=${player.nba_id}`}
              className="btn-secondary"
              style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, textDecoration: "none" }}
            >
              <ArrowLeftRight size={14} /> Explore trade
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ScoutPage() {
  const [brief, setBrief] = useState("");
  const [result, setResult] = useState<ScoutResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = async (event?: FormEvent<HTMLFormElement>, example?: string) => {
    event?.preventDefault();
    const requestBrief = (example ?? brief).trim();
    if (requestBrief.length < 5 || loading) return;

    setBrief(requestBrief);
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch(`${API}/scout/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: requestBrief,
          height_tolerance_inches: 1,
          limit: 20,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || `Scout search failed (${response.status})`);
      }
      setResult(data as ScoutResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scout search could not be completed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper>
      <div style={{ maxWidth: 1040, margin: "0 auto", display: "flex", flexDirection: "column", gap: 22 }}>
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <p style={{
              fontSize: 11, color: "var(--cv-orange)", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5,
            }}>
              Scout AI
            </p>
            <h1 className="font-display" style={{ fontSize: 28, fontWeight: 700, color: "var(--cv-text)" }}>
              Find the right fit
            </h1>
            <p style={{ color: "var(--cv-muted)", fontSize: 14, marginTop: 5 }}>
              Describe your player need. Scout ranks real NBA players and shows why they match.
            </p>
          </div>
          <span className="badge badge-ai" style={{ flexShrink: 0 }}>
            <Sparkles size={11} /> AI + DATA
          </span>
        </header>

        <section className="stat-card" style={{ padding: 20 }}>
          <form onSubmit={(event) => search(event)}>
            <label htmlFor="scout-brief" style={{
              display: "block", fontSize: 13, fontWeight: 600,
              color: "var(--cv-text)", marginBottom: 9,
            }}>
              What does your team need?
            </label>
            <textarea
              id="scout-brief"
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Example: I need a strong defender with a bit of shooting, around 5'11"
              style={{
                width: "100%", resize: "vertical", minHeight: 86,
                background: "var(--cv-bg)", border: "1px solid var(--cv-border)",
                borderRadius: 10, padding: "13px 14px", color: "var(--cv-text)",
                outline: "none", font: "inherit", fontSize: 14, lineHeight: 1.5,
              }}
              onFocus={(event) => { event.currentTarget.style.borderColor = "rgba(249,115,22,0.5)"; }}
              onBlur={(event) => { event.currentTarget.style.borderColor = "var(--cv-border)"; }}
            />
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexWrap: "wrap", gap: 10, marginTop: 12,
            }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--cv-muted)" }}>
                <Target size={14} color="var(--cv-orange)" />
                Height searches include ±1 inch · 10 games minimum by default
              </span>
              <button
                type="submit"
                disabled={loading || brief.trim().length < 5}
                className="btn-primary"
                style={{ padding: "9px 16px", fontSize: 13 }}
              >
                {loading ? <><Brain size={14} /> Reading your brief...</> : <><Search size={14} /> Find players</>}
              </button>
            </div>
          </form>

          {!result && !loading && (
            <div style={{ marginTop: 17, paddingTop: 14, borderTop: "1px solid var(--cv-border)" }}>
              <p style={{ fontSize: 11, color: "var(--cv-muted)", marginBottom: 9 }}>
                TRY A SCOUTING BRIEF
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {examples.map((example) => (
                  <button
                    type="button"
                    key={example}
                    className="prompt-chip"
                    style={{ whiteSpace: "normal", textAlign: "left" }}
                    onClick={() => search(undefined, example)}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {error && (
          <div role="alert" style={{
            padding: 14, borderRadius: 10, fontSize: 13,
            color: "#FCA5A5", background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
          }}>
            {error}
          </div>
        )}

        {result && (
          <section aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{
              display: "flex", alignItems: "flex-end", justifyContent: "space-between",
              flexWrap: "wrap", gap: 10,
            }}>
              <div>
                <p style={{ fontSize: 11, color: "var(--cv-orange)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  SCOUTING BRIEF
                </p>
                <h2 className="font-display" style={{ fontSize: 19, color: "var(--cv-text)", marginTop: 4 }}>
                  {result.interpretation}
                </h2>
                <p style={{ color: "var(--cv-muted)", fontSize: 12, marginTop: 7 }}>
                  Priorities{" "}
                  {Object.entries(result.criteria.weights)
                    .sort((a, b) => b[1] - a[1])
                    .map(([skill, weight]) => `${result.criteria.skill_labels[skill] || skill} ${Math.round(weight * 100)}%`)
                    .join(" · ")}
                </p>
              </div>
              <span className="badge badge-live">
                <Users size={11} /> {result.total_candidates} MATCHES
              </span>
            </div>

            {result.criteria.height_range && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--cv-muted)", fontSize: 12 }}>
                <Target size={14} color="var(--cv-orange)" />
                Height range: {inchesToHeight(result.criteria.height_range.min_inches)}–
                {inchesToHeight(result.criteria.height_range.max_inches)}
              </div>
            )}
            <p style={{ color: "var(--cv-muted)", fontSize: 12 }}>
              Minimum games: {result.criteria.min_games}
            </p>

            {result.matches.length ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 390px), 1fr))", gap: 12 }}>
                {result.matches.map((player, index) => (
                  <PlayerMatchCard key={player.nba_id} player={player} rank={index + 1} />
                ))}
              </div>
            ) : (
              <div className="stat-card" style={{ padding: 28, textAlign: "center" }}>
                <Shield size={24} color="var(--cv-muted)" />
                <h3 className="font-display" style={{ color: "var(--cv-text)", marginTop: 10 }}>No matching profiles yet</h3>
                <p style={{ fontSize: 13, color: "var(--cv-muted)", marginTop: 6 }}>
                  Try broadening the height or skill requirements. Results use players with current DNA profiles.
                </p>
              </div>
            )}

            <p style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--cv-subtle)", fontSize: 11 }}>
              <Check size={12} /> {result.data_source}
              {result.data_season ? ` (${result.data_season})` : ""}. Match scores rank available profiles; they are not predictions of future performance.
            </p>
          </section>
        )}

        {loading && (
          <div role="status" style={{ display: "flex", alignItems: "center", gap: 9, color: "var(--cv-muted)", fontSize: 13 }}>
            <Brain size={15} className="live-dot" /> AI is extracting height and skill priorities, then ranking player data...
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
