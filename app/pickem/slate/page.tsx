"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { FBS_TEAMS } from "@/data/fbsTeams";
import {
  AUTO_SYNC_MS,
  getSlate,
  syncFbsSlatesFromApi,
  upsertSlate,
  type GameSuggestion,
  type PickChoice,
  type PickemSlate,
  type SlateGame,
  type SlateRecord,
} from "@/lib/pickem/storage";

type WeekGame = {
  id?: number;
  startDate?: string | null;
  homeTeam?: string | null;
  awayTeam?: string | null;
  venue?: string | null;
  neutralSite?: boolean | null;
  completed?: boolean | null;
  homePoints?: number | null;
  awayPoints?: number | null;
};

function parseDate(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDate(s?: string | null) {
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

function normalizeTeamName(s: string) {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function findSlugByTeamName(teamNameRaw: string | null | undefined) {
  if (!teamNameRaw) return "";
  const target = normalizeTeamName(teamNameRaw);

  const exact = FBS_TEAMS.find((t) => normalizeTeamName(t.name) === target);
  if (exact) return exact.slug;

  const loose = FBS_TEAMS.find((t) => {
    const n = normalizeTeamName(t.name);
    return target.includes(n) || n.includes(target);
  });

  return loose ? loose.slug : "";
}

function toSlateGame(g: WeekGame, idx: number): SlateGame {
  const hasScore = g.homePoints != null && g.awayPoints != null;
  return {
    id: String(g.id ?? idx),
    startDate: g.startDate ?? null,
    homeTeam: g.homeTeam ?? null,
    awayTeam: g.awayTeam ?? null,
    venue: g.venue ?? null,
    neutralSite: !!g.neutralSite,
    completed: Boolean(g.completed || hasScore),
    homePoints: g.homePoints ?? null,
    awayPoints: g.awayPoints ?? null,
  };
}

function gradeRecord(games: SlateGame[], picks: Record<string, PickChoice>): SlateRecord {
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let pending = 0;

  for (const g of games) {
    const pick = picks[g.id] ?? null;
    if (!pick) continue;

    const hasScore = g.homePoints != null && g.awayPoints != null;
    if (!hasScore) {
      pending += 1;
      continue;
    }
    const homePoints = g.homePoints!;
    const awayPoints = g.awayPoints!;

    if (homePoints === awayPoints) {
      pushes += 1;
      continue;
    }

    const winner: PickChoice = homePoints > awayPoints ? "home" : "away";
    if (winner === pick) wins += 1;
    else losses += 1;
  }

  return { wins, losses, pushes, pending };
}

function derivePickemPhase(week: number): "regular" | "championship" | "postseason" {
  if (week >= 16) return "postseason";
  if (week >= 14) return "championship";
  return "regular";
}

function PickemSlatePageInner() {
  const search = useSearchParams();
  const slateId = search.get("id") ?? "";

  const [slate, setSlate] = useState<PickemSlate | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [games, setGames] = useState<SlateGame[]>([]);
  const [picks, setPicks] = useState<Record<string, PickChoice>>({});
  const [suggestions, setSuggestions] = useState<Record<string, GameSuggestion>>({});
  const [locked, setLocked] = useState(false);
  const [record, setRecord] = useState<SlateRecord>({ wins: 0, losses: 0, pushes: 0, pending: 0 });

  useEffect(() => {
    if (!slateId) {
      setError("Missing slate id. Create a slate first.");
      return;
    }

    const s = getSlate(slateId);
    if (!s) {
      setError("Slate not found. Create a new one from Pick'em hub.");
      return;
    }

    setSlate(s);
    setGames(s.games ?? []);
    setPicks(s.picks ?? {});
    setSuggestions(s.suggestions ?? {});
    setLocked(Boolean(s.locked));
    setRecord(s.record ?? { wins: 0, losses: 0, pushes: 0, pending: 0 });
  }, [slateId]);

  async function refreshGames(options?: { silent?: boolean }) {
    if (!slate) return;
    if (slate.mode !== "college-fbs") {
      setError("Only college-fbs slate mode is wired right now.");
      return;
    }

    if (!options?.silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const phase = derivePickemPhase(slate.week);
      const seasonType = phase === "postseason" ? "postseason" : "regular";
      const res = await fetch(
        `/api/cfbd/fbs/week-games?year=${slate.season}&week=${slate.week}&seasonType=${seasonType}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error ?? `Games request failed (${res.status})`);
      }

      const rows = Array.isArray(data?.games) ? (data.games as WeekGame[]) : [];
      rows.sort((a, b) => {
        const da = parseDate(a.startDate)?.getTime() ?? Number.POSITIVE_INFINITY;
        const db = parseDate(b.startDate)?.getTime() ?? Number.POSITIVE_INFINITY;
        return da - db;
      });

      const normalized = rows.map((g, i) => toSlateGame(g, i));
      setGames(normalized);

      const nextRecord = gradeRecord(normalized, picks);
      setRecord(nextRecord);

      upsertSlate(slate.id, {
        games: normalized,
        record: nextRecord,
      });
    } catch (e: unknown) {
      if (!options?.silent) {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    if (!slate) return;
    if (games.length > 0) return;
    refreshGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slate?.id]);

  useEffect(() => {
    if (!slateId) return;

    let cancelled = false;

    const runAutoSync = async () => {
      await syncFbsSlatesFromApi();
      if (cancelled) return;

      const latest = getSlate(slateId);
      if (!latest) return;

      setSlate(latest);
      setGames(latest.games ?? []);
      setPicks(latest.picks ?? {});
      setSuggestions(latest.suggestions ?? {});
      setLocked(Boolean(latest.locked));
      setRecord(latest.record ?? { wins: 0, losses: 0, pushes: 0, pending: 0 });
    };

    const onFocus = () => {
      void runAutoSync();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void runAutoSync();
      }
    };

    void runAutoSync();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void runAutoSync();
      }
    }, AUTO_SYNC_MS);

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [slateId]);

  useEffect(() => {
    if (!slate) return;
    upsertSlate(slate.id, {
      picks,
      suggestions,
      locked,
      games,
      record,
    });
  }, [slate, picks, suggestions, locked, games, record]);

  const pickedCount = useMemo(
    () => Object.values(picks).filter((v) => v != null).length,
    [picks],
  );

  function setPick(gameId: string, pick: PickChoice) {
    if (locked) return;
    setPicks((prev) => ({ ...prev, [gameId]: pick }));
  }

  async function runTgemForGame(g: SlateGame) {
    if (!slate) return;

    const homeSlug = findSlugByTeamName(g.homeTeam);
    const awaySlug = findSlugByTeamName(g.awayTeam);
    if (!homeSlug || !awaySlug) {
      setError(`Could not map team slug for ${g.awayTeam ?? "TBD"} @ ${g.homeTeam ?? "TBD"}.`);
      return;
    }

    const venue = g.neutralSite ? "neutral" : "home";
    const phase = derivePickemPhase(slate.week);
    const seasonType = phase === "postseason" ? "postseason" : "regular";

    const res = await fetch(
      `/api/tgem/v11/matchup?team=${encodeURIComponent(homeSlug)}&opponent=${encodeURIComponent(
        awaySlug,
      )}&year=${encodeURIComponent(String(slate.season))}&venue=${venue}&phase=${phase}&week=${encodeURIComponent(
        String(slate.week),
      )}&seasonType=${seasonType}`,
      { cache: "no-store" },
    );
    const data = await res.json();
    if (!res.ok || data?.ok === false) {
      throw new Error(data?.error ?? `TGEM failed (${res.status})`);
    }

    const lean = data?.lean ?? null;
    const suggestedPick: Exclude<PickChoice, null> = lean === "AWAY" ? "away" : "home";
    const suggestion: GameSuggestion = {
      pick: suggestedPick,
      confidence: typeof data?.confidence === "number" ? data.confidence : null,
      lean,
      reasons: Array.isArray(data?.reasons) ? data.reasons.slice(0, 4) : [],
      updatedAt: new Date().toISOString(),
    };

    setSuggestions((prev) => ({ ...prev, [g.id]: suggestion }));
    if (!locked) {
      setPicks((prev) => ({ ...prev, [g.id]: suggestedPick }));
    }
  }

  async function runTgemAll() {
    if (games.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const g of games) {
        await runTgemForGame(g);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown TGEM error");
    } finally {
      setBusy(false);
    }
  }

  function lockPicks() {
    setLocked(true);
  }

  function gradeNow() {
    const r = gradeRecord(games, picks);
    setRecord(r);
  }

  if (!slate) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-6xl mx-auto text-red-700">{error ?? "Loading slate..."}</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <Link href="/pickem" className="text-sm text-gray-900 hover:underline">
            {"< Back to Pick'em Hub"}
          </Link>
        </div>

        <section className="rounded-xl bg-white p-5 shadow border border-gray-200 mb-5">
          <h1 className="text-2xl font-bold text-gray-900">{slate.slateName}</h1>
          <p className="text-sm text-gray-900 mt-1">
            Season {slate.season} • Week {slate.week} • Mode: {slate.mode}
          </p>
          <p className="text-sm text-gray-900 mt-2">
            Picks made: <strong>{pickedCount}</strong> / {games.length}
          </p>
          <p className="text-sm text-gray-900 mt-1">
            Record: <strong>{record.wins}-{record.losses}</strong>
            {record.pushes > 0 ? `-${record.pushes}` : ""} • Pending: {record.pending}
          </p>
          <div className="mt-3 flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => void refreshGames()}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
            >
              Refresh Games/Results
            </button>
            <button
              type="button"
              onClick={runTgemAll}
              disabled={busy || games.length === 0}
              className="rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-50"
            >
              {busy ? "Running TGEM..." : "Run TGEM All"}
            </button>
            <button
              type="button"
              onClick={lockPicks}
              disabled={locked}
              className="rounded-lg bg-amber-700 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
            >
              {locked ? "Picks Locked" : "Lock Picks"}
            </button>
            <button
              type="button"
              onClick={gradeNow}
              className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Grade Picks
            </button>
          </div>
          {error ? <p className="text-sm text-red-700 mt-3">{error}</p> : null}
        </section>

        <section className="rounded-xl bg-white p-5 shadow border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Games</h2>

          {loading ? (
            <div className="text-gray-700">Loading games...</div>
          ) : games.length === 0 ? (
            <div className="text-gray-700">No FBS games found for this week.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-2 border-b border-gray-200">Date</th>
                    <th className="text-left p-2 border-b border-gray-200">Matchup</th>
                    <th className="text-left p-2 border-b border-gray-200">Venue</th>
                    <th className="text-left p-2 border-b border-gray-200">TGEM</th>
                    <th className="text-left p-2 border-b border-gray-200">Pick</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map((g) => {
                    const gameId = g.id;
                    const pick = picks[gameId] ?? null;
                    const suggestion = suggestions[gameId] ?? null;

                    return (
                      <tr key={gameId}>
                        <td className="p-2 border-b border-gray-100 text-sm">{fmtDate(g.startDate)}</td>
                        <td className="p-2 border-b border-gray-100 text-sm">
                          {g.awayTeam ?? "TBD"} @ {g.homeTeam ?? "TBD"}
                          {g.homePoints != null && g.awayPoints != null ? (
                            <span className="text-gray-700"> ({g.awayPoints}-{g.homePoints})</span>
                          ) : null}
                        </td>
                        <td className="p-2 border-b border-gray-100 text-sm">
                          {g.venue ?? "TBD"}
                          {g.neutralSite ? " (Neutral)" : ""}
                        </td>
                        <td className="p-2 border-b border-gray-100 text-sm">
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              onClick={() => runTgemForGame(g)}
                              disabled={busy}
                              className="rounded border border-indigo-300 px-2 py-1 text-indigo-900 hover:bg-indigo-50 disabled:opacity-50"
                            >
                              Suggest
                            </button>
                            {suggestion ? (
                              <span className="text-xs text-gray-700">
                                {suggestion.pick.toUpperCase()} • Conf {suggestion.confidence ?? "N/A"}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="p-2 border-b border-gray-100 text-sm">
                          <div className="flex gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setPick(gameId, "away")}
                              disabled={locked}
                              className={`rounded border px-2 py-1 ${
                                pick === "away"
                                  ? "border-blue-700 bg-blue-50 text-blue-900"
                                  : "border-gray-300 text-gray-800"
                              } disabled:opacity-50`}
                            >
                              {g.awayTeam ?? "Away"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPick(gameId, "home")}
                              disabled={locked}
                              className={`rounded border px-2 py-1 ${
                                pick === "home"
                                  ? "border-red-700 bg-red-50 text-red-900"
                                  : "border-gray-300 text-gray-800"
                              } disabled:opacity-50`}
                            >
                              {g.homeTeam ?? "Home"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPick(gameId, null)}
                              disabled={locked}
                              className="rounded border border-gray-300 px-2 py-1 text-gray-700 disabled:opacity-50"
                            >
                              Clear
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function PickemSlatePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-100 p-6">
          <div className="max-w-6xl mx-auto text-gray-700">Loading slate...</div>
        </main>
      }
    >
      <PickemSlatePageInner />
    </Suspense>
  );
}
