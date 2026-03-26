"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import TgemDisclaimer from "@/components/ui/TgemDisclaimer";
import {
  AUTO_SYNC_MS,
  listSlates,
  syncFbsSlatesFromApi,
  type PickChoice,
  type PickemSlate,
  type SlateRecord,
} from "@/lib/pickem/storage";

type MissedPick = {
  gameId: string;
  matchup: string;
  picked: "home" | "away";
  winner: "home" | "away";
  score: string;
  slateId: string;
  slateName: string;
};

type WeekSummary = {
  week: number;
  record: SlateRecord;
  missed: MissedPick[];
  slates: PickemSlate[];
};

function addRecord(a: SlateRecord, b: SlateRecord): SlateRecord {
  return {
    wins: a.wins + b.wins,
    losses: a.losses + b.losses,
    pushes: a.pushes + b.pushes,
    pending: a.pending + b.pending,
  };
}

function calcRecordAndMisses(slate: PickemSlate) {
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let pending = 0;
  const missed: MissedPick[] = [];

  for (const g of slate.games ?? []) {
    const pick = (slate.picks ?? {})[g.id] ?? null;
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
    if (winner === pick) {
      wins += 1;
    } else {
      losses += 1;
      missed.push({
        gameId: g.id,
        matchup: `${g.awayTeam ?? "TBD"} @ ${g.homeTeam ?? "TBD"}`,
        picked: pick,
        winner: winner as "home" | "away",
        score: `${g.awayPoints}-${g.homePoints}`,
        slateId: slate.id,
        slateName: slate.slateName,
      });
    }
  }

  return {
    record: { wins, losses, pushes, pending },
    missed,
  };
}

function sortByUpdatedDesc(slates: PickemSlate[]) {
  return [...slates].sort((a, b) => {
    const da = new Date(a.updatedAt).getTime() || 0;
    const db = new Date(b.updatedAt).getTime() || 0;
    return db - da;
  });
}

export default function PickemHomePage() {
  const [, forceRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const runSync = async () => {
      await syncFbsSlatesFromApi();
      if (!cancelled) {
        forceRefresh((n) => n + 1);
      }
    };

    const onFocus = () => {
      void runSync();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void runSync();
      }
    };

    void runSync();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void runSync();
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
  }, []);

  const liveSlates = listSlates();

  const seasons = useMemo(() => {
    const uniq = Array.from(new Set(liveSlates.map((s) => s.season)));
    return uniq.sort((a, b) => b - a);
  }, [liveSlates]);

  const [selectedSeason, setSelectedSeason] = useState<number | "">("");
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [prevSeason, setPrevSeason] = useState<number | "">("");

  const effectiveSeason: number | "" =
    selectedSeason !== "" && seasons.includes(selectedSeason)
      ? selectedSeason
      : seasons[0] ?? "";

  const selectedSeasonSlates = useMemo(() => {
    if (typeof effectiveSeason !== "number") return [] as PickemSlate[];
    return sortByUpdatedDesc(liveSlates.filter((s) => s.season === effectiveSeason));
  }, [liveSlates, effectiveSeason]);

  const weekSummaries = useMemo(() => {
    const byWeek = new Map<number, WeekSummary>();

    for (const slate of selectedSeasonSlates) {
      const week = slate.week;
      const calc = calcRecordAndMisses(slate);
      const prev = byWeek.get(week);

      if (!prev) {
        byWeek.set(week, {
          week,
          record: calc.record,
          missed: calc.missed,
          slates: [slate],
        });
      } else {
        byWeek.set(week, {
          week,
          record: addRecord(prev.record, calc.record),
          missed: [...prev.missed, ...calc.missed],
          slates: [...prev.slates, slate],
        });
      }
    }

    return Array.from(byWeek.values()).sort((a, b) => b.week - a.week);
  }, [selectedSeasonSlates]);

  const effectiveWeek: number | "" =
    selectedWeek !== "" && weekSummaries.some((w) => w.week === selectedWeek)
      ? selectedWeek
      : weekSummaries[0]?.week ?? "";

  const seasonTotal = useMemo(() => {
    return weekSummaries.reduce(
      (acc, w) => addRecord(acc, w.record),
      { wins: 0, losses: 0, pushes: 0, pending: 0 },
    );
  }, [weekSummaries]);

  const selectedWeekSummary = useMemo(() => {
    if (typeof effectiveWeek !== "number") return null;
    return weekSummaries.find((w) => w.week === effectiveWeek) ?? null;
  }, [weekSummaries, effectiveWeek]);

  const latestSlateForSelectedWeek = useMemo(() => {
    if (!selectedWeekSummary || selectedWeekSummary.slates.length === 0) return null;
    return sortByUpdatedDesc(selectedWeekSummary.slates)[0] ?? null;
  }, [selectedWeekSummary]);

  const previousSeasons = useMemo(() => {
    if (typeof effectiveSeason !== "number") return seasons;
    return seasons.filter((s) => s !== effectiveSeason);
  }, [seasons, effectiveSeason]);

  const effectivePrevSeason: number | "" =
    prevSeason !== "" && previousSeasons.includes(prevSeason)
      ? prevSeason
      : previousSeasons[0] ?? "";

  const prevSeasonTotal = useMemo(() => {
    if (typeof effectivePrevSeason !== "number") return null;
    const slates = liveSlates.filter((s) => s.season === effectivePrevSeason);
    return slates.reduce(
      (acc, s) => addRecord(acc, calcRecordAndMisses(s).record),
      { wins: 0, losses: 0, pushes: 0, pending: 0 },
    );
  }, [liveSlates, effectivePrevSeason]);

  return (
    <main className="tgem-page flex min-h-screen flex-col items-center px-6 py-12">
      <div className="w-full max-w-5xl">
        <div className="mb-4">
          <Link href="/" className="tgem-back-link">
            &larr; Back to Home
          </Link>
        </div>

        <header className="mb-8">
          <h1 className="text-center text-3xl font-bold text-gray-900 dark:text-gray-100">
            Pick&apos;em Mode with TGEM<sup className="tgem-tm">TM</sup> Analysis
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg leading-relaxed text-gray-700 dark:text-gray-300">
            Build weekly pick&apos;em slates, let TGEM suggest winners and confidence
            levels, then track how you perform over the season.
          </p>
          <div className="mx-auto mt-4 max-w-3xl">
            <TgemDisclaimer />
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="tgem-surface flex flex-col justify-between rounded-3xl p-6">
            <div>
              <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
                Create a New Slate
              </h2>
              <p className="mb-4 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                Start a fresh pick&apos;em slate for a given season and week. You&apos;ll
                add games, run TGEM analysis, lock your picks, and later enter results
                to see your record.
              </p>
            </div>
            <Link
              href="/pickem/new-slate"
              className="mt-2 inline-block rounded-lg bg-red-700 px-5 py-2 text-center text-sm font-semibold text-white hover:bg-red-800"
            >
              Create New Slate
            </Link>
          </div>

          <div className="tgem-surface flex flex-col justify-between rounded-3xl p-6">
            <div>
              <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-100">
                My Slates
              </h2>
              {liveSlates.length === 0 ? (
                <p className="mb-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  No saved slates yet. Create one to start tracking picks.
                </p>
              ) : (
                <div className="space-y-2">
                  {liveSlates.slice(0, 6).map((s) => (
                    <Link
                      key={s.id}
                      href={`/pickem/slate?id=${encodeURIComponent(s.id)}`}
                      className="tgem-surface-subtle block rounded-2xl px-3 py-2 transition hover:bg-gray-50 dark:hover:bg-gray-900"
                    >
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {s.slateName}
                      </div>
                      <div className="text-xs text-gray-700 dark:text-gray-300">
                        {s.season} Week {s.week} - {s.mode === "college" ? "College Football" : "NFL"} -{" "}
                        {(s.phase ?? "regular") === "postseason"
                          ? "Postseason"
                          : (s.phase ?? "regular") === "championship"
                            ? "Championship"
                            : "Regular"}{" "}
                        - {(s.entryMode ?? "auto") === "auto" ? "Auto" : "Manual"} -{" "}
                        {s.locked ? "Locked" : "Open"}
                      </div>
                      <div className="text-xs text-gray-700 dark:text-gray-300">
                        Record: {s.record.wins}-{s.record.losses}
                        {s.record.pushes > 0 ? `-${s.record.pushes}` : ""} - Pending: {s.record.pending}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {liveSlates.length > 0 ? (
              <p className="mt-3 text-xs text-gray-700 dark:text-gray-300">
                Showing latest {Math.min(6, liveSlates.length)} saved slates.
              </p>
            ) : null}
          </div>
        </div>

        <section className="tgem-surface mt-6 rounded-3xl p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Performance Tracker
          </h2>

          {seasons.length === 0 ? (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              No season history yet. Create and grade slates to populate this tracker.
            </p>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="text-sm text-gray-900 dark:text-gray-100">
                    Current Season
                    <select
                      className="tgem-input ml-2 rounded px-2 py-1 text-sm"
                      value={String(effectiveSeason)}
                      onChange={(e) =>
                        setSelectedSeason(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                    >
                      {seasons.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    Season Total: <strong>{seasonTotal.wins}-{seasonTotal.losses}</strong>
                    {seasonTotal.pushes > 0 ? `-${seasonTotal.pushes}` : ""} - Pending {seasonTotal.pending}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-end gap-3">
                  <label className="text-sm text-gray-900 dark:text-gray-100">
                    Week View
                    <select
                      className="tgem-input ml-2 rounded px-2 py-1 text-sm"
                      value={String(effectiveWeek)}
                      onChange={(e) =>
                        setSelectedWeek(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                    >
                      {weekSummaries.map((w) => (
                        <option key={w.week} value={w.week}>
                          Week {w.week}
                        </option>
                      ))}
                    </select>
                  </label>
                  {selectedWeekSummary ? (
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      Week {selectedWeekSummary.week}:{" "}
                      <strong>
                        {selectedWeekSummary.record.wins}-{selectedWeekSummary.record.losses}
                      </strong>
                      {selectedWeekSummary.record.pushes > 0
                        ? `-${selectedWeekSummary.record.pushes}`
                        : ""}{" "}
                      - Pending {selectedWeekSummary.record.pending}
                    </div>
                  ) : null}
                  {latestSlateForSelectedWeek ? (
                    <Link
                      href={`/pickem/slate?id=${encodeURIComponent(latestSlateForSelectedWeek.id)}`}
                      className="text-sm text-indigo-700 hover:underline dark:text-indigo-300"
                    >
                      Open Week {latestSlateForSelectedWeek.week} Slate
                    </Link>
                  ) : null}
                </div>

                {selectedWeekSummary && selectedWeekSummary.missed.length > 0 ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-3 dark:border-red-900/70 dark:bg-red-950/40">
                    <div className="mb-2 text-sm font-semibold text-red-900 dark:text-red-100">
                      Missed Picks (Week {selectedWeekSummary.week})
                    </div>
                    <ul className="space-y-1 text-sm text-red-900 dark:text-red-100">
                      {selectedWeekSummary.missed.map((m) => (
                        <li key={`${m.slateId}_${m.gameId}`}>
                          {m.matchup} - Picked {m.picked.toUpperCase()} - Winner {m.winner.toUpperCase()} - Score {m.score}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : selectedWeekSummary ? (
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    No missed picks for selected completed games in this week.
                  </div>
                ) : null}
              </div>

              <div>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="text-sm text-gray-900 dark:text-gray-100">
                    Previous Season Totals
                    <select
                      className="tgem-input ml-2 rounded px-2 py-1 text-sm"
                      value={String(effectivePrevSeason)}
                      onChange={(e) =>
                        setPrevSeason(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                    >
                      {previousSeasons.length === 0 ? (
                        <option value="">None</option>
                      ) : (
                        previousSeasons.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                  {prevSeasonTotal ? (
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {effectivePrevSeason} Total:{" "}
                      <strong>{prevSeasonTotal.wins}-{prevSeasonTotal.losses}</strong>
                      {prevSeasonTotal.pushes > 0 ? `-${prevSeasonTotal.pushes}` : ""} - Pending {prevSeasonTotal.pending}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      No previous season totals yet.
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-700 dark:text-gray-300">
                  Previous seasons show totals only (no pick-level detail), to keep this view clean.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
