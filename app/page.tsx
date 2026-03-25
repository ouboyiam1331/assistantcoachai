"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 px-6 py-12 text-gray-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center">
        <section className="w-full rounded-3xl bg-white px-8 py-14 text-center shadow-sm">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            TGEM Sports<sup className="tgem-tm">TM</sup>
          </h1>

          <p className="mt-4 mx-auto max-w-2xl text-lg leading-relaxed text-gray-900">
            Powered by the Tactical Game Evaluation Model
            <sup className="tgem-tm">TM</sup> (v11.0)
          </p>

          <p className="mt-3 mx-auto max-w-2xl text-lg leading-relaxed text-gray-900">
            Advanced college football analytics, matchup projections, and
            confidence-weighted insights for college football, with other sports
            coming soon.
          </p>

          <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:justify-center">
            <Link
              href="/team-analysis"
              className="rounded-lg bg-red-700 px-6 py-3 text-center text-base font-semibold text-white hover:bg-red-800"
            >
              Team Analysis
            </Link>

            <Link
              href="/pickem"
              className="rounded-lg bg-emerald-700 px-6 py-3 text-center text-base font-semibold text-white hover:bg-emerald-800"
            >
              Pick&apos;em Mode
            </Link>
          </div>
        </section>

        <section className="mt-10 grid w-full gap-8 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-3xl bg-white px-8 py-10 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">
              College Football Pick&apos;em Predictions &amp; Analysis
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-gray-700">
              TGEM Sports provides advanced college football predictions, matchup
              analysis, and weekly pick&apos;em insights powered by the Tactical Game
              Evaluation Model (TGEM). Analyze team performance, compare matchups,
              and gain an edge in your pick&apos;em leagues.
            </p>
          </div>

          <aside className="rounded-3xl bg-white px-8 py-10 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">Latest TGEM Insights</h2>
            <ul className="mt-5 space-y-3 text-base text-gray-700">
              <li>Week 1 Pick&apos;em Predictions</li>
              <li>Top 5 Matchups This Week</li>
              <li>Upset Alert: Troy vs UAB</li>
            </ul>
          </aside>
        </section>

        <div className="mt-8 flex items-center gap-4 text-sm text-gray-700">
          <Link href="/privacy-policy" className="underline hover:text-gray-900">
            Privacy Policy
          </Link>
          <span aria-hidden="true">|</span>
          <Link href="/terms-of-service" className="underline hover:text-gray-900">
            Terms of Service
          </Link>
        </div>
      </div>
    </main>
  );
}
