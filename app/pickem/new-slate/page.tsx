"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  createSlate,
  type PickemEntryMode,
  type PickemMode,
} from "@/lib/pickem/storage";
import { LeagueKey, leagueConfig } from "@/lib/leagues/config";
import { getCurrentCollegePickemContext } from "@/lib/pickem/currentContext";

function phaseLabel(phase: "regular" | "championship" | "postseason") {
  if (phase === "postseason") return "Bowl / CFP / Postseason";
  if (phase === "championship") return "Championship";
  return "Regular Season";
}

export default function NewSlatePage() {
  const router = useRouter();
  const currentContext = useMemo(() => getCurrentCollegePickemContext(), []);
  const [slateName, setSlateName] = useState("");
  const [weekOrRound, setWeekOrRound] = useState("");
  const [mode, setMode] = useState<PickemMode>("college");
  const [entryMode, setEntryMode] = useState<PickemEntryMode>("auto");

  const modeLeague: Record<typeof mode, LeagueKey> = {
    college: LeagueKey.FBS,
    nfl: LeagueKey.NFL,
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const slate = createSlate({
      slateName,
      season: currentContext.season,
      week: currentContext.week,
      weekOrRound: weekOrRound || currentContext.weekOrRound,
      mode,
      entryMode,
      phase: currentContext.phase,
      league: modeLeague[mode],
      createdBy: "local-dev",
    });
    router.push(`/pickem/slate?id=${encodeURIComponent(slate.id)}`);
  }

  return (
    <main className="tgem-page px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
          <Link href="/pickem" className="hover:underline">
            {"< Back to Pick'em Hub"}
          </Link>
        </div>

        <section className="tgem-surface rounded-3xl p-6">
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Create a New Pick&apos;em Slate
          </h1>
          <p className="mb-6 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            Define the basics for this slate. Season, week, and phase are set
            automatically to the current college football slate context.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-900 dark:text-gray-100">
                Slate Name
              </label>
              <input
                type="text"
                value={slateName}
                onChange={(e) => setSlateName(e.target.value)}
                placeholder={`e.g., "Week ${currentContext.week} - TGEM Board"`}
                className="tgem-input w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-900 dark:text-gray-100">
                  Season (Auto)
                </label>
                <div className="tgem-surface-subtle rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
                  {currentContext.season}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-900 dark:text-gray-100">
                  Week (Auto)
                </label>
                <div className="tgem-surface-subtle rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
                  Week {currentContext.week}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-900 dark:text-gray-100">
                Week or Round Label
              </label>
              <input
                type="text"
                value={weekOrRound}
                onChange={(e) => setWeekOrRound(e.target.value)}
                className="tgem-input w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                placeholder={`Default: Week ${currentContext.week}`}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-gray-100">
                TGEM Phase (Auto)
              </label>
              <div className="tgem-surface-subtle rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
                {phaseLabel(currentContext.phase)}
              </div>
              <p className="mt-2 text-xs text-gray-700 dark:text-gray-300">
                TGEM phase is derived automatically from the current week.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-gray-100">
                League
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMode("college")}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    mode === "college"
                      ? "border-red-700 bg-red-50 text-red-900 dark:border-red-500 dark:bg-red-950/40 dark:text-red-100"
                      : "tgem-button-secondary"
                  }`}
                >
                  College Football
                </button>
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-500"
                >
                  {leagueConfig.NFL.label} (Coming Soon)
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-gray-100">
                Slate Setup
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setEntryMode("auto")}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    entryMode === "auto"
                      ? "border-red-700 bg-red-50 text-red-900 dark:border-red-500 dark:bg-red-950/40 dark:text-red-100"
                      : "tgem-button-secondary"
                  }`}
                >
                  Auto (All Games)
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode("manual")}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    entryMode === "manual"
                      ? "border-red-700 bg-red-50 text-red-900 dark:border-red-500 dark:bg-red-950/40 dark:text-red-100"
                      : "tgem-button-secondary"
                  }`}
                >
                  Manual (Pick Games)
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-700 dark:text-gray-300">
                {entryMode === "auto"
                  ? "Auto loads the full current-week slate."
                  : "Manual lets you add only the matchups you want."}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="rounded-lg bg-emerald-700 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Continue to Slate
              </button>
              <p className="text-xs text-gray-700 dark:text-gray-300">
                Next: load the current week and start making picks.
              </p>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
