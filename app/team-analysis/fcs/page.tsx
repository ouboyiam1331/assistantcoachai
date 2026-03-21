"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getLeagueConfig, LeagueKey } from "@/lib/leagues/config";

export default function FcsAnalysisHomePage() {
  const router = useRouter();
  const leagueLabel = getLeagueConfig(LeagueKey.FCS).label;

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <header className="max-w-4xl mx-auto mb-8">
        <button
          type="button"
          onClick={() => router.push("/team-analysis")}
          className="mb-4 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          {"< Back"}
        </button>
        <h1 className="text-3xl font-bold text-gray-900">{leagueLabel} Team Analysis</h1>
        <p className="mt-3 text-gray-900 text-lg leading-relaxed">
          Browse programs and open a TGEM-ready dashboard with metadata, season stats,
          schedule, and matchup analysis.
        </p>
      </header>

      <section className="max-w-4xl mx-auto grid gap-6 md:grid-cols-2">
        <Link
          href="/team-analysis/fcs/by-team"
          className="rounded-xl bg-white p-6 shadow border border-gray-200 hover:shadow-md block"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Browse by Team (Alphabetical)</h2>
          <p className="text-gray-900 text-sm leading-relaxed">
            View an alphabetized list of programs and open a team dashboard.
          </p>
        </Link>

        <Link
          href="/team-analysis/fcs/by-conference"
          className="rounded-xl bg-white p-6 shadow border border-gray-200 hover:shadow-md block"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Browse by Conference</h2>
          <p className="text-gray-900 text-sm leading-relaxed">
            Expand each conference to view teams, then open a TGEM dashboard directly.
          </p>
        </Link>
      </section>
    </main>
  );
}

