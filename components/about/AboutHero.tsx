import Link from "next/link";

const glanceCards = [
  {
    title: "Founded from competition",
    text: "Born during a 2025 workplace pick'em run.",
  },
  {
    title: "Built with structure",
    text: "Designed to turn weekly reads into repeatable analysis.",
  },
  {
    title: "Made for competitors",
    text: "Built for users who want more than surface-level stats.",
  },
];

export default function AboutHero() {
  return (
    <section className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr] lg:items-center">
      <div className="rounded-3xl border border-gray-200 bg-white px-8 py-10 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-700 dark:text-red-400">
          Veteran-Owned Sports Analytics Platform
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl">
          Built to give everyday fans a smarter edge
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-700 dark:text-gray-300">
          TGEM Sports was created to help users break down teams, evaluate
          matchups, and make more confident picks through structured football
          analysis.
        </p>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/team-analysis"
            className="rounded-lg bg-red-700 px-6 py-3 text-center text-base font-semibold text-white transition hover:bg-red-800"
          >
            Explore TGEM
          </Link>
          <Link
            href="/pickem"
            className="rounded-lg border border-gray-300 px-6 py-3 text-center text-base font-semibold text-gray-900 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            Go to Pick&apos;em
          </Link>
        </div>
      </div>

      <aside className="rounded-3xl border border-gray-200 bg-white px-6 py-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          TGEM at a glance
        </h2>
        <div className="mt-5 space-y-4">
          {glanceCards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950/60"
            >
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {card.title}
              </h3>
              <p className="mt-2 text-sm leading-7 text-gray-700 dark:text-gray-300">
                {card.text}
              </p>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}
