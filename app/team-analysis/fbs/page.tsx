"use client";

import Link from "next/link";

export default function FbsAnalysisHomePage() {
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <header className="max-w-4xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          College Football – FBS Team Analysis
        </h1>
        <p className="mt-3 text-gray-900 text-lg leading-relaxed">
          Choose how you want to browse FBS teams: alphabetically by team,
          or grouped by conference. Each team opens into a TGEM-driven
          team dashboard.
        </p>
      </header>

      <section className="max-w-4xl mx-auto grid gap-6 md:grid-cols-2">
        <Link
          href="/team-analysis/fbs/by-team"
          className="rounded-xl bg-white p-6 shadow border border-gray-200 hover:shadow-md block"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Browse by Team (Alphabetical)
          </h2>
          <p className="text-gray-900 text-sm leading-relaxed">
            View an alphabetized list of all 134 FBS programs. Search by
            name, then tap a team to open its TGEM dashboard.
          </p>
        </Link>

        <Link
          href="/team-analysis/fbs/by-conference"
          className="rounded-xl bg-white p-6 shadow border border-gray-200 hover:shadow-md block"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Browse by Conference
          </h2>
          <p className="text-gray-900 text-sm leading-relaxed">
            Start from AAC, ACC, Big Ten, Big 12, SEC, Pac-12, and all
            Group of Five leagues. Expand a conference, then pick a team.
          </p>
        </Link>
      </section>
    </main>
  );
}
