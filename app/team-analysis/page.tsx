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

