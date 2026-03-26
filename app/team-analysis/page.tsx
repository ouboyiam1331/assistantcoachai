"use client";

import Link from "next/link";
import { allLeagues } from "@/lib/leagues/config";

export default function TeamAnalysisHomePage() {
  const analysisLeagues = allLeagues.filter((l) => l.routes.teamAnalysis);

  return (
    <main className="tgem-page px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <div className="mb-4">
            <Link
              href="/"
              className="tgem-button-secondary inline-block rounded-lg px-3 py-2 text-sm font-medium"
            >
              {"< Back"}
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Team Analysis - TGEM Sports
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-gray-700 dark:text-gray-300">
            Explore TGEM-powered analysis by league and team. League availability,
            routes, and readiness are driven from centralized league config.
          </p>
          <p className="mt-2 text-gray-700 dark:text-gray-300">Choose a path below to begin.</p>
        </header>

        <section className="tgem-cta-warm mb-8 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold">College football is live now</h2>
              <p className="tgem-cta-warm-copy mt-2 text-sm leading-7">
                FBS and FCS are the active TGEM paths today. Dive into team dashboards,
                compare schedules, and open matchup analysis to see where the strongest
                edges are starting to show up.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/team-analysis/fbs"
                className="tgem-cta-warm-button rounded-lg px-4 py-2 text-sm font-semibold"
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

        <section className="grid gap-6 md:grid-cols-2">
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
                className={`tgem-surface block rounded-3xl p-6 transition hover:-translate-y-0.5 hover:shadow-md ${
                  comingSoon ? "pointer-events-none opacity-70" : ""
                }`}
              >
                <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {league.label}
                </h2>
                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  Provider: {league.dataProvider.toUpperCase()} - Unit: {league.seasonRules.unitLabel}
                  {comingSoon ? " - Coming soon" : ""}
                </p>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}
