"use client";

import Link from "next/link";
import { allLeagues } from "@/lib/leagues/config";

export default function TeamAnalysisHomePage() {
  const analysisLeagues = allLeagues.filter((l) => l.routes.teamAnalysis);

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <header className="max-w-4xl mx-auto mb-8">
        <div className="mb-4">
          <Link
            href="/"
            className="inline-block rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            {"< Back"}
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Team Analysis - TGEM Sports</h1>
        <p className="mt-3 text-gray-900 text-lg leading-relaxed">
          Explore TGEM-powered analysis by league and team. League availability,
          routes, and readiness are driven from centralized league config.
        </p>
        <p className="mt-2 text-gray-900">Choose a path below to begin.</p>
      </header>

      <section className="max-w-4xl mx-auto mb-8 rounded-2xl border border-red-200 bg-gradient-to-r from-red-700 to-red-600 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold">College football is live now</h2>
            <p className="mt-2 text-sm leading-7 text-red-50">
              FBS and FCS are the active TGEM paths today. Dive into team dashboards,
              compare schedules, and open matchup analysis to see where the strongest
              edges are starting to show up.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/team-analysis/fbs"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              Explore FBS
            </Link>
            <Link
              href="/team-analysis/fcs"
              className="rounded-lg border border-white/60 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Explore FCS
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto grid gap-6 md:grid-cols-2">
        {analysisLeagues.map((league) => {
          const href =
            league.key === "FBS"
              ? "/team-analysis/fbs"
              : league.key === "FCS"
                ? "/team-analysis/fcs"
                : "#";
          const comingSoon = league.comingSoon || !league.enabled;
          return (
            <Link
              key={league.key}
              href={href}
              className={`rounded-xl bg-white p-6 shadow hover:shadow-md border border-gray-200 block ${
                comingSoon ? "pointer-events-none opacity-70" : ""
              }`}
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{league.label}</h2>
              <p className="text-gray-900 text-sm leading-relaxed">
                Provider: {league.dataProvider.toUpperCase()} • Unit: {league.seasonRules.unitLabel}
                {comingSoon ? " • Coming soon" : ""}
              </p>
            </Link>
          );
        })}
      </section>
    </main>
  );
}

