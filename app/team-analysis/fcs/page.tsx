"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getLeagueConfig, LeagueKey } from "@/lib/leagues/config";

export default function FcsAnalysisHomePage() {
  const router = useRouter();
  const leagueLabel = getLeagueConfig(LeagueKey.FCS).label;

  return (
    <main className="tgem-page px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <button
            type="button"
            onClick={() => router.push("/team-analysis")}
            className="tgem-button-secondary mb-4 rounded-lg px-3 py-2 text-sm font-medium"
          >
            {"< Back"}
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {leagueLabel} Team Analysis
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-gray-700 dark:text-gray-300">
            Browse programs and open a TGEM-ready dashboard with metadata, season stats,
            schedule, and matchup analysis.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <Link href="/team-analysis/fcs/by-team" className="tgem-surface rounded-3xl p-6 transition hover:shadow-md">
            <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
              Browse by Team (Alphabetical)
            </h2>
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              View an alphabetized list of programs and open a team dashboard.
            </p>
          </Link>

          <Link
            href="/team-analysis/fcs/by-conference"
            className="tgem-surface rounded-3xl p-6 transition hover:shadow-md"
          >
            <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
              Browse by Conference
            </h2>
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              Expand each conference to view teams, then open a TGEM dashboard directly.
            </p>
          </Link>
        </section>
      </div>
    </main>
  );
}
