"use client";

import Link from "next/link";

export default function TeamAnalysisHomePage() {
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <header className="max-w-4xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Team Analysis – AssistantCoachAI
        </h1>
        <p className="mt-3 text-gray-900 text-lg leading-relaxed">
          Explore TGEM-powered analysis by league and team. Start with college
          football FBS and, in future versions, expand into FCS and NFL.
        </p>
        <p className="mt-2 text-gray-900">
          Choose a path below to begin.
        </p>
      </header>

      <section className="max-w-4xl mx-auto grid gap-6 md:grid-cols-2">
        <Link
          href="/team-analysis/fbs"
          className="rounded-xl bg-white p-6 shadow hover:shadow-md border border-gray-200 block"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            College Football – FBS
          </h2>
          <p className="text-gray-900 text-sm leading-relaxed">
            Browse all FBS programs by team list or by conference, then open
            a TGEM-ready team dashboard with season context and future
            matchup analysis hooks.
          </p>
        </Link>

        <div className="rounded-xl bg-white p-6 shadow border border-gray-200 opacity-80">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Other Leagues (Coming Soon)
          </h2>
          <p className="text-gray-900 text-sm leading-relaxed">
            FCS, NFL, and later college basketball will be added here,
            reusing the same TGEM analysis engine and dashboard pattern.
          </p>
        </div>
      </section>
    </main>
  );
}
