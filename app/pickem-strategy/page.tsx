import type { Metadata } from "next";
import Link from "next/link";
import AdSlot from "@/components/ui/AdSlot";
import InfoPageLayout from "@/components/content/InfoPageLayout";
import InfoSectionCard from "@/components/content/InfoSectionCard";

export const metadata: Metadata = {
  title: "Pick'em Strategy | TGEM Sports",
  description:
    "Learn a smarter weekly pick'em strategy with TGEM Sports, including how to separate confident leans from coin-flip games and upset-risk spots.",
};

export default function PickemStrategyPage() {
  return (
    <InfoPageLayout
      eyebrow="Pick'em Guide"
      title="What good pick'em strategy actually looks like"
      description="Winning a pick'em contest is not always about choosing the best teams in a vacuum. It is about reading the weekly board, understanding where risk lives, and avoiding games that look easier than they really are."
      ctaHref="/pickem"
      ctaLabel="Open Pick'em Mode"
    >
      <InfoSectionCard
        title="Start with the right mindset"
        description="A smart board is usually built by separating games into different buckets instead of treating every matchup the same."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Confident leans", "These are the games where the model and the football context both point in the same direction."],
            ["Playable volatility", "These games may still be worth a pick, but they need more care because the edge is smaller."],
            ["True coin flips", "These are the spots where possessions, turnovers, or late-game decisions can erase any tiny pregame edge."],
          ].map(([title, copy]) => (
            <div key={title} className="tgem-surface-subtle rounded-2xl p-5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-300">{copy}</p>
            </div>
          ))}
        </div>
      </InfoSectionCard>

      <InfoSectionCard
        title="What TGEM can help you spot"
        description="The platform is especially useful when you want help identifying which matchups deserve confidence and which ones deserve caution."
      >
        <ul className="grid gap-4 md:grid-cols-2">
          {[
            "Overrated favorites that still carry trap-game risk",
            "Road teams with cleaner profiles than the home side",
            "Rivalry games where emotion can compress the expected edge",
            "Subdivision mismatches that look noisy but are still structurally tilted",
            "Low-confidence power-tier home spots that may still deserve respect",
            "Weekly games where the board feels close enough to leave alone",
          ].map((item) => (
            <li key={item} className="tgem-surface-subtle rounded-2xl px-5 py-4 text-sm leading-7 text-gray-700 dark:text-gray-300">
              {item}
            </li>
          ))}
        </ul>
      </InfoSectionCard>

      <AdSlot placement="INLINE_2" className="rounded-3xl" />

      <InfoSectionCard
        title="Three practical rules for weekly contests"
        description="These simple rules can keep a board from drifting into guesswork."
      >
        <div className="space-y-4 text-base leading-8 text-gray-700 dark:text-gray-300">
          <p>
            <strong className="text-gray-900 dark:text-gray-100">Respect confidence bands.</strong>{" "}
            A slight lean and a strong lean should not be treated like the same kind of pick.
          </p>
          <p>
            <strong className="text-gray-900 dark:text-gray-100">Do not force action on every close game.</strong>{" "}
            Some weekly edges are real and some boards simply contain volatility that is better left alone.
          </p>
          <p>
            <strong className="text-gray-900 dark:text-gray-100">Use the reasons, not just the side.</strong>{" "}
            The supporting explanation is often what tells you whether the read is sturdy enough to trust.
          </p>
        </div>
      </InfoSectionCard>

      <section className="tgem-cta-success px-8 py-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em]">Weekly Workflow</p>
        <h2 className="mt-3 text-3xl font-bold">Build a board with structure</h2>
        <p className="tgem-cta-success-copy mt-4 max-w-3xl text-base leading-8">
          Start with TGEM&apos;s team pages, move into matchup reads, and then carry your best board
          into Pick&apos;em Mode.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link href="/pickem" className="tgem-cta-success-button rounded-lg px-5 py-3 text-sm font-semibold">
            Start Pick&apos;em
          </Link>
          <Link href="/how-tgem-works" className="rounded-lg border border-current px-5 py-3 text-sm font-semibold hover:bg-white/10">
            How TGEM Works
          </Link>
        </div>
      </section>
    </InfoPageLayout>
  );
}
