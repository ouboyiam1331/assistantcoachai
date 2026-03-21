import type { LeagueKey } from "@/lib/leagues/config";

export type ProviderTeam = {
  id: string;
  slug: string;
  name: string;
  conference: string | null;
};

export type ProviderTeamMeta = {
  name: string;
  slug: string;
  conference: string | null;
  classification: string | null;
  color: string | null;
  altColor: string | null;
  location: Record<string, unknown> | null;
};

export type ProviderGame = {
  id: string;
  season: number;
  week: number | null;
  seasonType: string | null;
  startDate: string | null;
  homeTeam: string | null;
  awayTeam: string | null;
  homePoints: number | null;
  awayPoints: number | null;
  neutralSite: boolean;
  venue: string | null;
};

export type ProviderMatchupInputs = {
  league: LeagueKey;
  gameId: string;
  season: number;
  week: number | null;
  homeTeam: string;
  awayTeam: string;
  neutralSite: boolean;
  seasonType: string | null;
};

export interface DataProvider {
  searchTeams(league: LeagueKey, year: number): Promise<ProviderTeam[]>;
  getTeamMeta(league: LeagueKey, teamSlug: string, year: number): Promise<ProviderTeamMeta | null>;
  getTeamStats(league: LeagueKey, teamSlug: string, year: number): Promise<Record<string, unknown> | null>;
  getSchedule(league: LeagueKey, teamSlug: string, year: number): Promise<ProviderGame[]>;
  getGame(league: LeagueKey, gameId: string): Promise<ProviderGame | null>;
  getMatchupInputs(league: LeagueKey, gameId: string): Promise<ProviderMatchupInputs | null>;
}

