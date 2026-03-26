const highlights = [
  {
    title: "Started in 2025",
    text: "Built during a real college football pick'em cycle.",
  },
  {
    title: "Built from real use",
    text: "Designed around actual weekly matchup decisions.",
  },
  {
    title: "Turned into TGEM Sports",
    text: "Evolved into a public sports analysis platform.",
  },
];

export default function AboutOrigin() {
  return (
    <section className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr] lg:items-start">
      <div className="rounded-3xl border border-gray-200 bg-white px-8 py-10 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-700 dark:text-red-400">
          How TGEM Started
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl">
          From a workplace pick&apos;em idea to a live platform
        </h2>
        <p className="mt-5 max-w-3xl text-base leading-8 text-gray-700 dark:text-gray-300">
          The Tactical Game Evaluation Model began during the 2025 college football
          season in a workplace pick&apos;em league. What started as a way to gain an
          edge turned into a full evaluation model focused on combining team data,
          situational factors, and football context into a more consistent way to
          read matchups.
        </p>
      </div>

      <aside className="rounded-3xl border border-gray-200 bg-white px-6 py-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Origin Highlights
        </h3>
        <div className="mt-5 space-y-4">
          {highlights.map((highlight) => (
            <div
              key={highlight.title}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950/60"
            >
              <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {highlight.title}
              </h4>
              <p className="mt-2 text-sm leading-7 text-gray-700 dark:text-gray-300">
                {highlight.text}
              </p>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}
