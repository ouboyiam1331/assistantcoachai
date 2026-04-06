import type { Metadata } from "next";
import Link from "next/link";
import AdSlot from "@/components/ui/AdSlot";
import InfoPageLayout from "@/components/content/InfoPageLayout";
import InfoSectionCard from "@/components/content/InfoSectionCard";

export const metadata: Metadata = {
  title: "Model Breakdown | TGEM Sports",
  description:
    "Get a high-level breakdown of the TGEM Sports model, including what it measures, how it compares teams, and why it uses matchup-aware logic.",
};

export default function ModelBreakdownPage() {
  return (
    <InfoPageLayout
      eyebrow="Model Overview"
      title="A cleaner look at what sits behind TGEM"
      description="TGEM is built to organize football information into a usable contest read. The platform is matchup-aware, phase-aware, and designed to keep context from getting buried under raw numbers."
      ctaHref="/how-tgem-works"
      ctaLabel="Read How TGEM Works"
    >
      <InfoSectionCard
        title="Model priorities"
        description="The model is not trying to solve football in one number. It is trying to make the weekly board easier to interpret."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Structure", "TGEM turns broad game data into a repeatable comparison process."],
            ["Context", "Season phase, matchup shape, and board volatility matter."],
            ["Usability", "Outputs are meant to help a user make a pick, not just admire a dashboard."],
            ["Transparency", "Reasons and comparison tables are shown so the lean does not feel unexplained."],
          ].map(([title, copy]) => (
            <div key={title} className="tgem-surface-subtle rounded-2xl p-5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-300">{copy}</p>
            </div>
          ))}
        </div>
      </InfoSectionCard>

      <AdSlot placement="MATCHUP_HEADER" className="rounded-3xl" />

      <InfoSectionCard
        title="Why matchup-aware logic matters"
        description="Two strong teams can create very different kinds of games. TGEM is built to compare the actual interaction, not just the standalone résumé."
      >
        <div className="space-y-4 text-base leading-8 text-gray-700 dark:text-gray-300">
          <p>
            Matchup-aware modeling helps separate the teams that simply post good numbers from the
            teams whose profile should travel well into a specific spot. That matters in pick&apos;em,
            where the goal is to choose the better side this week, not crown the better program in a
            vacuum.
          </p>
          <p>
            TGEM also uses guardrail logic for situations that deserve extra discipline, such as
            clear subdivision mismatches or low-confidence power-tier home spots. Those rules are
            there to keep thin reads from turning into careless picks.
          </p>
        </div>
      </InfoSectionCard>

      <InfoSectionCard
        title="What you see on a TGEM matchup page"
        description="The page layout is designed to help users read quickly without losing the bigger picture."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Team Profiles", "A side-by-side view of how each team is entering the matchup."],
            ["Weighted Category Scores", "A structured comparison board that highlights where the edge is forming."],
            ["TGEM Read", "The lean, confidence, coach-style summary, and model reasons in one place."],
          ].map(([title, copy]) => (
            <div key={title} className="tgem-surface-subtle rounded-2xl p-5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-300">{copy}</p>
            </div>
          ))}
        </div>
      </InfoSectionCard>

      <section className="tgem-surface rounded-3xl px-8 py-8">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Use the model the right way</h2>
        <p className="mt-4 max-w-3xl text-base leading-8 text-gray-700 dark:text-gray-300">
          TGEM is meant to help users make better weekly decisions, not remove judgment from the
          process. The strongest use of the platform comes from combining the model output with your
          own understanding of the board.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link href="/team-analysis" className="rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200">
            View Team Analysis
          </Link>
          <Link href="/pickem-strategy" className="rounded-lg border border-[var(--tgem-border)] px-5 py-3 text-sm font-semibold text-gray-900 hover:bg-[var(--tgem-surface-subtle)] dark:text-gray-100">
            Read Pick&apos;em Strategy
          </Link>
        </div>
      </section>
    </InfoPageLayout>
  );
}
