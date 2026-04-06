"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import AdSlot from "@/components/ui/AdSlot";
import { getLeagueConfig, LeagueKey } from "@/lib/leagues/config";

export default function FcsAnalysisHomePage() {
  const router = useRouter();
  const leagueLabel = getLeagueConfig(LeagueKey.FCS).label;

  return (
    <main className="tgem-page px-6 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="tgem-surface rounded-3xl px-8 py-10">
          <button
            type="button"
            onClick={() => router.push("/team-analysis")}
            className="tgem-button-secondary mb-5 rounded-lg px-3 py-2 text-sm font-medium"
          >
            {"< Back"}
          </button>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-700 dark:text-gray-300">
                Live College Football Path
              </p>
              <h1 className="mt-3 text-4xl font-bold text-gray-900 dark:text-gray-100 sm:text-5xl">
                {leagueLabel} Team Analysis
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-700 dark:text-gray-300">
                Explore FCS programs with the same TGEM flow: team dashboards, schedule context,
                matchup pages, and cleaner weekly football reads.
              </p>
            </div>

            <div className="grid gap-4">
              {[
                "Team pages that keep metadata, season form, TGEM read, and matchup access in one place",
                "Conference browsing that makes deeper FCS research easier to scan",
                "Matchup pages that preserve the model logic but present it in a cleaner format",
              ].map((item) => (
                <div key={item} className="tgem-surface-subtle rounded-2xl p-5 text-sm leading-7 text-gray-700 dark:text-gray-300">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <Link href="/team-analysis/fcs/by-team" className="tgem-surface rounded-3xl p-6 transition hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-700 dark:text-gray-300">
              Browse Path
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Browse by Team
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-300">
              Use the alphabetical path when you want the fastest route to a specific FCS team page.
            </p>
          </Link>

          <Link
            href="/team-analysis/fcs/by-conference"
            className="tgem-surface rounded-3xl p-6 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-700 dark:text-gray-300">
              Browse Path
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Browse by Conference
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-300">
              Use conference groupings when you want to compare multiple programs in the same part
              of the subdivision before opening a team page.
            </p>
          </Link>
        </section>

        <AdSlot placement="INLINE_1" className="rounded-3xl" />

        <section className="tgem-surface rounded-3xl px-8 py-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Why the FCS path matters
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ["More structure", "The same TGEM organization helps make FCS boards easier to understand quickly."],
              ["Better matchup access", "Schedule rows open directly into matchup pages so the research flow stays simple."],
              ["Pick'em support", "The platform is still designed to help users carry football reads into weekly contest decisions."],
            ].map(([title, copy]) => (
              <div key={title} className="tgem-surface-subtle rounded-2xl p-5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-300">{copy}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link href="/how-tgem-works" className="rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200">
              How TGEM Works
            </Link>
            <Link href="/pickem" className="rounded-lg border border-[var(--tgem-border)] px-5 py-3 text-sm font-semibold text-gray-900 hover:bg-[var(--tgem-surface-subtle)] dark:text-gray-100">
              Open Pick&apos;em
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
