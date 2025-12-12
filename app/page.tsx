"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-10 bg-gray-100">
      <h1 className="text-4xl font-bold text-center text-gray-900">
        AssistantCoachAI{" "}
        <span className="text-red-700">powered by TGEM</span>
      </h1>

      <p className="mt-4 text-gray-900 text-center max-w-xl text-lg leading-relaxed">
        Your virtual assistant coach for team analysis, pick&apos;em strategy,
        and deep matchup insights – built on the Tactical Game Evaluation
        Model (TGEM v10.0).
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
    </main>
  );
}
