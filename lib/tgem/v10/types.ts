export type TGEMLean = "home" | "away" | "neutral";

export type TGEMv10Analysis = {
  version: "10.0";
  gameId: number;
  year: number;

  team: string;      // team slug (from URL)
  opponent: string;  // opponent slug (from query)

  lean: TGEMLean;
  confidence: number; // 0–100

  reasons: string[];

  factors: {
    momentum: number; // 0–1
    roster: number;   // 0–1
    matchup: number;  // 0–1
    venue: number;    // 0–1
  };
};
