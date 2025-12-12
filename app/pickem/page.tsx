"use client";

import Link from "next/link";

export default function PickemHomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-100">
      <div className="w-full max-w-4xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 text-center">
            Pick&apos;em Mode – AssistantCoachAI
          </h1>
          <p className="mt-4 text-gray-900 text-center max-w-2xl mx-auto text-lg leading-relaxed">
            Build weekly pick&apos;em slates, let TGEM suggest winners and confidence
            levels, then track how you perform over the season.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Create New Slate */}
          <div className="rounded-xl bg-white p-6 shadow border border-gray-200 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Create a New Slate
              </h2>
              <p className="text-sm text-gray-900 mb-4 leading-relaxed">
                Start a fresh pick&apos;em slate for a given season and week. You&apos;ll
                add games, run TGEM analysis, lock your picks, and later enter results
                to see your record.
              </p>
            </div>
            <Link
              href="/pickem/new-slate"
              className="mt-2 inline-block rounded-lg bg-red-700 px-5 py-2 text-sm font-semibold text-white hover:bg-red-800 text-center"
            >
              Create New Slate
            </Link>
          </div>

          {/* Slates Dashboard (future) */}
          <div className="rounded-xl bg-white p-6 shadow border border-gray-200 flex flex-col justify-between opacity-90">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                My Slates (Coming Soon)
              </h2>
              <p className="text-sm text-gray-900 mb-4 leading-relaxed">
                This will display all of your saved slates by season and week, along
                with your W–L records. You&apos;ll be able to reopen any slate and see
                how TGEM performed.
              </p>
            </div>
            <button
              disabled
              className="mt-2 inline-block rounded-lg bg-gray-400 px-5 py-2 text-sm font-semibold text-gray-900 cursor-not-allowed"
            >
              Slates Dashboard (Soon)
            </button>
          </div>
        </div>

        <div className="mt-10 max-w-3xl mx-auto text-sm text-gray-900 text-center leading-relaxed">
          <p>
            Future versions will support private leagues, shared slates, premium TGEM
            breakdowns, and export tools. For now, we&apos;re focused on building a
            rock-solid single-user slate flow.
          </p>
        </div>
      </div>
    </main>
  );
}
