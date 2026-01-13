// ==============================
// TGEM v10 – Season Stats Module
// ==============================

export type SeasonStats = {
  games?: number;

  totalYardsPerGame?: number;
  passYardsPerGame?: number;
  rushYardsPerGame?: number;

  pointsPerGame?: number;
  pointsAllowedPerGame?: number;

  thirdDownPct?: number;
  redZonePct?: number;

  turnoverMargin?: number;
  penaltyYardsPerGame?: number;
};

// Normalize raw CFBD stats into 0–1 scale
export function normalizeSeasonStats(stats: SeasonStats) {
  const safe = (v?: number) => (typeof v === "number" ? v : 0);

  return {
    offense: {
      yards:
        safe(stats.totalYardsPerGame) / 600, // elite ≈ 600 ypg
      passing:
        safe(stats.passYardsPerGame) / 350,
      rushing:
        safe(stats.rushYardsPerGame) / 300,
      scoring:
        safe(stats.pointsPerGame) / 45,
    },

    defense: {
      scoring:
        1 - safe(stats.pointsAllowedPerGame) / 45,
    },

    situational: {
      thirdDown:
        safe(stats.thirdDownPct) / 100,
      redZone:
        safe(stats.redZonePct) / 100,
    },

    discipline: {
      turnovers:
        (safe(stats.turnoverMargin) + 2) / 4, // normalize -2 to +2
      penalties:
        1 - safe(stats.penaltyYardsPerGame) / 100,
    },
  };
}
