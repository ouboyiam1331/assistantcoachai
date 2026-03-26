const futureTags = ["NFL", "College Basketball", "Premium Insights", "AI Coach", "Competitive Modes"];

export default function AboutFuture() {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white px-8 py-10 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-700 dark:text-red-400">
        What&apos;s Next
      </p>
      <h2 className="mt-3 max-w-4xl text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl">
        TGEM Sports is still getting started
      </h2>
      <p className="mt-5 max-w-3xl text-base leading-8 text-gray-700 dark:text-gray-300">
        Future expansion includes deeper matchup tools, broader sports coverage, and
        new ways for users to interact with the model.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        {futureTags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-800 dark:border-gray-700 dark:bg-gray-950/60 dark:text-gray-200"
          >
            {tag}
          </span>
        ))}
      </div>
    </section>
  );
}
