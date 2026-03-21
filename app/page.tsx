"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-10 bg-gray-100">
      <h1 className="text-4xl font-bold text-center text-gray-900">
        TGEM Sports<sup className="tgem-tm">TM</sup>
      </h1>

      <p className="mt-4 text-gray-900 text-center max-w-2xl text-lg leading-relaxed">
        Powered by the Tactical Game Evaluation Model
        <sup className="tgem-tm">TM</sup> (v11.0)
      </p>

      <p className="mt-3 text-gray-900 text-center max-w-2xl text-lg leading-relaxed">
        Advanced college football analytics, matchup projections, and
        confidence-weighted insights for FBS &amp; FCS.
      </p>

      <div className="mt-10 flex flex-col sm:flex-row gap-6">
        <Link
          href="/team-analysis"
          className="rounded-lg bg-red-700 px-6 py-3 text-white font-semibold hover:bg-red-800 text-center text-base"
        >
          Team Analysis
        </Link>

        <Link
          href="/pickem"
          className="rounded-lg bg-emerald-700 px-6 py-3 text-white font-semibold hover:bg-emerald-800 text-center text-base"
        >
          Pick&apos;em Mode
        </Link>
      </div>

      <div className="mt-8 flex items-center gap-4 text-sm text-gray-700">
        <Link href="/privacy-policy" className="underline hover:text-gray-900">
          Privacy Policy
        </Link>
        <span aria-hidden="true">|</span>
        <Link href="/terms-of-service" className="underline hover:text-gray-900">
          Terms of Service
        </Link>
      </div>
    </main>
  );
}
