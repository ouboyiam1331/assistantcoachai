import type { Metadata } from "next";
import Link from "next/link";
import AboutTeaser from "@/components/about/AboutTeaser";
import TgemSportsLogo from "@/components/branding/TgemSportsLogo";
import { getHomepageSummary } from "@/lib/homepage/summary";

export async function generateMetadata(): Promise<Metadata> {
  const summary = getHomepageSummary();

  return {
    title: "TGEM Sports | College Football Picks & Analytics",
    description: summary.seoDescription,
    keywords: [
      "college football picks",
      "pick'em predictions",
      "sports analytics",
      "football predictions",
      "college football analysis",
      "TGEM Sports",
      "matchup insights",
    ],
  };
}

export default async function Home() {
  const summary = getHomepageSummary();

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-12 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center">
        <section className="w-full rounded-3xl border border-gray-200 bg-white px-8 py-14 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 sm:text-5xl">
                TGEM Sports<sup className="tgem-tm">TM</sup>
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-gray-900 dark:text-gray-100">
                Powered by the Tactical Game Evaluation Model
                <sup className="tgem-tm">TM</sup> (v11.0)
              </p>

              <p className="mt-3 max-w-2xl text-lg leading-relaxed text-gray-900 dark:text-gray-100">
                {summary.heroBlurb}
              </p>

              <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:justify-center lg:justify-start">
                <Link
                  href="/team-analysis"
                  className="rounded-lg bg-red-700 px-6 py-3 text-center text-base font-semibold text-white hover:bg-red-800"
                >
                  Team Analysis
                </Link>

                <Link
                  href="/pickem"
                  className="rounded-lg bg-emerald-700 px-6 py-3 text-center text-base font-semibold text-white hover:bg-emerald-800"
                >
                  Pick&apos;em Mode
                </Link>
              </div>
            </div>

            <div className="mx-auto w-full max-w-md">
              <TgemSportsLogo />
            </div>
          </div>
        </section>

        <section className="mt-10 w-full rounded-3xl border border-gray-200 bg-white px-8 py-10 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summary.seoHeading}</h2>
          <p className="mt-4 max-w-4xl text-base leading-8 text-gray-700 dark:text-gray-300">
            {summary.seoDescription}
          </p>
        </section>

        <AboutTeaser />

        <section className="mt-10 w-full rounded-3xl border border-gray-200 bg-white px-8 py-10 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Latest TGEM Insights</h2>
          <p className="mt-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Early reads are coming into focus
          </p>
          <p className="mt-2 max-w-3xl leading-7 text-gray-700 dark:text-gray-300">
            TGEM is tracking matchup edges, team strengths, and key indicators to
            give you a clear read on the week ahead.
          </p>
          <ul className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {summary.insights.map((insight) => (
              <li
                key={insight.title}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950/60"
              >
                <Link
                  href={insight.href}
                  className="font-semibold text-gray-900 hover:underline dark:text-gray-100"
                >
                  {insight.title}
                </Link>
                <p className="mt-2 leading-7 text-gray-700 dark:text-gray-300">{insight.detail}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-8 flex items-center gap-4 text-sm text-gray-700 dark:text-gray-300">
          <Link href="/privacy-policy" className="underline hover:text-gray-900 dark:hover:text-gray-100">
            Privacy Policy
          </Link>
          <span aria-hidden="true">|</span>
          <Link href="/terms-of-service" className="underline hover:text-gray-900 dark:hover:text-gray-100">
            Terms of Service
          </Link>
        </div>
      </div>
    </main>
  );
}
