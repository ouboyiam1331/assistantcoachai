const trustMarkers = [
  "Veteran-Owned",
  "Computer Science Degree",
  "Built from Real Pick'em Experience",
];

export default function AboutFounder() {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white px-8 py-10 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-700 dark:text-red-400">
        Who Built It
      </p>
      <h2 className="mt-3 max-w-4xl text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl">
        Built with football passion, technical skill, and a competitive mindset
      </h2>
      <p className="mt-5 max-w-3xl text-base leading-8 text-gray-700 dark:text-gray-300">
        TGEM Sports is a veteran-owned platform built by a Troy University graduate
        with a degree in computer science and a passion for football, competition,
        and analysis.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {trustMarkers.map((marker) => (
          <div
            key={marker}
            className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-center text-sm font-semibold text-gray-900 shadow-sm dark:border-gray-800 dark:bg-gray-950/60 dark:text-gray-100"
          >
            {marker}
          </div>
        ))}
      </div>
    </section>
  );
}
