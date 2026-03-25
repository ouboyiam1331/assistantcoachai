import { NextResponse, type NextRequest } from "next/server";
import { LeagueKey } from "@/lib/leagues/config";
import { getDataProvider } from "@/lib/providers";
import { analyzeMatchupSeasonOnly } from "@/lib/tgem/v10";
import { getSnapshot, setSnapshot, snapshotTtlMs } from "@/lib/snapshots/store";

function toLeagueKey(raw: string): LeagueKey | null {
  const value = raw.toUpperCase();
  return Object.values(LeagueKey).includes(value as LeagueKey)
    ? (value as LeagueKey)
    : null;
}

type TgemPhase = "regular" | "championship" | "bowl" | "cfp";

function parseDate(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function deriveSeasonYear(game: {
  season?: number | null;
  startDate?: string | null;
}) {
  if (typeof game.season === "number") return game.season;
  const d = parseDate(game.startDate ?? null);
  if (!d) return 2025;
  const month = d.getMonth();
  const year = d.getFullYear();
  return month === 0 || month === 1 ? year - 1 : year;
}

function derivePhase(game: {
  seasonType?: string | null;
  week?: number | null;
}) {
  const st = String(game.seasonType ?? "").toLowerCase();
  if (
    st.includes("playoff") ||
    st.includes("cfp") ||
    st.includes("quarterfinal") ||
    st.includes("semifinal") ||
    st.includes("national championship")
  ) {
    return "cfp";
  }
  if (st.includes("post") || st.includes("bowl")) return "bowl";
  if (typeof game.week === "number" && game.week >= 14) return "championship";
  return "regular";
}

function parsePhaseOverride(raw: string | null): TgemPhase | null {
  if (!raw) return null;
  const value = raw.toLowerCase();
  if (value === "regular" || value === "championship" || value === "bowl" || value === "cfp") {
    return value;
  }
  return null;
}

function normalizeTeamName(s: string) {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function deriveVenue(
  game: { homeTeam?: string | null; awayTeam?: string | null; neutralSite?: boolean | null },
  team: string,
) {
  if (game.neutralSite) return "neutral" as const;
  if (!game.homeTeam || !game.awayTeam || !team) return undefined;

  const teamNorm = normalizeTeamName(team);
  const homeNorm = normalizeTeamName(game.homeTeam);
  const awayNorm = normalizeTeamName(game.awayTeam);

  if (homeNorm.includes(teamNorm) || teamNorm.includes(homeNorm)) return "home" as const;
  if (awayNorm.includes(teamNorm) || teamNorm.includes(awayNorm)) return "away" as const;
  return undefined;
}

function deriveOpponent(
  game: { homeTeam?: string | null; awayTeam?: string | null },
  team: string,
) {
  if (!game.homeTeam || !game.awayTeam || !team) return "";
  const teamNorm = normalizeTeamName(team);
  const homeNorm = normalizeTeamName(game.homeTeam);
  const awayNorm = normalizeTeamName(game.awayTeam);

  if (homeNorm.includes(teamNorm) || teamNorm.includes(homeNorm)) return game.awayTeam;
  if (awayNorm.includes(teamNorm) || teamNorm.includes(awayNorm)) return game.homeTeam;
  return "";
}

function matchupSnapshotKey(args: {
  league: LeagueKey;
  gameId: string;
  team: string;
  opponent: string;
  phase: TgemPhase;
}) {
  return `matchup_page_payload:${args.league}:${args.gameId}:${args.team}:${args.opponent}:${args.phase}`;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ league: string; gameId: string }> },
) {
  try {
    const { league: rawLeague, gameId } = await ctx.params;
    const league = toLeagueKey(rawLeague);
    if (!league) {
      return NextResponse.json(
        { ok: false, error: "Invalid league" },
        { status: 400 },
      );
    }
    const { searchParams } = new URL(req.url);
    const team = searchParams.get("team") ?? "";
    const phaseOverride = parsePhaseOverride(searchParams.get("phaseOverride"));

    const provider = getDataProvider();
    const game = await provider.getGame(league, gameId);
    const matchupInputs = await provider.getMatchupInputs(league, gameId);

    const opponent = searchParams.get("opponent") ?? deriveOpponent(game ?? {}, team);

    if (!team || !opponent || !game) {
      return NextResponse.json({ ok: true, league, gameId, game, matchupInputs });
    }

    const seasonYear = deriveSeasonYear(game);
    const effectivePhase = phaseOverride ?? derivePhase(game);
    const cacheKey = matchupSnapshotKey({
      league,
      gameId,
      team,
      opponent,
      phase: effectivePhase,
    });
    const cached = getSnapshot<unknown>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const venue = deriveVenue(game, team);
    const tgem = await analyzeMatchupSeasonOnly({
      team,
      opponent,
      year: seasonYear,
      venue,
      phase: effectivePhase,
      seasonType: game.seasonType ?? undefined,
      week: game.week ?? undefined,
    });

    const payload = {
      ok: true,
      league,
      gameId,
      game,
      matchupInputs,
      seasonYear,
      effectivePhase,
      tgem,
    };
    setSnapshot(cacheKey, payload, snapshotTtlMs.analysis);
    return NextResponse.json(payload);
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
