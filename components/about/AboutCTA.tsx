import Link from "next/link";

export default function AboutCTA() {
  return (
    <section className="tgem-cta-warm px-8 py-10">
      <p className="tgem-cta-warm-copy text-sm font-semibold uppercase tracking-[0.2em]">
        Ready to See TGEM in Action?
      </p>
      <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
        Explore the platform and start your weekly edge
      </h2>
      <p className="tgem-cta-warm-copy mt-5 max-w-3xl text-base leading-8">
        At its core, TGEM is built for competitors - people who don&apos;t just watch
        the games, but want a better way to win them.
      </p>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <Link
          href="/team-analysis"
          className="tgem-cta-warm-button rounded-lg px-6 py-3 text-center text-base font-semibold transition"
        >
          Explore Team Analysis
        </Link>
        <Link
          href="/pickem"
          className="rounded-lg border border-white/60 px-6 py-3 text-center text-base font-semibold text-white transition hover:bg-white/10"
        >
          Start Pick&apos;em
        </Link>
      </div>
    </section>
  );
}
