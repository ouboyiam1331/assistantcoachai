"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSlate } from "@/lib/pickem/storage";
import { LeagueKey, leagueConfig } from "@/lib/leagues/config";

export default function NewSlatePage() {
  const router = useRouter();
  const [slateName, setSlateName] = useState("");
  const [season, setSeason] = useState(2025);
  const [weekNumber, setWeekNumber] = useState<number | "">("");
  const [weekOrRound, setWeekOrRound] = useState("");
  const [mode, setMode] = useState<"college-fbs" | "college-fcs" | "nfl">("college-fbs");

  const modeLeague: Record<typeof mode, LeagueKey> = {
    "college-fbs": LeagueKey.FBS,
    "college-fcs": LeagueKey.FCS,
    nfl: LeagueKey.NFL,
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const week = Number(weekNumber);
    const slate = createSlate({
      slateName,
      season,
      week,
      weekOrRound: weekOrRound || String(week),
      mode,
      league: modeLeague[mode],
      createdBy: "local-dev",
    });
    router.push(`/pickem/slate?id=${encodeURIComponent(slate.id)}`);
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-gray-900">
        <Link href="/pickem" className="hover:underline">
          ? Back to Pick&apos;em Hub
        </Link>
      </div>

      <section className="max-w-3xl mx-auto rounded-xl bg-white p-6 shadow border border-gray-200">
        <h1 className="text-2xl font-bold mb-2 text-gray-900">Create a New Pick&apos;em Slate</h1>
        <p className="text-sm text-gray-900 mb-6 leading-relaxed">
          Define the basics for this slate. In later steps, you&apos;ll add games and
          let TGEM analyze each matchup.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Slate Name</label>
            <input
              type="text"
              value={slateName}
              onChange={(e) => setSlateName(e.target.value)}
              placeholder='e.g., "Week 1 - Opening Weekend"'
              className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-700"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Season (Year)</label>
              <input
                type="number"
                value={season}
                onChange={(e) => setSeason(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-700"
                min={2000}
                max={2100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Week Number</label>
              <input
                type="number"
                value={weekNumber}
                onChange={(e) => {
                  const val = e.target.value;
                  setWeekNumber(val === "" ? "" : Number(val));
                }}
                className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-700"
                min={1}
                max={30}
                placeholder="e.g., 1, 2, 3..."
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Week or Round Label</label>
            <input
              type="text"
              value={weekOrRound}
              onChange={(e) => setWeekOrRound(e.target.value)}
              className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-700"
              placeholder="e.g., Week 1, Conference Championship, Round of 64"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Slate Type</label>
            <div className="grid gap-3 md:grid-cols-3">
              <button
                type="button"
                onClick={() => setMode("college-fbs")}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  mode === "college-fbs"
                    ? "border-red-700 bg-red-50 text-red-900"
                    : "border-gray-400 text-gray-900 hover:bg-gray-100"
                }`}
              >
                {leagueConfig.FBS.label}
              </button>
              <button
                type="button"
                onClick={() => setMode("college-fcs")}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  mode === "college-fcs"
                    ? "border-red-700 bg-red-50 text-red-900"
                    : "border-gray-400 text-gray-900 hover:bg-gray-100"
                }`}
              >
                {leagueConfig.FCS.label}
              </button>
              <button
                type="button"
                onClick={() => setMode("nfl")}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  mode === "nfl"
                    ? "border-red-700 bg-red-50 text-red-900"
                    : "border-gray-400 text-gray-900 hover:bg-gray-100"
                }`}
              >
                {leagueConfig.NFL.label}
              </button>
            </div>
          </div>

          <div className="pt-2 flex gap-3 items-center">
            <button
              type="submit"
              className="rounded-lg bg-emerald-700 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Continue to Slate
            </button>
            <p className="text-xs text-gray-900">Next: load week games and start making picks.</p>
          </div>
        </form>
      </section>
    </main>
  );
}

