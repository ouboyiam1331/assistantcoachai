import type { HomepageInsightTag } from "@/lib/homepage/summary";

type InsightBadgeProps = {
  tag: HomepageInsightTag;
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
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 18h16l-1.5-9-4.5 4-3-5-3 5-4.5-4L4 18Z" />
      <path d="M7 21h10" />
    </svg>
  );
}

function SwordsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m14 5 5 5" />
      <path d="m10 9 9-9" />
      <path d="m8 11-7 7 5 5 7-7" />
      <path d="m10 14 4 4" />
      <path d="m15 10 7 7-5 5-7-7" />
      <path d="m14 14-4 4" />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3c1.5 3 5 4.8 5 9a5 5 0 1 1-10 0c0-2.4 1.1-4.1 2.4-5.5.9-.9 1.3-1.7 1.6-3.5Z" />
      <path d="M12 13c1 1 2 1.9 2 3.3A2.7 2.7 0 0 1 11.3 19 2.7 2.7 0 0 1 9 16.3c0-1.2.7-2.1 1.7-3.3" />
    </svg>
  );
}

function EyesIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-5 10-5 10 5 10 5-3.5 5-10 5-10-5-10-5Z" />
      <circle cx="9" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CoinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 6v12" />
      <path d="M9 8.5c.9-.6 1.9-.9 3-.9 1.2 0 2.2.3 3 .9" />
      <path d="M9 15.5c.8.6 1.8.9 3 .9 1.1 0 2.1-.3 3-.9" />
    </svg>
  );
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

export default function InsightBadge({ tag }: InsightBadgeProps) {
  const config = badgeStyles[tag];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${config.className}`}
    >
      <BadgeIcon tag={tag} />
      {config.label}
    </span>
  );
}
