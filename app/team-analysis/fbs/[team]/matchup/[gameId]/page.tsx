"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type TGEMResult = {
  ok: boolean;
  year?: number;
  team?: string;
  opponent?: string;

  lean?: string;
  confidence?: number;
  reasons?: string[];

  stats?: any;

  error?: string;
};

type ScheduleGame = {
  id?: number;
  startDate?: string | null;
  venue?: string | null;
  homeTeam?: string | null;
  awayTeam?: string | null;
  homePoints?: number | null;
  awayPoints?: number | null;
  completed?: boolean | null;
};

function parseDate(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateTime(s?: string | null) {
  const d = parseDate(s);
  if (!d) return "TBD";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MatchupPage() {
  const params = useParams<{ team: string; gameId: string }>();
  const search = useSearchParams();

  const teamSlug = params.team;
  const gameId = params.gameId;

  // IMPORTANT: opponent is coming from query string (?opponent=oklahoma)
  const opponentSlug = search.get("opponent") ?? "";

  const year = 2025;

  const [game, setGame] = useState<ScheduleGame | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [tgem, setTgem] = useState<TGEMResult | null>(null);
  const [tgemErr, setTgemErr] = useState<string | null>(null);

  // Load this team’s schedule, then find this game by id
  useEffect(() => {
    let cancelled = false;

    async function loadGame() {
      setErr(null);
      setGame(null);

      try {
        if (!teamSlug || !gameId) throw new Error("Missing team or gameId");

        const res = await fetch(`/api/cfbd/fbs/schedule/${teamSlug}?year=${year}`);
        const data = await res.json();
        if (!res.ok || data?.ok === false) {
          throw new Error(data?.error ?? "Schedule fetch failed");
        }

        const games: ScheduleGame[] = Array.isArray(data?.games) ? data.games : Array.isArray(data) ? data : [];

        const found = games.find((g) => String(g.id) === String(gameId)) ?? null;
        if (!found) throw new Error("Could not find that game ID in the schedule.");

        if (!cancelled) setGame(found);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Unknown error");
      }
    }

    loadGame();
    return () => {
      cancelled = true;
    };
  }, [teamSlug, gameId]);

  // Call TGEM once we have opponent slug
  useEffect(() => {
    let cancelled = false;

    async function loadTGEM() {
      setTgem(null);
      setTgemErr(null);

      try {
        if (!teamSlug) throw new Error("Missing team param");
        if (!opponentSlug) throw new Error("Missing opponent parameter");

        // venue hint from the game (small bump)
        let venue: "home" | "away" | "neutral" | undefined = undefined;

        if (game?.homeTeam && game?.awayTeam) {
          const homeIsTeam = game.homeTeam.toLowerCase().includes(teamSlug.replaceAll("-", " "));
          // if that logic feels loose, we can refine later
          venue = homeIsTeam ? "home" : "away";
        }

        const res = await fetch(
          `/api/tgem/v10/matchup?team=${encodeURIComponent(teamSlug)}&opponent=${encodeURIComponent(
            opponentSlug
          )}&year=${encodeURIComponent(String(year))}${venue ? `&venue=${venue}` : ""}`
        );

        const data = await res.json();
        if (!res.ok || data?.ok === false) {
          throw new Error(data?.error ?? "TGEM failed");
        }

        if (!cancelled) setTgem(data);
      } catch (e: any) {
        if (!cancelled) setTgemErr(e?.message ?? "Unknown error");
      }
    }

    loadTGEM();
    return () => {
      cancelled = true;
    };
  }, [teamSlug, opponentSlug, game?.id]);

  const title = useMemo(() => {
    if (!game?.homeTeam || !game?.awayTeam) return "Matchup Analysis";
    return `${game.awayTeam} @ ${game.homeTeam}`;
  }, [game]);

  const status = useMemo(() => {
    if (!game) return "TBD";
    const hasScore = game.homePoints != null && game.awayPoints != null;
    if (hasScore) return `${game.awayPoints} - ${game.homePoints}`;
    return game.completed ? "Final" : "TBD";
  }, [game]);

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 20 }}>
      <div style={{ marginBottom: 14 }}>
        <Link href={`/team-analysis/fbs/${teamSlug}`} style={{ textDecoration: "none" }}>
          ← Back
        </Link>
      </div>

      <h1 style={{ marginTop: 0 }}>Matchup Analysis</h1>

      {err ? (
        <div style={{ color: "#b00020" }}>{err}</div>
      ) : !game ? (
        <div style={{ color: "#666" }}>Loading game…</div>
      ) : (
        <>
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: "#444" }}>
              <strong>Team:</strong> {teamSlug} <span style={{ color: "#999" }}>|</span>{" "}
              <strong>Year:</strong> {year} <span style={{ color: "#999" }}>|</span>{" "}
              <strong>Opponent:</strong> {opponentSlug || "?"}
            </div>

            <h2 style={{ marginBottom: 6 }}>{title}</h2>

            <div>
              <strong>Date:</strong> {formatDateTime(game.startDate)}
            </div>
            <div>
              <strong>Venue:</strong> {game.venue ?? "TBD"}
            </div>
            <div>
              <strong>Status:</strong> {status}
            </div>
          </div>

          <hr style={{ margin: "18px 0" }} />

          <h2 style={{ marginBottom: 10 }}>TGEM v10 Analysis</h2>

          {tgemErr ? (
            <div style={{ color: "#b00020" }}>{tgemErr}</div>
          ) : !tgem ? (
            <div style={{ color: "#666" }}>Running TGEM…</div>
          ) : (
            <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
              <div style={{ marginBottom: 8 }}>
                <strong>Lean:</strong> {tgem.lean ?? "UNDEFINED"}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Confidence:</strong>{" "}
                {typeof tgem.confidence === "number" ? `${tgem.confidence} / 100` : "N/A"}
              </div>

              <div style={{ marginBottom: 6 }}>
                <strong>Reasons:</strong>
              </div>
              <ul style={{ marginTop: 6 }}>
                {(tgem.reasons ?? []).map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>

              {/* Optional: show raw normalized stats */}
              {tgem.stats ? (
                <>
                  <hr style={{ margin: "14px 0" }} />
                  <div style={{ fontSize: 13, color: "#555" }}>
                    <strong>Stats Snapshot (seed):</strong>
                    <pre style={{ whiteSpace: "pre-wrap" }}>
                      {JSON.stringify(tgem.stats, null, 2)}
                    </pre>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </>
      )}
    </main>
  );
}
