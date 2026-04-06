"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import AdSlot from "@/components/ui/AdSlot";
import { getLeagueConfig, LeagueKey } from "@/lib/leagues/config";

export default function FbsAnalysisHomePage() {
  const router = useRouter();
  const leagueLabel = getLeagueConfig(LeagueKey.FBS).label;

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
                Browse programs, compare team profiles, open schedules, and move directly into TGEM
                matchup reads built for weekly football decisions.
              </p>
            </div>

            <div className="grid gap-4">
              {[
                "Team dashboards with metadata, form, key players, and season totals",
                "Schedule cards that open directly into matchup analysis pages",
                "Conference and alphabetical browse flows for faster weekly research",
              ].map((item) => (
                <div key={item} className="tgem-surface-subtle rounded-2xl p-5 text-sm leading-7 text-gray-700 dark:text-gray-300">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <Link href="/team-analysis/fbs/by-team" className="tgem-surface rounded-3xl p-6 transition hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-700 dark:text-gray-300">
              Browse Path
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Browse by Team
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-300">
              Use the alphabetical list when you already know the program you want and want the
              fastest route into a team dashboard.
            </p>
          </Link>

          <Link
            href="/team-analysis/fbs/by-conference"
            className="tgem-surface rounded-3xl p-6 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-700 dark:text-gray-300">
              Browse Path
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Browse by Conference
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-300">
              Use conference grouping when you want to scan a league cluster, compare programs
              quickly, and open the right dashboard from there.
            </p>
          </Link>
        </section>

        <AdSlot placement="INLINE_1" className="rounded-3xl" />

        <section className="tgem-surface rounded-3xl px-8 py-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            What opens from here
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ["Team Snapshot", "Quick identity details, color profile, venue context, and classification."],
              ["TGEM Read", "A longer model-based team read with grading, stability, and supporting reasons."],
              ["Matchup Analysis", "Schedule links into side-by-side matchup pages with coach-style reads."],
            ].map(([title, copy]) => (
              <div key={title} className="tgem-surface-subtle rounded-2xl p-5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-300">{copy}</p>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Link href="/pickem" className="rounded-lg bg-red-700 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800">
              Take TGEM into Pick&apos;em
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
