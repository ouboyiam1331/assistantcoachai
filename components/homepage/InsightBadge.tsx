import type { HomepageInsightTag } from "@/lib/homepage/summary";

type InsightBadgeProps = {
  tag: HomepageInsightTag;
  compact?: boolean;
};

const badgeStyles: Record<
  HomepageInsightTag,
  {
    label: string;
    className: string;
  }
> = {
  top_matchup: {
    label: "Top Matchup",
    className:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200",
  },
  rivalry: {
    label: "Rivalry",
    className:
      "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200",
  },
  hot_matchup: {
    label: "Hot Matchup",
    className:
      "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900/70 dark:bg-orange-950/40 dark:text-orange-200",
  },
  upset_alert: {
    label: "Upset Alert",
    className:
      "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-200",
  },
  coin_flip: {
    label: "Coin Flip",
    className:
      "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900/70 dark:bg-violet-950/40 dark:text-violet-200",
  },
};

function CrownIcon() {
  return <span aria-hidden="true">👑</span>;
}

function SwordsIcon() {
  return <span aria-hidden="true">⚔️</span>;
}

function FlameIcon() {
  return <span aria-hidden="true">🔥</span>;
}

function EyesIcon() {
  return <span aria-hidden="true">👀</span>;
}

function CoinIcon() {
  return <span aria-hidden="true">🪙</span>;
}

function BadgeIcon({ tag }: { tag: HomepageInsightTag }) {
  switch (tag) {
    case "top_matchup":
      return <CrownIcon />;
    case "rivalry":
      return <SwordsIcon />;
    case "hot_matchup":
      return <FlameIcon />;
    case "upset_alert":
      return <EyesIcon />;
    case "coin_flip":
      return <CoinIcon />;
  }
}

export default function InsightBadge({ tag, compact = false }: InsightBadgeProps) {
  const config = badgeStyles[tag];

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold uppercase ${compact ? "gap-1 px-2 py-0.5 text-[10px] tracking-[0.12em]" : "gap-1.5 px-2.5 py-1 text-[11px] tracking-[0.16em]"} ${config.className}`}
    >
      <span className={compact ? "text-xs leading-none" : "text-sm leading-none"}>
        <BadgeIcon tag={tag} />
      </span>
      {config.label}
    </span>
  );
}
