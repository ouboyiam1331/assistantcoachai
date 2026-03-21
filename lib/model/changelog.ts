export type ChangelogEntry = {
  version: string;
  date: string;
  notes: string[];
};

export const TGEM_CHANGELOG: ChangelogEntry[] = [
  {
    version: "v11.0",
    date: "2026-02-19",
    notes: [
      "Established normalized analysis contract for cross-league outputs.",
      "Added phase-aware weighting for regular, championship, bowl, and CFP contexts.",
      "Introduced cache, in-flight de-dupe, and mock-capable CFBD provider layer.",
    ],
  },
];

