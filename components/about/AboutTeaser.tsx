import Link from "next/link";

const reasons = [
  "Built from real pick'em competition",
  "Structured football analysis",
  "Designed to help users make smarter picks",
];

export default function AboutTeaser() {
  return (
    <section className="mt-10 w-full rounded-3xl border border-gray-200 bg-white px-8 py-10 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="grid gap-8 lg:grid-cols-[1.7fr_1fr] lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-700 dark:text-red-400">
            About TGEM Sports
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl">
            Built by a competitor. Designed for an edge.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-gray-700 dark:text-gray-300">
            TGEM Sports was created during the 2025 college football season to turn
            weekly pick&apos;em guesses into structured, data-driven decisions. Built by
            a U.S. Army veteran and Troy University computer science graduate, TGEM
            blends football passion, analytics, and real-game context into a smarter
            way to read the week.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/about"
              className="rounded-lg bg-red-700 px-6 py-3 text-center text-base font-semibold text-white transition hover:bg-red-800"
            >
              Learn More About TGEM
            </Link>
            <Link
              href="/team-analysis"
              className="rounded-lg border border-gray-300 px-6 py-3 text-center text-base font-semibold text-gray-900 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              Explore Team Analysis
            </Link>
          </div>
        </div>

        <aside className="rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950/60">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Why TGEM exists
          </h3>
          <ul className="mt-4 space-y-3">
            {reasons.map((reason) => (
              <li key={reason} className="flex gap-3 text-sm leading-7 text-gray-700 dark:text-gray-300">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-red-700 dark:bg-red-400" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
