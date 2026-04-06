"use client";

import Link from "next/link";
import AdSlot from "@/components/ui/AdSlot";
import { allLeagues } from "@/lib/leagues/config";

export default function TeamAnalysisHomePage() {
  const analysisLeagues = allLeagues.filter((league) => league.routes.teamAnalysis);

  return (
    <main className="tgem-page px-6 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="tgem-surface rounded-3xl px-8 py-10">
          <div className="mb-5">
            <Link
              href="/"
              className="tgem-button-secondary inline-flex rounded-lg px-3 py-2 text-sm font-medium"
            >
              {"< Back"}
            </Link>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-700 dark:text-gray-300">
                College Football Analysis
              </p>
              <h1 className="mt-3 text-4xl font-bold text-gray-900 dark:text-gray-100 sm:text-5xl">
                Find the weekly edge faster
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-700 dark:text-gray-300">
                Explore TGEM-powered team dashboards, schedules, matchup pages, and side-by-side
                comparisons built for users who want more than surface-level football stats.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/team-analysis/fbs"
                  className="rounded-lg bg-red-700 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800"
                >
                  Explore FBS
                </Link>
                <Link
                  href="/team-analysis/fcs"
                  className="rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                >
                  Explore FCS
                </Link>
              </div>
            </div>

            <div className="grid gap-4">
              {[
                {
                  title: "Team Dashboards",
                  text: "Open a full TGEM view with team snapshot, season form, key players, and schedule context.",
                },
                {
                  title: "Matchup Pages",
                  text: "Move from a team schedule into a cleaner TGEM read with comparison tables and coach-style analysis.",
                },
                {
                  title: "Weekly Utility",
                  text: "Use the analysis flow to build better pick'em boards and spot stronger weekly football edges.",
                },
              ].map((item) => (
                <div key={item.title} className="tgem-surface-subtle rounded-2xl p-5">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {item.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-300">
                    {item.text}
                  </p>
                </div>
              ))}
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
                  : league.key === "NFL"
                    ? "/team-analysis/nfl"
                    : "#";

            const comingSoon = league.key === "NFL" ? true : league.comingSoon || !league.enabled;

            return (
              <Link
                key={league.key}
                href={href}
                className={`tgem-surface rounded-3xl p-6 transition hover:-translate-y-0.5 hover:shadow-md ${
                  comingSoon ? "opacity-80" : ""
                }`}
              >
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-700 dark:text-gray-300">
                  {comingSoon ? "Development Path" : "Live Analysis Path"}
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {league.label}
                </h2>
                <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-300">
                  {league.key === "FBS"
                    ? "Browse programs by team or conference, then open TGEM-driven team and matchup pages."
                    : league.key === "FCS"
                      ? "Study FCS programs with the same dashboard structure, matchup reads, and schedule flow."
                      : "NFL remains in development right now and is not part of the live production push yet."}
                </p>
                <div className="mt-5 flex flex-wrap gap-2 text-xs text-gray-700 dark:text-gray-300">
                  {[
                    `Provider: ${league.dataProvider.toUpperCase()}`,
                    `Unit: ${league.seasonRules.unitLabel}`,
                    comingSoon ? "Status: In development" : "Status: Live",
                  ].map((flag) => (
                    <span key={flag} className="tgem-surface-subtle rounded-full px-3 py-1">
                      {flag}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </section>

        <AdSlot placement="INLINE_1" className="rounded-3xl" />

        <section className="tgem-cta-warm px-8 py-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em]">How To Use It</p>
          <h2 className="mt-3 text-3xl font-bold">Start with teams, then move into matchups</h2>
          <p className="tgem-cta-warm-copy mt-4 max-w-3xl text-base leading-8">
            The best workflow is to open a team dashboard first, understand the profile, then move
            into individual matchup pages to see how TGEM frames the weekly spot.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link href="/how-tgem-works" className="tgem-cta-warm-button rounded-lg px-5 py-3 text-sm font-semibold">
              How TGEM Works
            </Link>
            <Link href="/pickem-strategy" className="rounded-lg border border-white/25 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
              Pick&apos;em Strategy
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
