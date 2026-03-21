"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getLeagueConfig, LeagueKey } from "@/lib/leagues/config";

export default function FbsAnalysisHomePage() {
  const router = useRouter();
  const leagueLabel = getLeagueConfig(LeagueKey.FBS).label;

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
          Choose how you want to browse teams: alphabetically by team, or grouped by conference.
          Each team opens into a TGEM-driven dashboard.
        </p>
      </header>

      <section className="max-w-4xl mx-auto grid gap-6 md:grid-cols-2">
        <Link
          href="/team-analysis/fbs/by-team"
          className="rounded-xl bg-white p-6 shadow border border-gray-200 hover:shadow-md block"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Browse by Team (Alphabetical)</h2>
          <p className="text-gray-900 text-sm leading-relaxed">
            View an alphabetized list of programs. Search by name, then open the TGEM dashboard.
          </p>
        </Link>

        <Link
          href="/team-analysis/fbs/by-conference"
          className="rounded-xl bg-white p-6 shadow border border-gray-200 hover:shadow-md block"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Browse by Conference</h2>
          <p className="text-gray-900 text-sm leading-relaxed">
            Start from conference groupings, expand a conference, then pick a team.
          </p>
        </Link>
      </section>
    </main>
  );
}

