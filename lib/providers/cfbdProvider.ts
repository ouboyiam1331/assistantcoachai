import { FBS_TEAMS } from "@/data/fbsTeams";
import { cfbdGetJson } from "@/lib/cfbd/http";
import { fetchFcsTeams, findFcsTeamBySlug } from "@/lib/cfbd/fcs";
import { resolveCfbdTeamName } from "@/lib/cfbd/teamName";
import type { LeagueKey } from "@/lib/leagues/config";
import type {
  DataProvider,
  ProviderGame,
  ProviderMatchupInputs,
  ProviderTeam,
  ProviderTeamMeta,
} from "@/lib/providers/types";
import { getSnapshot, setSnapshot, snapshotTtlMs } from "@/lib/snapshots/store";

function scheduleCacheKey(league: LeagueKey, teamSlug: string, year: number) {
  return `schedule_snapshot:${league}:${year}:${teamSlug}`;
}

function teamMetaCacheKey(league: LeagueKey, teamSlug: string, year: number) {
  return `team_meta_snapshot:${league}:${year}:${teamSlug}`;
}

function teamStatsCacheKey(league: LeagueKey, teamSlug: string, year: number) {
  return `team_stats_snapshot:${league}:${year}:${teamSlug}`;
}

function gameCacheKey(league: LeagueKey, gameId: string) {
  return `game_snapshot:${league}:${gameId}`;
}

function asProviderGame(x: Record<string, unknown>): ProviderGame {
  return {
    id: String(x.id ?? ""),
    season: Number(x.season ?? 0),
    week: typeof x.week === "number" ? x.week : null,
    seasonType: typeof x.seasonType === "string" ? x.seasonType : null,
    startDate: typeof x.startDate === "string" ? x.startDate : null,
    homeTeam: typeof x.homeTeam === "string" ? x.homeTeam : null,
    awayTeam: typeof x.awayTeam === "string" ? x.awayTeam : null,
    homePoints: typeof x.homePoints === "number" ? x.homePoints : null,
    awayPoints: typeof x.awayPoints === "number" ? x.awayPoints : null,
    neutralSite: Boolean(x.neutralSite),
    venue: typeof x.venue === "string" ? x.venue : null,
  };
}

class CFBDProvider implements DataProvider {
  async searchTeams(league: LeagueKey, year: number): Promise<ProviderTeam[]> {
    if (league === "FBS") {
      return FBS_TEAMS.map((t) => ({
        id: t.slug,
        slug: t.slug,
        name: t.name,
        conference: t.conference,
      }));
    }
    if (league === "FCS") {
      const fcs = await fetchFcsTeams(year, process.env.CFBD_API_KEY ?? "");
      return fcs.map((t) => ({
        id: t.id != null ? String(t.id) : t.slug,
        slug: t.slug,
        name: t.school,
        conference: t.conference,
      }));
    }
    return [];
  }

  async getTeamMeta(league: LeagueKey, teamSlug: string, year: number): Promise<ProviderTeamMeta | null> {
    const cached = getSnapshot<ProviderTeamMeta>(teamMetaCacheKey(league, teamSlug, year));
    if (cached) return cached;

    if (league === "FBS") {
      const teamName = resolveCfbdTeamName(teamSlug);
      const rows = await cfbdGetJson<unknown>(
        "/teams/fbs",
        { year },
        { cacheTtlMs: snapshotTtlMs.teamMeta, team: teamName, mockFactory: () => [] },
      );
      const list = Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
      const found =
        list.find((r) => String(r.school ?? "").toLowerCase() === teamName.toLowerCase()) ??
        list.find((r) =>
          String(r.school ?? "")
            .toLowerCase()
            .includes(teamName.toLowerCase()),
        ) ??
        null;
      const meta: ProviderTeamMeta | null = found
        ? {
            name: String(found.school ?? teamName),
            slug: teamSlug,
            conference: found.conference ? String(found.conference) : null,
            classification: found.classification ? String(found.classification) : "FBS",
            color: found.color ? String(found.color) : null,
            altColor: found.alt_color ? String(found.alt_color) : null,
            location: found.location && typeof found.location === "object" ? (found.location as Record<string, unknown>) : null,
          }
        : null;
      if (meta) {
        setSnapshot(teamMetaCacheKey(league, teamSlug, year), meta, snapshotTtlMs.teamMeta);
      }
      return meta;
    }

    if (league === "FCS") {
      const found = await findFcsTeamBySlug(teamSlug, year, process.env.CFBD_API_KEY ?? "");
      if (!found) return null;
      const meta: ProviderTeamMeta = {
        name: found.school,
        slug: found.slug,
        conference: found.conference,
        classification: found.classification ?? "fcs",
        color: null,
        altColor: null,
        location: null,
      };
      setSnapshot(teamMetaCacheKey(league, teamSlug, year), meta, snapshotTtlMs.teamMeta);
      return meta;
    }
    return null;
  }

  async getTeamStats(league: LeagueKey, teamSlug: string, year: number): Promise<Record<string, unknown> | null> {
    const cached = getSnapshot<Record<string, unknown>>(teamStatsCacheKey(league, teamSlug, year));
    if (cached) return cached;
    const team = resolveCfbdTeamName(teamSlug);
    const rows = await cfbdGetJson<unknown>(
      "/stats/season",
      { year, team },
      { cacheTtlMs: snapshotTtlMs.teamStats, team, mockFactory: () => [] },
    );
    const list = Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
    const wrapped = { rows: list };
    setSnapshot(teamStatsCacheKey(league, teamSlug, year), wrapped, snapshotTtlMs.teamStats);
    return wrapped;
  }

  async getSchedule(league: LeagueKey, teamSlug: string, year: number): Promise<ProviderGame[]> {
    const cacheKey = scheduleCacheKey(league, teamSlug, year);
    const cached = getSnapshot<ProviderGame[]>(cacheKey);
    if (cached) return cached;

    const team = resolveCfbdTeamName(teamSlug);
    const query: Record<string, string | number | boolean | null | undefined> =
      league === "FCS" ? { year, team, seasonType: "both", classification: "fcs" } : { year, team, seasonType: "both" };
    const rows = await cfbdGetJson<unknown>(
      "/games",
      query,
      { cacheTtlMs: snapshotTtlMs.schedule, team, mockFactory: () => [] },
    );
    const list = (Array.isArray(rows) ? rows : []) as Record<string, unknown>[];
    const out = list.map(asProviderGame);
    setSnapshot(cacheKey, out, snapshotTtlMs.schedule);
    return out;
  }

  async getGame(league: LeagueKey, gameId: string): Promise<ProviderGame | null> {
    const cacheKey = gameCacheKey(league, gameId);
    const cached = getSnapshot<ProviderGame>(cacheKey);
    if (cached) return cached;
    const rows = await cfbdGetJson<unknown>(
      "/games",
      { id: gameId },
      { cacheTtlMs: snapshotTtlMs.game, mockFactory: () => [] },
    );
    const list = Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
    const one = list[0] ? asProviderGame(list[0]) : null;
    if (one) setSnapshot(cacheKey, one, snapshotTtlMs.game);
    return one;
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

export const cfbdProvider: DataProvider = new CFBDProvider();

