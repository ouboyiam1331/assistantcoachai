export type AdPlacement =
  | "TOP"
  | "BOTTOM"
  | "INLINE_1"
  | "INLINE_2"
  | "TEAM_HEADER"
  | "MATCHUP_HEADER";

export const adPlacementConfig: Record<
  AdPlacement,
  { label: string; height: number }
> = {
  TOP: { label: "Top Page Banner", height: 90 },
  BOTTOM: { label: "Bottom Page Banner", height: 90 },
  INLINE_1: { label: "Inline Banner - Mid 1", height: 90 },
  INLINE_2: { label: "Inline Banner - Mid 2", height: 120 },
  TEAM_HEADER: { label: "Inline Banner - Team Header", height: 90 },
  MATCHUP_HEADER: { label: "Inline Banner - Matchup Header", height: 90 },
};

