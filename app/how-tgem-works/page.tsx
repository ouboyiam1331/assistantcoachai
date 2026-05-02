import type { Metadata } from "next";
import Link from "next/link";
import InfoPageLayout from "@/components/content/InfoPageLayout";
import InfoSectionCard from "@/components/content/InfoSectionCard";

export const metadata: Metadata = {
  title: "How TGEM Works | TGEM Sports",
  description:
    "Learn how the Tactical Game Evaluation Model (TGEM) analyzes sports matchups using performance, consistency, and data-driven insights.",
};

const philosophyItems = [
  {
    title: "1. Performance Over Perception",
    copy:
      "Rankings and public narratives can be misleading. TGEM prioritizes measurable performance metrics such as efficiency, production, and execution.",
  },
  {
    title: "2. Consistency Matters",
    copy:
      "A team's ability to perform consistently across multiple games often reveals more than a single dominant performance. TGEM evaluates trends, not just outcomes.",
  },
  {
    title: "3. Matchups Drive Outcomes",
    copy:
      "Not all teams perform the same against every opponent. TGEM analyzes how strengths and weaknesses interact, helping identify where advantages truly exist.",
  },
];

const evaluationAreas = [
  "Offensive and defensive efficiency",
  "Situational performance, including third downs, red zone execution, and turnovers",
  "Strength of opponent and competition level",
  "Game flow tendencies and scoring patterns",
  "Team consistency and volatility",
];

const usageFocus = [
  "Overall performance trends and how a team has played over time",
  "Key statistical indicators such as efficiency, scoring, and situational success",
  "Matchup context and how strengths and weaknesses interact",
  "TGEM Read insights that simplify what the data is suggesting",
];

export default function HowTgemWorksPage() {
  return (
    <InfoPageLayout
      eyebrow="TGEM Guide"
      title="How TGEM Works"
      description="The Tactical Game Evaluation Model (TGEM) is a data-driven sports analysis system designed to evaluate matchups based on performance, consistency, and situational context rather than rankings or public perception."
      ctaHref="/team-analysis"
      ctaLabel="Explore Team Analysis"
    >
      <InfoSectionCard
        title="At its core"
        description="TGEM transforms raw sports data into structured insights that help users better understand how and why games are likely to unfold."
      >
        <div className="space-y-4 text-base leading-8 text-gray-700 dark:text-gray-300">
          <p>
            Instead of presenting stats with no interpretation, TGEM organizes performance signals
            into a clearer read on team quality, matchup fit, and weekly volatility.
          </p>
          <p>
            The goal is not to replace your judgment. The goal is to give you a more objective
            framework for understanding the game.
          </p>
        </div>
      </InfoSectionCard>

      <InfoSectionCard
        title="A Different Approach to Sports Analysis"
        description="Traditional sports analysis often leans heavily on rankings, win-loss records, or surface-level statistics. TGEM takes a different approach."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["How teams actually perform on the field", "Execution matters more than reputation."],
            ["How consistently they execute", "Trends across games are often more useful than one big result."],
            ["How they match up against specific opponents", "The same team can look very different depending on the opponent across from them."],
          ].map(([title, copy]) => (
            <div key={title} className="tgem-surface-subtle rounded-2xl p-5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-300">{copy}</p>
            </div>
          ))}
        </div>
      </InfoSectionCard>

      <InfoSectionCard
        title="The Core Philosophy of TGEM"
        description="TGEM is built on three foundational ideas."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {philosophyItems.map((item) => (
            <article key={item.title} className="tgem-surface-subtle rounded-2xl p-5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-300">
                {item.copy}
              </p>
            </article>
          ))}
        </div>
      </InfoSectionCard>

      <InfoSectionCard
        title="What TGEM Evaluates"
        description="TGEM analyzes multiple layers of team performance to create a more complete picture of each matchup."
      >
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <ul className="space-y-3 text-base leading-8 text-gray-700 dark:text-gray-300">
              {evaluationAreas.map((item) => (
                <li key={item} className="rounded-2xl bg-white/70 px-4 py-3 dark:bg-gray-950/40">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4 text-base leading-8 text-gray-700 dark:text-gray-300">
            <p>
              Modern sports analytics works best when multiple metrics are combined to describe
              true performance instead of leaning on one isolated statistic.
            </p>
            <p>
              TGEM follows that same principle by integrating several data points into one cohesive
              evaluation, helping users separate signal from noise.
            </p>
          </div>
        </div>
      </InfoSectionCard>

      <InfoSectionCard
        title="Turning Data Into Insight"
        description="Raw data alone does not provide value without interpretation."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            "Where teams have advantages",
            "Where matchups are balanced",
            "Where volatility or uncertainty may exist",
          ].map((item) => (
            <div key={item} className="tgem-surface-subtle rounded-2xl p-5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{item}</h3>
              <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-300">
                TGEM converts statistics into readable takeaways so the model output is usable, not
                just technical.
              </p>
            </div>
          ))}
        </div>
      </InfoSectionCard>

      <InfoSectionCard
        title="Why TGEM Avoids Ranking Bias"
        description="Rankings often reflect perception, media influence, or limited sample sizes. TGEM removes that bias by focusing on performance indicators and matchup dynamics."
      >
        <div className="space-y-4 text-base leading-8 text-gray-700 dark:text-gray-300">
          <p>This gives users a better chance to identify undervalued teams and misleading records.</p>
          <p>
            It also creates a more grounded way to understand games beyond the surface level,
            especially when public opinion and on-field performance do not fully match.
          </p>
        </div>
      </InfoSectionCard>

      <InfoSectionCard
        title="How to Use TGEM"
        description="When viewing a team or matchup page, focus on a few core signals first."
      >
        <div className="grid gap-8 lg:grid-cols-[1fr_0.95fr]">
          <ul className="space-y-3 text-base leading-8 text-gray-700 dark:text-gray-300">
            {usageFocus.map((item) => (
              <li key={item} className="rounded-2xl bg-white/70 px-4 py-3 dark:bg-gray-950/40">
                {item}
              </li>
            ))}
          </ul>
          <div className="space-y-4 text-base leading-8 text-gray-700 dark:text-gray-300">
            <p>
              TGEM is designed to support decision-making, not replace it. The strongest use case
              is pairing the model&apos;s structure with your own football knowledge and judgment.
            </p>
            <p>
              If you want to see the framework in action, move from this guide into{" "}
              <Link href="/team-analysis" className="font-semibold text-gray-900 underline dark:text-gray-100">
                live team analysis pages
              </Link>{" "}
              and matchup views.
            </p>
          </div>
        </div>
      </InfoSectionCard>

      <InfoSectionCard
        title="Continuous Evolution"
        description="TGEM is an evolving system that adapts as new data becomes available."
      >
        <div className="space-y-4 text-base leading-8 text-gray-700 dark:text-gray-300">
          <p>
            As teams change, players develop, and seasons progress, the model updates to reflect
            current performance realities rather than old assumptions.
          </p>
          <p>
            Future expansions will include additional sports, deeper analysis layers, and enhanced
            user tools to improve both insight and usability.
          </p>
        </div>
      </InfoSectionCard>

      <section className="tgem-cta-warm px-8 py-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em]">Final Thoughts</p>
        <h2 className="mt-3 text-3xl font-bold">
          TGEM exists to bridge the gap between raw data and real understanding
        </h2>
        <p className="tgem-cta-warm-copy mt-4 max-w-3xl text-base leading-8">
          By focusing on performance, consistency, and matchup dynamics, TGEM delivers a clearer
          and more objective view of sports competition that helps users see beyond rankings and
          better understand the game itself.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link
            href="/team-analysis"
            className="tgem-cta-warm-button rounded-lg px-5 py-3 text-sm font-semibold"
          >
            Browse Team Analysis
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-white/25 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
          >
            Return Home
          </Link>
        </div>
      </section>
    </InfoPageLayout>
  );
}
