import type { LeagueKey } from "@/lib/leagues/config";
import type { MatchupAnalysis } from "@/lib/contracts/matchupAnalysis";

export type SlateMatchup = {
  matchupId: string;
  gameId: string | null;
  startDate: string | null;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string | null;
  awayTeamName: string | null;
  venue: string | null;
  neutralSite: boolean;
  completed: boolean;
  homePoints: number | null;
  awayPoints: number | null;
};

export type SlateUserPick = {
  matchupId: string;
  pick: "home" | "away" | null;
  updatedAt: string;
};

export type SlateSchema = {
  slateId: string;
  name: string;
  league: LeagueKey;
  season: number;
  weekOrRound: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  locked: boolean;
  matchups: SlateMatchup[];
  userPicks: SlateUserPick[];
  analysis: MatchupAnalysis[];
};

