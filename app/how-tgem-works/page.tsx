import type { Metadata } from "next";
import Link from "next/link";
import AdSlot from "@/components/ui/AdSlot";
import InfoPageLayout from "@/components/content/InfoPageLayout";
import InfoSectionCard from "@/components/content/InfoSectionCard";

export const metadata: Metadata = {
  title: "How TGEM Works | TGEM Sports",
  description:
    "Learn how TGEM Sports turns matchup context, team data, and modeling logic into structured pick'em leans and weekly football reads.",
};

export default function HowTgemWorksPage() {
  return (
    <InfoPageLayout
      eyebrow="TGEM Guide"
      title="How TGEM turns game information into a usable lean"
      description="TGEM is built to help users move from raw football information to a cleaner weekly read. The platform combines team performance data, matchup context, and structured guardrails so each page points toward a lean instead of leaving everything as a pile of stats."
      ctaHref="/team-analysis"
      ctaLabel="Explore Team Analysis"
    >
      <InfoSectionCard
        title="What TGEM looks at"
        description="TGEM is not just a scoreboard recap. It is designed to compare how two teams fit together in a real matchup."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Team performance", "Scoring, efficiency, opponent resistance, and other season signals help form the base team profile."],
            ["Matchup context", "Venue, season phase, rivalry pressure, and game environment help explain why a spot may play differently than the raw averages."],
            ["Pick'em usefulness", "The goal is not just to rank teams. The goal is to give users a clearer lean they can actually use in a weekly contest."],
          ].map(([title, copy]) => (
            <div key={title} className="tgem-surface-subtle rounded-2xl p-5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-300">{copy}</p>
            </div>
          ))}
        </div>
      </InfoSectionCard>

      <AdSlot placement="INLINE_1" className="rounded-3xl" />

      <InfoSectionCard
        title="How a lean gets built"
        description="Each matchup page follows a similar flow so users can understand where the read is coming from."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ["1. Build the team snapshot", "TGEM first establishes what each team looks like through available season data and recent football context."],
            ["2. Compare the matchup", "The model then compares the two sides directly instead of treating them as isolated profiles."],
            ["3. Apply context rules", "Mismatch logic, phase-aware logic, and weekly context help prevent thin reads from becoming misleading reads."],
            ["4. Surface the result", "That output becomes the lean, confidence, supporting reasons, and coach-style read you see on the page."],
          ].map(([title, copy]) => (
            <div key={title} className="tgem-surface-subtle rounded-2xl p-5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-300">{copy}</p>
            </div>
          ))}
        </div>
      </InfoSectionCard>

      <InfoSectionCard
        title="What TGEM is meant to do"
        description="TGEM is designed to support better football decisions, not replace judgment."
      >
        <div className="space-y-4 text-base leading-8 text-gray-700 dark:text-gray-300">
          <p>
            The platform is built for users who want more structure than surface-level rankings,
            but still want the freedom to make their own call. A strong lean can help identify
            better contest spots, stronger favorites, volatility games, and weekly edges worth
            paying attention to.
          </p>
          <p>
            The best way to use TGEM is to combine the model output with your own football read.
            That is why the site pairs the lean with comparison tables, schedule context, and
            written reasons instead of presenting a number with no explanation.
          </p>
        </div>
      </InfoSectionCard>

      <section className="tgem-cta-warm px-8 py-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em]">Next Step</p>
        <h2 className="mt-3 text-3xl font-bold">See the model working on live team pages</h2>
        <p className="tgem-cta-warm-copy mt-4 max-w-3xl text-base leading-8">
          Move from the overview into actual team and matchup pages to see how TGEM organizes the
          week.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link href="/team-analysis" className="tgem-cta-warm-button rounded-lg px-5 py-3 text-sm font-semibold">
            Open Team Analysis
          </Link>
          <Link href="/model-breakdown" className="rounded-lg border border-white/25 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
            View Model Breakdown
          </Link>
        </div>
      </section>
    </InfoPageLayout>
  );
}
