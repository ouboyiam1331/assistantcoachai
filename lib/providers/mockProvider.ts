import type { LeagueKey } from "@/lib/leagues/config";
import type {
  DataProvider,
  ProviderGame,
  ProviderMatchupInputs,
  ProviderTeam,
  ProviderTeamMeta,
} from "@/lib/providers/types";

function mkGames(teamName: string, season: number): ProviderGame[] {
  return Array.from({ length: 8 }).map((_, i) => ({
    id: String(880000 + i),
    season,
    week: i + 1,
    seasonType: i >= 6 ? "postseason" : "regular",
    startDate: new Date(Date.UTC(season, 8, 1 + i * 7, 18, 0, 0)).toISOString(),
    homeTeam: i % 2 === 0 ? teamName : `Opponent ${i + 1}`,
    awayTeam: i % 2 === 0 ? `Opponent ${i + 1}` : teamName,
    homePoints: 20 + i,
    awayPoints: 17 + i,
    neutralSite: false,
    venue: i % 2 === 0 ? `${teamName} Stadium` : `Opponent ${i + 1} Stadium`,
  }));
}

class MockProvider implements DataProvider {
  async searchTeams(league: LeagueKey, _year: number): Promise<ProviderTeam[]> {
    void _year;
    return [
      { id: `${league}-1`, slug: `${String(league).toLowerCase()}-alpha`, name: `${league} Alpha`, conference: "Mock" },
      { id: `${league}-2`, slug: `${String(league).toLowerCase()}-beta`, name: `${league} Beta`, conference: "Mock" },
    ];
  }

  async getTeamMeta(league: LeagueKey, teamSlug: string): Promise<ProviderTeamMeta> {
    return {
      name: `${league} ${teamSlug}`,
      slug: teamSlug,
      conference: "Mock",
      classification: String(league),
      color: "#0B3D91",
      altColor: "#C8102E",
      location: { name: "Mock Stadium", city: "Mock City" },
    };
  }

  async getTeamStats(_league: LeagueKey): Promise<Record<string, unknown>> {
    void _league;
    return {
      pointsPerGame: 31.2,
      pointsAllowedPerGame: 21.3,
      thirdDownPct: 43.1,
      turnoverMarginPerGame: 0.7,
    };
  }

  async getSchedule(_league: LeagueKey, teamSlug: string, year: number): Promise<ProviderGame[]> {
    return mkGames(teamSlug, year);
  }

  async getGame(_league: LeagueKey, gameId: string): Promise<ProviderGame | null> {
    return {
      id: gameId,
      season: 2025,
      week: 1,
      seasonType: "regular",
      startDate: new Date(Date.UTC(2025, 8, 1, 18, 0, 0)).toISOString(),
      homeTeam: "Mock Home",
      awayTeam: "Mock Away",
      homePoints: 27,
      awayPoints: 24,
      neutralSite: false,
      venue: "Mock Field",
    };
  }

  async getMatchupInputs(league: LeagueKey, gameId: string): Promise<ProviderMatchupInputs | null> {
    const g = await this.getGame(league, gameId);
    if (!g || !g.homeTeam || !g.awayTeam) return null;
    return {
      league,
      gameId: g.id,
      season: g.season,
      week: g.week,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      neutralSite: g.neutralSite,
      seasonType: g.seasonType,
    };
  }
}

export const mockProvider: DataProvider = new MockProvider();
