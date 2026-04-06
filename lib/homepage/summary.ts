import { cache } from "react";
import { findRivalryLabel } from "@/data/rivalries";
import { FBS_TEAMS } from "@/data/fbsTeams";
import { getDefaultCfbSeasonYear } from "@/lib/cfbd/season";
import { cfbdGetJson } from "@/lib/cfbd/http";
import { resolvePickemTeamIdentity } from "@/lib/pickem/teamSlug";
import { getSnapshot, listSnapshots, setSnapshot, snapshotTtlMs } from "@/lib/snapshots/store";
import { analyzeMatchupSeasonOnly } from "@/lib/tgem/v10";

type TeamPayload = {
  team?: string;
  league?: string;
  meta?: {
    name?: string | null;
    conference?: string | null;
  } | null;
  seasonStats?: {
    games?: number | null;
    pointsPerGame?: number | null;
    pointsAllowedPerGame?: number | null;
    turnoverMarginPerGame?: number | null;
  } | null;
  schedule?: Array<{
    startDate?: string | null;
    homeTeam?: string | null;
    awayTeam?: string | null;
    homePoints?: number | null;
    awayPoints?: number | null;
  }> | null;
};

type MatchupPayload = {
  gameId?: string;
  league?: string;
  effectivePhase?: string;
  game?: {
    homeTeam?: string | null;
    awayTeam?: string | null;
    neutralSite?: boolean | null;
  } | null;
  tgem?: {
    lean?: string | null;
    confidence?: number | null;
    reasons?: string[];
  } | null;
};

type WeeklySlateGame = {
  league: "FBS" | "FCS";
  id?: number | string | null;
  week?: number | null;
  seasonType?: string | null;
  startDate?: string | null;
  homeTeam?: string | null;
  awayTeam?: string | null;
  neutralSite?: boolean | null;
};

type WeeklySlateContext = {
  seasonYear: number;
  week: number;
  seasonType: "regular" | "championship" | "postseason";
  refreshKey: string;
  games: WeeklySlateGame[];
};

export type HomepageInsight = {
  tag?: HomepageInsightTag;
  title: string;
  detail: string;
  href: string;
};

export type HomepageInsightTag =
  | "top_matchup"
  | "rivalry"
  | "hot_matchup"
  | "upset_alert"
  | "coin_flip";

export type HomepageSummary = {
  heroBlurb: string;
  seoHeading: string;
  seoDescription: string;
  insights: HomepageInsight[];
};

const HOMEPAGE_SUMMARY_KEY = "homepage_summary";
const FBS_POWER_CONFERENCES = new Set(["SEC", "Big Ten", "Big 12", "ACC"]);

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function favoredTeam(matchup: MatchupPayload) {
  const home = matchup.game?.homeTeam ?? "Home";
  const away = matchup.game?.awayTeam ?? "Away";
  if (matchup.tgem?.lean === "AWAY") return away;
  return home;
}

function normalizeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function matchupHref(matchup: MatchupPayload) {
  const league = String(matchup.league ?? "").toLowerCase();
  const gameId = String(matchup.gameId ?? "").trim();
  const home = String(matchup.game?.homeTeam ?? "").trim();

  if (!league || !gameId || !home) return "/team-analysis";

  return `/team-analysis/${league}/${slugify(home)}/matchup/${encodeURIComponent(gameId)}`;
}

function teamHref(team: TeamPayload) {
  const league = String(team.league ?? "").toLowerCase();
  const rawTeam = String(team.team ?? team.meta?.name ?? "").trim();

  if (!league || !rawTeam) return "/team-analysis";

  return `/team-analysis/${league}/${slugify(rawTeam)}`;
}

function buildTeamIndex(rows: Array<{ payload: TeamPayload }>) {
  const index = new Map<string, TeamPayload>();

  for (const row of rows) {
    const byMeta = normalizeName(String(row.payload.meta?.name ?? ""));
    const byTeam = normalizeName(String(row.payload.team ?? ""));
    if (byMeta && !index.has(byMeta)) index.set(byMeta, row.payload);
    if (byTeam && !index.has(byTeam)) index.set(byTeam, row.payload);
  }

  return index;
}

function getLastCompletedGame(team: TeamPayload | null | undefined) {
  if (!team?.schedule?.length) return null;

  const completed = team.schedule
    .filter(
      (game) =>
        asNumber(game.homePoints) != null &&
        asNumber(game.awayPoints) != null &&
        typeof game.startDate === "string",
    )
    .sort(
      (a, b) =>
        new Date(String(b.startDate ?? 0)).getTime() -
        new Date(String(a.startDate ?? 0)).getTime(),
    );

  return completed[0] ?? null;
}

function didTeamLoseLastGame(team: TeamPayload | null | undefined, teamName: string) {
  const lastGame = getLastCompletedGame(team);
  if (!lastGame) return false;

  const normTeam = normalizeName(teamName);
  const homeNorm = normalizeName(String(lastGame.homeTeam ?? ""));
  const awayNorm = normalizeName(String(lastGame.awayTeam ?? ""));
  const homePoints = asNumber(lastGame.homePoints);
  const awayPoints = asNumber(lastGame.awayPoints);

  if (homePoints == null || awayPoints == null) return false;
  if (normTeam && normTeam === homeNorm) return homePoints < awayPoints;
  if (normTeam && normTeam === awayNorm) return awayPoints < homePoints;
  return false;
}

function buildMatchupInsights(
  rows: Array<{ payload: MatchupPayload }>,
  teamIndex: Map<string, TeamPayload>,
) {
  const withConfidence = rows
    .map((row) => ({
      payload: row.payload,
      confidence: asNumber(row.payload.tgem?.confidence) ?? 0,
    }))
    .filter(
      (row) =>
        row.payload.game?.homeTeam &&
        row.payload.game?.awayTeam &&
        row.confidence > 0,
    )
    .sort((a, b) => b.confidence - a.confidence);

  const rivalry = withConfidence.find((row) =>
    findRivalryLabel(row.payload.game?.homeTeam, row.payload.game?.awayTeam),
  );
  const strongest = withConfidence[0];
  const awayLean = withConfidence.find((row) => row.payload.tgem?.lean === "AWAY");
  const hotMatchup = withConfidence.find(
    (row) =>
      row.confidence >= 55 &&
      row.confidence <= 72 &&
      String(row.payload.effectivePhase ?? "").toLowerCase() === "regular",
  );
  const closest = [...withConfidence]
    .filter((row) => row.confidence > 0)
    .sort((a, b) => a.confidence - b.confidence)[0];
  const trapGame = withConfidence.find((row) => {
    const favorite = favoredTeam(row.payload);
    const favoriteTeam = teamIndex.get(normalizeName(favorite));
    const confidence = row.confidence;
    const offense = asNumber(favoriteTeam?.seasonStats?.pointsPerGame) ?? 0;
    const defense = asNumber(favoriteTeam?.seasonStats?.pointsAllowedPerGame) ?? 99;

    return (
      !findRivalryLabel(row.payload.game?.homeTeam, row.payload.game?.awayTeam) &&
      String(row.payload.effectivePhase ?? "").toLowerCase() === "regular" &&
      confidence >= 62 &&
      confidence <= 78 &&
      offense >= 28 &&
      defense >= 20
    );
  });
  const bounceBack = withConfidence.find((row) => {
    const favorite = favoredTeam(row.payload);
    const favoriteTeam = teamIndex.get(normalizeName(favorite));
    return didTeamLoseLastGame(favoriteTeam, favorite);
  });

  const insights: HomepageInsight[] = [];

  if (rivalry) {
    const label = findRivalryLabel(rivalry.payload.game?.homeTeam, rivalry.payload.game?.awayTeam);
    insights.push({
      tag: "rivalry",
      title: `Key Rivalry Game: ${label ?? `${rivalry.payload.game?.awayTeam} at ${rivalry.payload.game?.homeTeam}`}`,
      detail: `${rivalry.payload.game?.awayTeam} at ${rivalry.payload.game?.homeTeam} is sitting in cache as a rivalry-week read, giving TGEM a live shot to frame one of college football's more familiar tension spots without a fresh API pull.`,
      href: matchupHref(rivalry.payload),
    });
  }

  if (strongest) {
    insights.push({
      title: `Highest Confidence Lean: ${favoredTeam(strongest.payload)}`,
      detail: `${strongest.payload.game?.awayTeam} at ${strongest.payload.game?.homeTeam} is grading as a ${String(strongest.payload.effectivePhase ?? "current").toUpperCase()} matchup with ${strongest.confidence}/100 confidence.`,
      href: matchupHref(strongest.payload),
    });
  }

  if (awayLean) {
    insights.push({
      title: `Road Test: ${awayLean.payload.game?.awayTeam} at ${awayLean.payload.game?.homeTeam}`,
      detail: `TGEM is leaning road-side here at ${awayLean.confidence}/100 confidence, which makes it one of the stronger away-team reads currently sitting in cache.`,
      href: matchupHref(awayLean.payload),
    });
  }

  if (trapGame) {
    insights.push({
      title: `Trap Game Watch: ${trapGame.payload.game?.awayTeam} at ${trapGame.payload.game?.homeTeam}`,
      detail: `${favoredTeam(trapGame.payload)} looks like the stronger side in the cache, but the profile still carries enough volatility to flag this as a spot where a comfortable lean can turn tricky.`,
      href: matchupHref(trapGame.payload),
    });
  }

  if (bounceBack) {
    const favorite = favoredTeam(bounceBack.payload);
    insights.push({
      title: `Bounce-Back Spot: ${favorite}`,
      detail: `${favorite} is showing up in a favorable cached matchup after dropping its last completed game, which makes this one a natural rebound candidate in the weekly feed.`,
      href: matchupHref(bounceBack.payload),
    });
  }

  if (hotMatchup) {
    insights.push({
      tag: "hot_matchup",
      title: `Hot Matchup: ${hotMatchup.payload.game?.awayTeam} at ${hotMatchup.payload.game?.homeTeam}`,
      detail: `This one is landing in the competitive middle tier of the current cache, which usually means the matchup has enough edge to matter without reading like a runaway favorite.`,
      href: matchupHref(hotMatchup.payload),
    });
  }

  if (closest) {
    insights.push({
      tag: "upset_alert",
      title: `Upset Watch: ${closest.payload.game?.awayTeam} at ${closest.payload.game?.homeTeam}`,
      detail: `This matchup is one of the tighter cached reads, which usually means volatility, swing possessions, and late-game leverage matter more than a clean favorite profile.`,
      href: matchupHref(closest.payload),
    });
  }

  return insights;
}

function buildTeamInsight(rows: Array<{ payload: TeamPayload }>) {
  const strongestTeam = rows
    .map((row) => ({
      payload: row.payload,
      pointsPerGame: asNumber(row.payload.seasonStats?.pointsPerGame),
      pointsAllowed: asNumber(row.payload.seasonStats?.pointsAllowedPerGame),
      turnoverMargin: asNumber(row.payload.seasonStats?.turnoverMarginPerGame),
    }))
    .filter((row) => row.pointsPerGame != null || row.pointsAllowed != null)
    .sort((a, b) => {
      const aScore =
        (a.pointsPerGame ?? 0) - (a.pointsAllowed ?? 0) + (a.turnoverMargin ?? 0) * 5;
      const bScore =
        (b.pointsPerGame ?? 0) - (b.pointsAllowed ?? 0) + (b.turnoverMargin ?? 0) * 5;
      return bScore - aScore;
    })[0];

  if (!strongestTeam) return null;

  const teamName =
    strongestTeam.payload.meta?.name ??
    strongestTeam.payload.team ??
    "A featured college football team";
  const offense = strongestTeam.pointsPerGame;
  const defense = strongestTeam.pointsAllowed;
  const conference = strongestTeam.payload.meta?.conference ?? "its conference";

  return {
    title: `${teamName} Rates as a Strong Cached Team Dashboard`,
    detail: `${teamName} is one of the stronger stored team profiles, posting ${offense?.toFixed(1) ?? "N/A"} points per game and allowing ${defense?.toFixed(1) ?? "N/A"} while tracking through ${conference}.`,
    href: teamHref(strongestTeam.payload),
  } satisfies HomepageInsight;
}

function computeCachedTrafficSummary(): HomepageSummary {
  const cached = getSnapshot<HomepageSummary>(HOMEPAGE_SUMMARY_KEY);
  if (cached) return cached;

  const matchupRows = listSnapshots(["matchup_page_payload"]).map((row) => ({
    payload: row.payload as MatchupPayload,
  }));
  const teamRows = listSnapshots(["team_page_payload"]).map((row) => ({
    payload: row.payload as TeamPayload,
  }));

  const cachedMatchups = matchupRows.filter(
    (row) => row.payload.league === "FBS" || row.payload.league === "FCS",
  );
  const cachedTeams = teamRows.filter(
    (row) => row.payload.league === "FBS" || row.payload.league === "FCS",
  );

  const uniqueTeams = new Set(
    cachedTeams
      .map((row) => row.payload.meta?.name ?? row.payload.team ?? "")
      .filter((value) => value.length > 0),
  );
  const strongMatchupCount = cachedMatchups.filter(
    (row) => (asNumber(row.payload.tgem?.confidence) ?? 0) >= 65,
  ).length;

  const teamIndex = buildTeamIndex(cachedTeams);
  const dynamicInsights = buildMatchupInsights(cachedMatchups, teamIndex);
  const teamInsight = buildTeamInsight(cachedTeams);
  if (teamInsight) dynamicInsights.push(teamInsight);

  const insights =
    dynamicInsights.length > 0
      ? dynamicInsights
          .filter(
            (insight, index, all) =>
              all.findIndex((candidate) => candidate.href === insight.href) === index,
          )
          .slice(0, 3)
      : [
          {
            title: "TGEM Matchup Cache Is Ready for Weekly Reads",
            detail:
              "As matchup and team pages are visited, TGEM stores normalized payloads in server memory so the homepage can surface insights without re-hitting upstream APIs.",
            href: "/team-analysis",
          },
        ];

  const summary: HomepageSummary = {
    heroBlurb:
      uniqueTeams.size > 0 || strongMatchupCount > 0
        ? `TGEM Sports is a sports analytics engine built to help users find smarter pick'em leans through structured modeling, matchup analysis, and weekly football context across ${uniqueTeams.size || "multiple"} team dashboards and ${strongMatchupCount || "live"} higher-confidence reads.`
        : "TGEM Sports is a sports analytics engine built to help users find smarter pick'em leans through structured modeling, matchup analysis, and weekly football context.",
    seoHeading: "College Football Pick'em Predictions, Team Analysis & Cached Matchup Insights",
    seoDescription:
      uniqueTeams.size > 0 || strongMatchupCount > 0
        ? `TGEM Sports surfaces college football predictions, matchup analysis, and pick'em insights from cached normalized payloads across ${uniqueTeams.size || "multiple"} team dashboards and ${strongMatchupCount || "live"} stronger matchup reads.`
        : "TGEM Sports provides advanced college football predictions, matchup analysis, and weekly pick'em insights powered by the Tactical Game Evaluation Model (TGEM). Analyze team performance, compare matchups, and gain an edge in your pick'em leagues.",
    insights,
  };

  setSnapshot(HOMEPAGE_SUMMARY_KEY, summary, snapshotTtlMs.analysis);
  return summary;
}

function isRoughCfbWindow(now = new Date()) {
  const month = now.getMonth();
  return month >= 7 || month === 0;
}

function normalizeWeeklySeasonType(raw: string | null | undefined) {
  const value = String(raw ?? "").toLowerCase();
  if (
    value.includes("playoff") ||
    value.includes("cfp") ||
    value.includes("quarterfinal") ||
    value.includes("semifinal") ||
    value.includes("national championship") ||
    value.includes("bowl") ||
    value.includes("post")
  ) {
    return "postseason" as const;
  }
  return "regular" as const;
}

function getPhaseForGame(game: WeeklySlateGame): "regular" | "championship" | "bowl" | "cfp" {
  const seasonType = String(game.seasonType ?? "").toLowerCase();
  if (
    seasonType.includes("playoff") ||
    seasonType.includes("cfp") ||
    seasonType.includes("quarterfinal") ||
    seasonType.includes("semifinal") ||
    seasonType.includes("national championship")
  ) {
    return "cfp";
  }
  if (seasonType.includes("post") || seasonType.includes("bowl")) return "bowl";
  if (typeof game.week === "number" && game.week >= 14) return "championship";
  return "regular";
}

function gameDateMs(game: WeeklySlateGame) {
  return Date.parse(String(game.startDate ?? "")) || Number.POSITIVE_INFINITY;
}

async function fetchCurrentWeeklySlateContext(now = new Date()): Promise<WeeklySlateContext | null> {
  if (!isRoughCfbWindow(now)) return null;

  const seasonYear = getDefaultCfbSeasonYear(now);
  const [fbsRows, fcsRows] = await Promise.all([
    cfbdGetJson<unknown>(
      "/games",
      { year: seasonYear, classification: "fbs", seasonType: "both" },
      {
        cacheTtlMs: 1000 * 60 * 60 * 6,
        dedupeMs: 60_000,
        team: "homepage-prewarm-fbs",
        mockFactory: () => [],
      },
    ),
    cfbdGetJson<unknown>(
      "/games",
      { year: seasonYear, classification: "fcs", seasonType: "both" },
      {
        cacheTtlMs: 1000 * 60 * 60 * 6,
        dedupeMs: 60_000,
        team: "homepage-prewarm-fcs",
        mockFactory: () => [],
      },
    ),
  ]);

  const games = [
    ...((Array.isArray(fbsRows) ? fbsRows : []) as Record<string, unknown>[]).map((game) => ({
      league: "FBS" as const,
      game,
    })),
    ...((Array.isArray(fcsRows) ? fcsRows : []) as Record<string, unknown>[]).map((game) => ({
      league: "FCS" as const,
      game,
    })),
  ];
  if (games.length === 0) return null;

  const slateGames = games
    .map(({ league, game }) => ({
      league,
      id:
        typeof game.id === "number"
          ? game.id
          : Number.isFinite(Number(game.id))
            ? Number(game.id)
            : null,
      week: typeof game.week === "number" ? game.week : null,
      seasonType: typeof game.seasonType === "string" ? game.seasonType : null,
      startDate: typeof game.startDate === "string" ? game.startDate : null,
      homeTeam: typeof game.homeTeam === "string" ? game.homeTeam : null,
      awayTeam: typeof game.awayTeam === "string" ? game.awayTeam : null,
      neutralSite: typeof game.neutralSite === "boolean" ? game.neutralSite : null,
    }))
    .filter((game) => game.week != null && game.homeTeam && game.awayTeam && game.startDate);

  const firstScheduledKickoffMs = slateGames.reduce((earliest, game) => {
    const ts = gameDateMs(game);
    return Number.isFinite(ts) ? Math.min(earliest, ts) : earliest;
  }, Number.POSITIVE_INFINITY);

  if (!Number.isFinite(firstScheduledKickoffMs)) return null;

  const prewarmStartMs = firstScheduledKickoffMs - 1000 * 60 * 60 * 24 * 7;
  if (now.getTime() < prewarmStartMs) return null;

  const threshold = now.getTime() - 1000 * 60 * 60 * 36;
  const upcoming = slateGames
    .filter((game) => gameDateMs(game) >= threshold)
    .sort((a, b) => gameDateMs(a) - gameDateMs(b));

  const pivot = upcoming[0];
  if (!pivot || typeof pivot.week !== "number") return null;

  const seasonType = normalizeWeeklySeasonType(pivot.seasonType);
  const week = pivot.week;
  const weekGames = upcoming.filter(
    (game) =>
      game.week === week && normalizeWeeklySeasonType(game.seasonType) === seasonType,
  );

  if (weekGames.length === 0) return null;

  return {
    seasonYear,
    week,
    seasonType,
    refreshKey: `${seasonYear}:${seasonType}:${week}`,
    games: weekGames,
  };
}

function getConferenceByTeamName(teamName: string | null | undefined) {
  const normalized = normalizeName(String(teamName ?? ""));
  const found = FBS_TEAMS.find((team) => normalizeName(team.name) === normalized);
  return found?.conference ?? null;
}

function marqueeScore(game: WeeklySlateGame) {
  const rivalryLabel = findRivalryLabel(game.homeTeam, game.awayTeam);
  const homeConference = getConferenceByTeamName(game.homeTeam);
  const awayConference = getConferenceByTeamName(game.awayTeam);
  const bothPower =
    homeConference != null &&
    awayConference != null &&
    FBS_POWER_CONFERENCES.has(homeConference) &&
    FBS_POWER_CONFERENCES.has(awayConference);

  let score = 0;
  if (game.league === "FBS") score += 25;
  if (rivalryLabel) score += 100;
  if (bothPower) score += 40;
  if (homeConference === "Independents" || awayConference === "Independents") score += 18;
  if (game.neutralSite) score += 10;
  if (typeof game.week === "number" && game.week >= 14) score += 35;
  return score;
}

function selectWeeklyAnalysisCandidates(games: WeeklySlateGame[]) {
  const byPriority = (a: WeeklySlateGame, b: WeeklySlateGame) =>
    marqueeScore(b) - marqueeScore(a) || gameDateMs(a) - gameDateMs(b);

  const fbs = games.filter((game) => game.league === "FBS").sort(byPriority).slice(0, 6);
  const fcs = games.filter((game) => game.league === "FCS").sort(byPriority).slice(0, 4);

  return [...fbs, ...fcs].sort((a, b) => gameDateMs(a) - gameDateMs(b));
}

function buildWeeklyInsightRows(rows: MatchupPayload[]) {
  const withConfidence = rows
    .map((payload) => ({
      payload,
      confidence: asNumber(payload.tgem?.confidence) ?? 0,
    }))
    .filter((row) => row.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence);

  if (withConfidence.length === 0) {
    return [
      {
        title: "This Week's TGEM Slate Is Warming Up",
        detail:
          "TGEM has not produced enough weekly matchup reads yet, so the homepage is waiting for Monday's prewarm cycle or the first matchup requests of the week.",
        href: "/team-analysis",
      },
    ] satisfies HomepageInsight[];
  }

  const strongest = withConfidence[0];
  const rivalry = withConfidence.find((row) =>
    findRivalryLabel(row.payload.game?.homeTeam, row.payload.game?.awayTeam),
  );
  const hotMatchup = withConfidence.find(
    (row) =>
      row !== strongest &&
      row.confidence >= 58 &&
      row.confidence <= 72 &&
      String(row.payload.effectivePhase ?? "").toLowerCase() === "regular",
  );
  const coinFlip = [...withConfidence].sort(
    (a, b) => Math.abs(a.confidence - 50) - Math.abs(b.confidence - 50),
  )[0];
  const upsetAlert = withConfidence.find(
    (row) => row.payload.tgem?.lean === "AWAY" && row.confidence >= 60,
  );

  const insights: HomepageInsight[] = [];

  if (strongest) {
    const label = findRivalryLabel(
      strongest.payload.game?.homeTeam,
      strongest.payload.game?.awayTeam,
    );
    insights.push({
      tag: "top_matchup",
      title: `This Week's Top ${String(strongest.payload.league ?? "FBS")} Matchup: ${strongest.payload.game?.awayTeam} at ${strongest.payload.game?.homeTeam}`,
      detail: `${favoredTeam(strongest.payload)} owns TGEM's strongest early weekly ${String(strongest.payload.league ?? "FBS")} read at ${strongest.confidence}/100 confidence.${label ? ` ${label} gives the game a built-in rivalry edge on top of the model score.` : ""}`,
      href: matchupHref(strongest.payload),
    });
  }

  if (hotMatchup) {
    insights.push({
      tag: "hot_matchup",
      title: `${String(hotMatchup.payload.league ?? "FBS")} Hot Matchup: ${hotMatchup.payload.game?.awayTeam} at ${hotMatchup.payload.game?.homeTeam}`,
      detail: `TGEM has this ${String(hotMatchup.payload.league ?? "FBS")} game in the live-action middle band at ${hotMatchup.confidence}/100 confidence, which usually means it has enough edge to matter without reading like a runaway favorite.`,
      href: matchupHref(hotMatchup.payload),
    });
  }

  if (upsetAlert) {
    insights.push({
      tag: "upset_alert",
      title: `${String(upsetAlert.payload.league ?? "FBS")} Upset Alert: ${upsetAlert.payload.game?.awayTeam} at ${upsetAlert.payload.game?.homeTeam}`,
      detail: `TGEM is leaning toward the road side here at ${upsetAlert.confidence}/100 confidence, making this one of the more interesting weekly ${String(upsetAlert.payload.league ?? "FBS")} spots where the visitor may have the cleaner path.`,
      href: matchupHref(upsetAlert.payload),
    });
  }

  if (coinFlip) {
    insights.push({
      tag: "coin_flip",
      title: `${String(coinFlip.payload.league ?? "FBS")} Coin Flip Alert: ${coinFlip.payload.game?.awayTeam} at ${coinFlip.payload.game?.homeTeam}`,
      detail: `This matchup is sitting closest to true volatility in TGEM's weekly ${String(coinFlip.payload.league ?? "FBS")} slate, so possessions, field position, and late-game execution matter more than a clean favorite profile.`,
      href: matchupHref(coinFlip.payload),
    });
  }

  if (rivalry) {
    const label = findRivalryLabel(rivalry.payload.game?.homeTeam, rivalry.payload.game?.awayTeam);
    insights.push({
      tag: "rivalry",
      title: `Rivalry Watch: ${label ?? `${rivalry.payload.game?.awayTeam} at ${rivalry.payload.game?.homeTeam}`}`,
      detail: `TGEM has this rivalry in the weekly slate already, giving the homepage a direct model read on one of the tension-heavy spots people naturally look for first.`,
      href: matchupHref(rivalry.payload),
    });
  }

  return insights
    .filter(
      (insight, index, all) =>
        all.findIndex((candidate) => candidate.href === insight.href) === index,
    )
    .slice(0, 3);
}

function buildWeeklySummary(context: WeeklySlateContext, rows: MatchupPayload[]): HomepageSummary {
  const highConfidenceCount = rows.filter(
    (row) => (asNumber(row.tgem?.confidence) ?? 0) >= 65,
  ).length;
  const fbsCount = rows.filter((row) => row.league === "FBS").length;
  const fcsCount = rows.filter((row) => row.league === "FCS").length;
  const insights = buildWeeklyInsightRows(rows);

  return {
    heroBlurb: `TGEM Sports is a sports analytics engine built to help users find smarter pick'em leans through structured modeling, matchup analysis, and weekly football context. For Week ${context.week}, TGEM is tracking ${fbsCount} FBS and ${fcsCount} FCS spotlight games with ${highConfidenceCount} stronger weekly reads already in focus.`,
    seoHeading: `Week ${context.week} College Football Pick'em Insights & TGEM Matchup Reads`,
    seoDescription: `TGEM Sports is surfacing Monday-refreshed Week ${context.week} FBS and FCS matchup insights, including top matchups, hot reads, coin-flip alerts, and upset-watch spots selected from TGEM's weekly analysis.`,
    insights,
  };
}

export async function refreshHomepageSummaryFromWeeklySlate() {
  const context = await fetchCurrentWeeklySlateContext();
  if (!context) return null;

  const weeklyKey = `homepage_weekly_summary:${context.refreshKey}`;
  const cached = getSnapshot<HomepageSummary>(weeklyKey);
  if (cached) {
    setSnapshot(HOMEPAGE_SUMMARY_KEY, cached, snapshotTtlMs.homepage);
    return {
      refreshKey: context.refreshKey,
      seasonYear: context.seasonYear,
      week: context.week,
      seasonType: context.seasonType,
      analyzedGames: 0,
      summary: cached,
      cacheHit: true,
    };
  }

  const selectedGames = selectWeeklyAnalysisCandidates(context.games);
  const rows: MatchupPayload[] = [];

  for (const game of selectedGames) {
    const homeIdentity = resolvePickemTeamIdentity(game.homeTeam);
    const awayIdentity = resolvePickemTeamIdentity(game.awayTeam);
    if (!homeIdentity.token || !awayIdentity.token) {
      continue;
    }

    const phase = getPhaseForGame(game);
    const tgem = await analyzeMatchupSeasonOnly({
      team: homeIdentity.token,
      opponent: awayIdentity.token,
      year: context.seasonYear,
      venue: game.neutralSite ? "neutral" : "home",
      phase,
      week: context.week,
      seasonType: game.seasonType ?? undefined,
      lightweight: true,
    });

    const payload: MatchupPayload = {
      gameId: String(game.id ?? ""),
      league: game.league,
      effectivePhase: phase,
      game: {
        homeTeam: game.homeTeam ?? null,
        awayTeam: game.awayTeam ?? null,
        neutralSite: game.neutralSite ?? null,
      },
      tgem: {
        lean: tgem.lean,
        confidence: tgem.confidence,
        reasons: tgem.reasons,
      },
    };

    rows.push(payload);
    setSnapshot(
      `matchup_page_payload:prewarm:${game.league}:${context.refreshKey}:${String(game.id ?? "")}`,
      payload,
      snapshotTtlMs.homepage,
    );
  }

  const summary = buildWeeklySummary(context, rows);
  setSnapshot(weeklyKey, summary, snapshotTtlMs.homepage);
  setSnapshot(HOMEPAGE_SUMMARY_KEY, summary, snapshotTtlMs.homepage);

  return {
    refreshKey: context.refreshKey,
    seasonYear: context.seasonYear,
    week: context.week,
    seasonType: context.seasonType,
    analyzedGames: rows.length,
    summary,
    cacheHit: false,
  };
}

async function computeHomepageSummary() {
  try {
    const weekly = await refreshHomepageSummaryFromWeeklySlate();
    if (weekly?.summary) return weekly.summary;
  } catch {
    // Fall through to cached-traffic summary if weekly refresh fails.
  }

  return computeCachedTrafficSummary();
}

export const getHomepageSummary = cache(computeHomepageSummary);
