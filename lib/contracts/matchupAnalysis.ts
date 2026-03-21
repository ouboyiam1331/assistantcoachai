import type { LeagueKey } from "@/lib/leagues/config";

export type AnalysisLean = "HOME" | "AWAY" | "PASS";
export type AnalysisQuality = "OK" | "PARTIAL" | "MOCK" | "MISSING";

export type AnalysisReason = {
  tag: "edge" | "risk" | "context" | "model" | "data";
  text: string;
};

export type AnalysisKeyFactor = {
  label: string;
  delta: number | null;
  impact: "positive" | "negative" | "neutral";
};

export type MatchupAnalysis = {
  league: LeagueKey;
  season: number;
  week: number | string | null;
  gameId: string | null;
  homeTeam: string;
  awayTeam: string;
  neutralSite: boolean;
  lean: AnalysisLean;
  confidence: number | null;
  reasons: AnalysisReason[];
  keyFactors: AnalysisKeyFactor[];
  dataQuality: AnalysisQuality;
  generatedAt: string;
  modelVersion: string;
};

