import type { Metadata } from "next";
import Link from "next/link";
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
    <main className="min-h-screen bg-gray-100 px-6 py-12 text-gray-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center">
        <section className="w-full rounded-3xl bg-white px-8 py-14 text-center shadow-sm">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            TGEM Sports<sup className="tgem-tm">TM</sup>
          </h1>

          <p className="mt-4 mx-auto max-w-2xl text-lg leading-relaxed text-gray-900">
            Powered by the Tactical Game Evaluation Model
            <sup className="tgem-tm">TM</sup> (v11.0)
          </p>

          <p className="mt-3 mx-auto max-w-2xl text-lg leading-relaxed text-gray-900">
            {summary.heroBlurb}
          </p>

          <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:justify-center">
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
        </section>

        <section className="mt-10 grid w-full gap-8 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-3xl bg-white px-8 py-10 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">{summary.seoHeading}</h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-gray-700">
              {summary.seoDescription}
            </p>
          </div>

          <aside className="rounded-3xl bg-white px-8 py-10 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">Latest TGEM Insights</h2>
            <p className="mt-3 text-lg font-semibold text-gray-900">
              Early reads are coming into focus
            </p>
            <p className="mt-2 leading-7 text-gray-700">
              TGEM is tracking matchup edges, team strengths, and key indicators to
              give you a clear read on the week ahead.
            </p>
            <ul className="mt-5 space-y-4 text-base text-gray-700">
              {summary.insights.map((insight) => (
                <li key={insight.title}>
                  <Link href={insight.href} className="font-semibold text-gray-900 hover:underline">
                    {insight.title}
                  </Link>
                  <p className="mt-1 leading-7 text-gray-700">{insight.detail}</p>
                </li>
              ))}
            </ul>
          </aside>
        </section>

        <div className="mt-8 flex items-center gap-4 text-sm text-gray-700">
          <Link href="/privacy-policy" className="underline hover:text-gray-900">
            Privacy Policy
          </Link>
          <span aria-hidden="true">|</span>
          <Link href="/terms-of-service" className="underline hover:text-gray-900">
            Terms of Service
          </Link>
        </div>
      </div>
    </main>
  );
}
