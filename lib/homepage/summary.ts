import { cache } from "react";
import { getSnapshot, listSnapshots, setSnapshot, snapshotTtlMs } from "@/lib/snapshots/store";
import { findRivalryLabel } from "@/data/rivalries";

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
  } | null;
  tgem?: {
    lean?: string | null;
    confidence?: number | null;
    reasons?: string[];
  } | null;
};

export type HomepageInsight = {
  title: string;
  detail: string;
  href: string;
};

export type HomepageSummary = {
  heroBlurb: string;
  seoHeading: string;
  seoDescription: string;
  insights: HomepageInsight[];
};

const HOMEPAGE_SUMMARY_KEY = "homepage_summary";

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
      title: `Hot Matchup: ${hotMatchup.payload.game?.awayTeam} at ${hotMatchup.payload.game?.homeTeam}`,
      detail: `This one is landing in the competitive middle tier of the current cache, which usually means the matchup has enough edge to matter without reading like a runaway favorite.`,
      href: matchupHref(hotMatchup.payload),
    });
  }

  if (closest) {
    insights.push({
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

function computeHomepageSummary(): HomepageSummary {
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
        ? `TGEM Sports is currently serving cached college football analysis across ${uniqueTeams.size || "multiple"} team dashboards and ${strongMatchupCount || "live"} higher-confidence matchup reads, with other sports coming soon.`
        : "Advanced college football analytics, matchup projections, and confidence-weighted insights for college football, with other sports coming soon.",
    seoHeading: `College Football Pick'em Predictions, Team Analysis & Cached Matchup Insights`,
    seoDescription:
      uniqueTeams.size > 0 || strongMatchupCount > 0
        ? `TGEM Sports surfaces college football predictions, matchup analysis, and pick'em insights from cached normalized payloads across ${uniqueTeams.size || "multiple"} team dashboards and ${strongMatchupCount || "live"} stronger matchup reads.`
        : "TGEM Sports provides advanced college football predictions, matchup analysis, and weekly pick'em insights powered by the Tactical Game Evaluation Model (TGEM). Analyze team performance, compare matchups, and gain an edge in your pick'em leagues.",
    insights,
  };

  setSnapshot(HOMEPAGE_SUMMARY_KEY, summary, snapshotTtlMs.analysis);
  return summary;
}

export const getHomepageSummary = cache(computeHomepageSummary);
