export default function AboutMission() {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white px-8 py-10 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-700 dark:text-red-400">
            The Mission
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl">
            Help users make smarter football decisions every week
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-8 text-gray-700 dark:text-gray-300">
            TGEM Sports exists to help users make smarter football decisions every
            week by combining structured analysis, clear reads, and a competitive
            mindset.
          </p>
        </div>

        <blockquote className="rounded-2xl border border-red-200 bg-red-50 p-6 text-lg font-semibold leading-8 text-red-950 shadow-sm dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-100">
          &quot;Built for people who don&apos;t just watch the games - they want to win
          them.&quot;
        </blockquote>
      </div>
    </section>
  );
}
