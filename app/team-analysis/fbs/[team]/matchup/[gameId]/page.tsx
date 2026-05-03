"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AdSlot from "@/components/ui/AdSlot";

import { FBS_TEAMS } from "@/data/fbsTeams";

type TGEMResult = {
  ok: boolean;
  year?: number;
  team?: string;
  opponent?: string;

  lean?: string;
  confidence?: number; // 0-100
  ratings?: {
    team?: number;
    opponent?: number;
    delta?: number;
  };
  reasons?: string[];
  statsSnapshot?: {
    team?: {
      pointsPerGame?: number | null;
      pointsAllowedPerGame?: number | null;
      yardsPerGame?: number | null;
      yardsAllowedPerGame?: number | null;
      thirdDownPct?: number | null;
      fourthDownPct?: number | null;
      turnoverMarginPerGame?: number | null;
      penaltyYardsPerGame?: number | null;
    } | null;
    opponent?: {
      pointsPerGame?: number | null;
      pointsAllowedPerGame?: number | null;
      yardsPerGame?: number | null;
      yardsAllowedPerGame?: number | null;
      thirdDownPct?: number | null;
      fourthDownPct?: number | null;
      turnoverMarginPerGame?: number | null;
      penaltyYardsPerGame?: number | null;
    } | null;
  };

  stats?: unknown;
  error?: string;
};

type ScheduleGame = {
  id?: number;
  week?: number | null;
  startDate?: string | null;
  venue?: string | null;
  homeTeam?: string | null;
  awayTeam?: string | null;
  homePoints?: number | null;
  awayPoints?: number | null;
  completed?: boolean | null;

  seasonType?: string | null;
  neutralSite?: boolean | null;
  season?: number | null;
};

type TgemPhase = "regular" | "championship" | "bowl" | "cfp";

function parseDate(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateTime(s?: string | null) {
  const d = parseDate(s);
  if (!d) return "TBD";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeTeamName(s: string) {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

const FBS_TEAM_BY_SLUG = new Map(FBS_TEAMS.map((team) => [team.slug, team]));
const FBS_SLUG_BY_NORMALIZED_NAME = new Map(
  FBS_TEAMS.map((team) => [normalizeTeamName(team.name), team.slug]),
);

function findTeamBySlug(slug: string) {
  return FBS_TEAM_BY_SLUG.get(slug) ?? null;
}

function findSlugByTeamName(teamNameRaw: string | null | undefined) {
  if (!teamNameRaw) return "";

  const target = normalizeTeamName(teamNameRaw);

  const exact = FBS_SLUG_BY_NORMALIZED_NAME.get(target);
  if (exact) return exact;

  const loose = FBS_TEAMS.find((t) => {
    const n = normalizeTeamName(t.name);
    return target.includes(n) || n.includes(target);
  });

  return loose ? loose.slug : "";
}

function normalizeCfbdGame(raw: Record<string, unknown>): ScheduleGame {
  const rawId = raw.id ?? raw.game_id ?? raw.gameId;
  const id =
    typeof rawId === "number"
      ? rawId
      : Number.isFinite(Number(rawId))
        ? Number(rawId)
        : undefined;
  return {
    id,
    week: typeof raw?.week === "number" ? raw.week : null,
    startDate: (raw.startDate as string) ?? (raw.start_date as string) ?? null,
    venue: (raw.venue as string) ?? null,
    homeTeam: (raw.homeTeam as string) ?? (raw.home_team as string) ?? null,
    awayTeam: (raw.awayTeam as string) ?? (raw.away_team as string) ?? null,
    homePoints: (raw.homePoints as number) ?? (raw.home_points as number) ?? null,
    awayPoints: (raw.awayPoints as number) ?? (raw.away_points as number) ?? null,
    completed: (raw.completed as boolean) ?? null,
    seasonType: (raw.seasonType as string) ?? (raw.season_type as string) ?? null,
    neutralSite: (raw.neutralSite as boolean) ?? (raw.neutral_site as boolean) ?? null,
    season:
      typeof raw?.season === "number"
        ? raw.season
        : typeof raw?.year === "number"
          ? raw.year
          : null,
  };
}

function parsePhaseOverride(raw: string | null): TgemPhase | null {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v === "regular" || v === "championship" || v === "bowl" || v === "cfp") {
    return v;
  }
  return null;
}

function fmtStat(value: number | null | undefined, digits = 1, pct = false) {
  if (value == null || Number.isNaN(value)) return "N/A";
  return pct ? `${value.toFixed(digits)}%` : value.toFixed(digits);
}

function TeamProfileCard({
  title,
  stats,
}: {
  title: string;
  stats:
    | {
        pointsPerGame?: number | null;
        pointsAllowedPerGame?: number | null;
        yardsPerGame?: number | null;
        yardsAllowedPerGame?: number | null;
        thirdDownPct?: number | null;
        fourthDownPct?: number | null;
        turnoverMarginPerGame?: number | null;
        penaltyYardsPerGame?: number | null;
      }
    | null
    | undefined;
}) {
  const rows = [
    ["Points Per Game", fmtStat(stats?.pointsPerGame)],
    ["Points Allowed", fmtStat(stats?.pointsAllowedPerGame)],
    ["Yards Per Game", fmtStat(stats?.yardsPerGame)],
    ["Yards Allowed", fmtStat(stats?.yardsAllowedPerGame)],
    ["3rd Down", fmtStat(stats?.thirdDownPct, 1, true)],
    ["4th Down", fmtStat(stats?.fourthDownPct, 1, true)],
    ["Turnover Margin", fmtStat(stats?.turnoverMarginPerGame)],
    ["Penalty Yards", fmtStat(stats?.penaltyYardsPerGame)],
  ] as const;

  return (
    <div className="tgem-surface-subtle rounded-2xl p-4">
      <div className="font-semibold text-gray-900 dark:text-gray-100">{title}</div>
      <div className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-300">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4">
            <span>{label}</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type TeamStats = NonNullable<NonNullable<TGEMResult["statsSnapshot"]>["team"]>;

function statNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function compareStat(
  teamStats: TeamStats | null | undefined,
  opponentStats: TeamStats | null | undefined,
  key: keyof TeamStats,
  higherIsBetter = true,
) {
  const team = statNumber(teamStats?.[key]);
  const opponent = statNumber(opponentStats?.[key]);
  if (team == null || opponent == null) return null;
  const diff = team - opponent;
  if (Math.abs(diff) < 0.1) return "even";
  const teamBetter = higherIsBetter ? diff > 0 : diff < 0;
  return teamBetter ? "team" : "opponent";
}

function contentSeed(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function rotateFromSeed<T>(items: T[], seed: number) {
  if (!items.length) return items;
  const start = seed % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

function buildContextTags(game: ScheduleGame, teamStats?: TeamStats | null, opponentStats?: TeamStats | null) {
  const tags = new Set<string>();
  const gameName = `${game.homeTeam ?? ""} ${game.awayTeam ?? ""}`.toLowerCase();
  if (gameName.includes(" vs ") || gameName.includes("rivalry")) tags.add("Rivalry");
  const seasonType = String(game.seasonType ?? "").toLowerCase();
  if (seasonType.includes("post") || seasonType.includes("championship") || (game.week ?? 0) >= 12) {
    tags.add("High Stakes");
  }
  const ppgA = statNumber(teamStats?.pointsPerGame);
  const ppgB = statNumber(opponentStats?.pointsPerGame);
  if (ppgA != null && ppgB != null && Math.abs(ppgA - ppgB) <= 4) tags.add("Even Matchup");
  const turnoverA = statNumber(teamStats?.turnoverMarginPerGame);
  const turnoverB = statNumber(opponentStats?.turnoverMarginPerGame);
  if (game.neutralSite || (turnoverA != null && turnoverB != null && Math.abs(turnoverA - turnoverB) >= 0.6)) {
    tags.add("Volatile Game");
  }
  return Array.from(tags).slice(0, 4);
}

function buildMatchupContent(args: {
  teamName: string;
  opponentName: string;
  game: ScheduleGame;
  teamStats?: TeamStats | null;
  opponentStats?: TeamStats | null;
}) {
  const { teamName, opponentName, game, teamStats, opponentStats } = args;
  const teamOffense = compareStat(teamStats, opponentStats, "pointsPerGame");
  const opponentDefense = compareStat(opponentStats, teamStats, "pointsAllowedPerGame", false);
  const thirdDown = compareStat(teamStats, opponentStats, "thirdDownPct");
  const turnover = compareStat(teamStats, opponentStats, "turnoverMarginPerGame");
  const penalties = compareStat(teamStats, opponentStats, "penaltyYardsPerGame", false);
  const seed = contentSeed(`${teamName}|${opponentName}|${game.id ?? ""}|${game.week ?? ""}|${game.venue ?? ""}`);
  const angle = seed % 8;
  const offenseTeam = teamOffense === "team" ? teamName : teamOffense === "opponent" ? opponentName : null;
  const defenseTeam = opponentDefense === "opponent" ? teamName : opponentDefense === "team" ? opponentName : null;
  const thirdDownTeam = thirdDown === "team" ? teamName : thirdDown === "opponent" ? opponentName : null;
  const turnoverTeam = turnover === "team" ? teamName : turnover === "opponent" ? opponentName : null;
  const cleanerTeam = penalties === "team" ? teamName : penalties === "opponent" ? opponentName : null;
  const venueText = game.neutralSite ? "on a neutral field" : game.venue ? `at ${game.venue}` : "with the venue still listed as TBD";
  const redZoneTeam = (seed & 1) === 0 ? offenseTeam : defenseTeam;
  const pressureTeam = defenseTeam ?? (seed % 2 === 0 ? teamName : opponentName);
  const consistencyTeam = cleanerTeam ?? turnoverTeam ?? (seed % 2 === 0 ? teamName : opponentName);
  const overviewOptions = [
    `Red-zone football is a useful opening frame for ${teamName} and ${opponentName} ${venueText}. ${redZoneTeam ? `${redZoneTeam} has the cleaner profile piece to lean on near scoring range, but the game still asks for patience before the field compresses.` : `Neither side creates a clean separation before the field tightens, so finishing drives matters more than raw yardage.`} Third-down answers and penalty timing will decide how many possessions actually reach that part of the field.`,
    `The defensive front can write the early script here. ${pressureTeam} has the profile angle that points toward disruption, whether that shows up through negative plays, hurried throws, or forcing the ball wide. ${teamName} and ${opponentName} both need answers before pressure turns ordinary downs into recovery downs.`,
    `Explosive plays are the contrast point ${venueText}. ${offenseTeam ? `${offenseTeam} brings more scoring pop into the available sample, which makes tackling angles and safety depth important for the other side.` : `The scoring comparison is tight enough that one chunk gain can carry more weight than a full quarter of steady snaps.`} The rest of the page tracks whether either team can create those sudden changes without giving away structure.`,
    `This has a consistency feel more than a highlight-reel feel. ${consistencyTeam} owns the cleaner operational clue, either through discipline or possession care, and that matters when drives turn routine. The opponent still has room to stress the game if early-down calls create space and avoid obvious passing situations.`,
    `Stakes and setting come first ${venueText}. ${game.week != null && game.week >= 12 ? `Late-season football tends to expose depth, substitutions, and special teams detail.` : `At this stage of the schedule, identity can still be shaped by how the first few series settle.`} ${teamName} and ${opponentName} need clean communication as much as raw production.`,
    `Quarterback comfort is the pressure point in this game. If the pocket stays calm, the passing concepts can stay on time; if it gets muddy, both offenses may have to live through checkdowns, scrambles, and second-effort plays. ${pressureTeam} is the side most tied to creating that discomfort.`,
    `The special teams layer deserves attention before the box-score categories. Field position, return coverage, and operation speed can change how aggressive ${teamName} and ${opponentName} are willing to be. That matters especially if the offenses trade stops early and the game becomes about hidden yards.`,
    `The clearest contrast is situational toughness: short-yardage runs, third-and-medium calls, and tackling after contact. ${defenseTeam ? `${defenseTeam} has the sturdier defensive signal, but it still has to hold up across repeated snaps.` : `No defensive split is strong enough to settle the read by itself.`} This page keeps the focus on those football details instead of one broad label.`,
  ];
  const flowOptions = [
    `A red-zone-heavy game would put a premium on tight-window throws, interior run fits, and fourth-down judgment.`,
    `If the pass rush shows up early, the flow can shift toward screens, draws, moving pockets, and protection adjustments.`,
    `A field-position start favors the team that can punt, cover, and defend short fields without giving away cheap yards.`,
    `Explosive gains would stretch the game out; without them, both staffs may have to stay patient through low-margin possessions.`,
    `If ${thirdDownTeam ?? "either side"} owns third down, the opponent may spend too much of the game reacting to personnel groupings.`,
    `Turnover pressure changes the call sheet quickly, especially if ${turnoverTeam ?? "one sideline"} creates a sudden-change possession.`,
    `Penalty clusters can slow the game down and turn ordinary second downs into drive-saving situations.`,
    `Fatigue becomes visible if one defensive front has to handle repeated short-yardage snaps without a substitution window.`,
  ];
  const factorPool = [
    redZoneTeam ? `${redZoneTeam}'s red-area poise` : "Drive finishing inside scoring range",
    `${pressureTeam}'s ability to affect the pocket`,
    offenseTeam ? `${offenseTeam}'s explosive-play threat` : "Which offense creates the first chunk gain",
    defenseTeam ? `${defenseTeam}'s tackling after contact` : "Open-field tackling against space plays",
    thirdDownTeam ? `${thirdDownTeam}'s third-down answers` : "First-down success before the chains get heavy",
    turnoverTeam ? `${turnoverTeam}'s sudden-change profile` : "Ball security after momentum swings",
    cleanerTeam ? `${cleanerTeam}'s discipline in drive-extending spots` : "Penalty timing around midfield",
    game.neutralSite ? "Neutral-site operation and sideline communication" : "Crowd, cadence, and substitution mechanics",
  ];
  const keyFactors = rotateFromSeed(factorPool, seed + angle).slice(0, 4);
  const swingPool = [
    "A deep completion can force the defense out of its preferred spacing.",
    "A goal-line stand can matter more than a long drive that produced it.",
    "Interior pressure can ruin timing before receivers get into the route stem.",
    "Missed tackles on routine throws can create sudden explosive damage.",
    "A special teams penalty can flip field position without a snap from scrimmage.",
    "A tired front can make short-yardage calls feel automatic late.",
    "A quarterback escape on third down can change the emotional direction of a series.",
    "A muffed exchange or mishandled snap can turn a quiet possession into the main storyline.",
  ];
  const swingFactors = rotateFromSeed(swingPool, seed + 7).slice(0, 3);
  const summaryOptions = [
    `The story is likely to come from finishing drives, not simply moving the ball.`,
    `Pocket comfort, tackling, and red-zone decisions give this game its most useful shape.`,
    `Explosive-play prevention may decide whether this stays orderly or starts trading sudden swings.`,
    `The team that handles routine snaps with fewer leaks should carry the cleaner game script.`,
    `Special teams and short-field defense are worth tracking alongside the offensive numbers.`,
    `This is a detail game: pressure, leverage, substitution timing, and drive-ending execution.`,
    `Consistency across ordinary downs may matter more than any one standout series.`,
    `The matchup reads best as a collection of pressure points rather than a single statistical edge.`,
  ];
  const overview = overviewOptions[angle];
  const flow = flowOptions[(seed >>> 3) % flowOptions.length];
  const summary = summaryOptions[(seed >>> 5) % summaryOptions.length];
  return { overview, flow, keyFactors, swingFactors, summary };
}

export default function MatchupPage() {
  const params = useParams<{ team: string; gameId: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const teamSlug = params?.team ?? "";
  const gameId = params?.gameId ?? "";
  const phaseOverrideParam = search.get("phaseOverride");

  const [game, setGame] = useState<ScheduleGame | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [tgem, setTgem] = useState<TGEMResult | null>(null);
  const [tgemErr, setTgemErr] = useState<string | null>(null);
  const [phaseOverride, setPhaseOverride] = useState<"auto" | TgemPhase>(
    parsePhaseOverride(phaseOverrideParam) ?? "auto",
  );
  useEffect(() => {
    const parsed = parsePhaseOverride(phaseOverrideParam) ?? "auto";
    if (parsed !== phaseOverride) setPhaseOverride(parsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseOverrideParam]);

  const opponentFromQuery = search.get("opponent") ?? "";

  useEffect(() => {
    const currentQs = search.toString();
    const params = new URLSearchParams(currentQs);
    if (phaseOverride === "auto") params.delete("phaseOverride");
    else params.set("phaseOverride", phaseOverride);
    const qs = params.toString();
    const next = qs ? `${pathname}?${qs}` : pathname;
    const current = currentQs ? `${pathname}?${currentQs}` : pathname;
    if (next !== current) {
      router.replace(next, { scroll: false });
    }
  }, [phaseOverride, pathname, router, search]);

  // Season-year logic: Jan/Feb => previous season unless CFBD provides season
  const seasonYear = useMemo(() => {
    if (typeof game?.season === "number") return game.season;

    const d = parseDate(game?.startDate ?? null);
    if (!d) return 2025;

    const month = d.getMonth(); // Jan=0 Feb=1
    const y = d.getFullYear();

    return month === 0 || month === 1 ? y - 1 : y;
  }, [game?.season, game?.startDate]);

  useEffect(() => {
    let cancelled = false;

    async function loadMatchupPayload() {
      setErr(null);
      setTgemErr(null);
      setGame(null);
      setTgem(null);

      try {
        if (!gameId) throw new Error("Missing gameId");

        const params = new URLSearchParams();
        params.set("team", teamSlug);
        if (opponentFromQuery) params.set("opponent", opponentFromQuery);
        if (phaseOverride !== "auto") params.set("phaseOverride", phaseOverride);

        const res = await fetch(`/api/analysis/fbs/game/${encodeURIComponent(gameId)}?${params.toString()}`, {
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok || data?.ok === false) {
          throw new Error(data?.error ?? "Matchup fetch failed");
        }

        const rawGame = data?.game ?? null;
        if (!rawGame) throw new Error("Game not found.");

        const found = normalizeCfbdGame(rawGame);

        if (!cancelled) {
          setGame(found);
          setTgem((data?.tgem as TGEMResult | null) ?? null);
          if (!data?.tgem) {
            setTgemErr("Matchup analysis unavailable.");
          }
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Unknown error");
        }
      }
    }

    loadMatchupPayload();
    return () => {
      cancelled = true;
    };
  }, [gameId, teamSlug, opponentFromQuery, phaseOverride]);

  // Resolve opponent
  const opponentSlug = useMemo(() => {
    if (opponentFromQuery) return opponentFromQuery;
    if (!game?.homeTeam || !game?.awayTeam || !teamSlug) return "";

    const teamObj = findTeamBySlug(teamSlug);
    const teamNorm = normalizeTeamName(teamObj?.name ?? teamSlug);

    const homeNorm = normalizeTeamName(game.homeTeam);
    const awayNorm = normalizeTeamName(game.awayTeam);

    let opponentName: string | null = null;

    if (homeNorm === teamNorm) opponentName = game.awayTeam ?? null;
    else if (awayNorm === teamNorm) opponentName = game.homeTeam ?? null;
    else {
      const slugGuessNorm = normalizeTeamName(teamSlug.replaceAll("-", " "));
      if (homeNorm.includes(slugGuessNorm))
        opponentName = game.awayTeam ?? null;
      else if (awayNorm.includes(slugGuessNorm))
        opponentName = game.homeTeam ?? null;
    }

    return findSlugByTeamName(opponentName);
  }, [opponentFromQuery, game?.homeTeam, game?.awayTeam, teamSlug]);

  const title = useMemo(() => {
    if (!game?.homeTeam || !game?.awayTeam) return "Matchup Analysis";
    return `${game.awayTeam} @ ${game.homeTeam}`;
  }, [game]);
  const seoHeading = useMemo(() => {
    if (!game?.homeTeam || !game?.awayTeam) return "College Football Matchup Analysis";
    return `${game.homeTeam} vs ${game.awayTeam} Matchup Analysis`;
  }, [game]);
  const seoDescription = useMemo(() => {
    if (!game?.homeTeam || !game?.awayTeam) {
      return "An in-depth breakdown of team strengths, styles, and matchup dynamics.";
    }
    return `An in-depth breakdown of ${game.homeTeam} vs ${game.awayTeam}, covering team strengths, styles, and matchup dynamics.`;
  }, [game]);

  const status = useMemo(() => {
    if (!game) return "TBD";
    const hasScore = game.homePoints != null && game.awayPoints != null;
    if (hasScore) return `${game.awayPoints} - ${game.homePoints}`;
    return game.completed ? "Final" : "TBD";
  }, [game]);

  const homeSlug = useMemo(
    () => findSlugByTeamName(game?.homeTeam),
    [game?.homeTeam],
  );
  const awaySlug = useMemo(
    () => findSlugByTeamName(game?.awayTeam),
    [game?.awayTeam],
  );

  const reasonTable = useMemo(() => {
    if (!tgem) return null;

    const teamStats = tgem.statsSnapshot?.team ?? null;
    const opponentStats = tgem.statsSnapshot?.opponent ?? null;

    if (!teamStats || !opponentStats) return null;

    const teamIsHome = Boolean(homeSlug) && homeSlug === teamSlug;
    const teamIsAway = Boolean(awaySlug) && awaySlug === teamSlug;

    const homeStats = teamIsHome
      ? teamStats
      : teamIsAway
        ? opponentStats
        : teamStats;
    const awayStats = teamIsAway
      ? teamStats
      : teamIsHome
        ? opponentStats
        : opponentStats;

    return [
      {
        reason: "Points / Game",
        away: fmtStat(awayStats.pointsPerGame),
        home: fmtStat(homeStats.pointsPerGame),
      },
      {
        reason: "Points Allowed / Game",
        away: fmtStat(awayStats.pointsAllowedPerGame),
        home: fmtStat(homeStats.pointsAllowedPerGame),
      },
      {
        reason: "Yards / Game",
        away: fmtStat(awayStats.yardsPerGame),
        home: fmtStat(homeStats.yardsPerGame),
      },
      {
        reason: "Yards Allowed / Game",
        away: fmtStat(awayStats.yardsAllowedPerGame),
        home: fmtStat(homeStats.yardsAllowedPerGame),
      },
      {
        reason: "3rd Down %",
        away: fmtStat(awayStats.thirdDownPct, 1, true),
        home: fmtStat(homeStats.thirdDownPct, 1, true),
      },
      {
        reason: "4th Down %",
        away: fmtStat(awayStats.fourthDownPct, 1, true),
        home: fmtStat(homeStats.fourthDownPct, 1, true),
      },
      {
        reason: "Turnover Margin / Game",
        away: fmtStat(awayStats.turnoverMarginPerGame),
        home: fmtStat(homeStats.turnoverMarginPerGame),
      },
      {
        reason: "Penalty Yds / Game",
        away: fmtStat(awayStats.penaltyYardsPerGame),
        home: fmtStat(homeStats.penaltyYardsPerGame),
      },
    ];
  }, [tgem, homeSlug, awaySlug, teamSlug]);

  const requestedTeamName = useMemo(
    () => findTeamBySlug(teamSlug)?.name ?? tgem?.team ?? teamSlug,
    [teamSlug, tgem?.team],
  );
  const requestedOpponentName = useMemo(
    () =>
      (opponentSlug ? findTeamBySlug(opponentSlug)?.name : null) ??
      tgem?.opponent ??
      opponentSlug ??
      "Opponent",
    [opponentSlug, tgem?.opponent],
  );

  const matchupContent = useMemo(() => {
    if (!game || !tgem) return null;
    return buildMatchupContent({
      teamName: requestedTeamName,
      opponentName: requestedOpponentName,
      game,
      teamStats: tgem.statsSnapshot?.team,
      opponentStats: tgem.statsSnapshot?.opponent,
    });
  }, [game, requestedOpponentName, requestedTeamName, tgem]);

  const contextTags = useMemo(() => {
    if (!game) return [];
    return buildContextTags(game, tgem?.statsSnapshot?.team, tgem?.statsSnapshot?.opponent);
  }, [game, tgem?.statsSnapshot?.opponent, tgem?.statsSnapshot?.team]);

  return (
    <main className="tgem-page px-6 py-12">
      <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
        <Link href={`/team-analysis/fbs/${teamSlug}`} className="hover:underline">
          {"<- Back to Team Page"}
        </Link>
        <span>|</span>
        <Link href="/team-analysis/fbs" className="hover:underline">
          FBS Analysis Home
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100" style={{ marginTop: 0, marginBottom: 8 }}>{seoHeading}</h1>
      <p className="max-w-3xl text-gray-700 dark:text-gray-300" style={{ marginTop: 0, marginBottom: 16, lineHeight: 1.6 }}>
        {seoDescription}
      </p>

      {err ? (
        <div style={{ color: "#b00020" }}>{err}</div>
      ) : !game ? (
        <div style={{ color: "#666" }}>Loading game…</div>
      ) : (
        <>
          <div className="tgem-surface rounded-3xl p-6" style={{ marginBottom: 20 }}>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Team:</strong> {teamSlug}{" "}
              <span style={{ color: "var(--tgem-muted)" }}>|</span> <strong>Season:</strong>{" "}
              {seasonYear} <span style={{ color: "var(--tgem-muted)" }}>|</span>{" "}
              <strong>Opponent:</strong> {opponentSlug || "Resolving…"}
            </div>

            <h2 className="mt-3 text-2xl font-semibold text-gray-900 dark:text-gray-100" style={{ marginBottom: 6 }}>{title}</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="tgem-surface-subtle rounded-2xl p-4 text-sm text-gray-700 dark:text-gray-300">
                <div className="mb-1 font-semibold text-gray-900 dark:text-gray-100">Date</div>
                {formatDateTime(game.startDate)}
              </div>
              <div className="tgem-surface-subtle rounded-2xl p-4 text-sm text-gray-700 dark:text-gray-300">
                <div className="mb-1 font-semibold text-gray-900 dark:text-gray-100">Venue</div>
                {game.venue ?? "TBD"}
                {game.neutralSite ? " (Neutral)" : ""}
              </div>
              <div className="tgem-surface-subtle rounded-2xl p-4 text-sm text-gray-700 dark:text-gray-300">
                <div className="mb-1 font-semibold text-gray-900 dark:text-gray-100">Status</div>
                {status}
              </div>
            </div>
          </div>

	          {tgemErr ? (
	            <div style={{ color: "#b00020" }}>{tgemErr}</div>
	          ) : !tgem ? (
	            <div style={{ color: "#666" }}>Loading matchup data...</div>
	          ) : (
            <div className="space-y-6">
              {contextTags.length ? (
                <div className="flex flex-wrap gap-2">
                  {contextTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[var(--tgem-border)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="space-y-6">
                <section className="tgem-surface rounded-3xl p-6 text-gray-900 dark:text-gray-100">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Team Profiles
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-gray-700 dark:text-gray-300">
                    Current team profile snapshots pulled from the same college data already powering
                    the matchup read.
                  </p>
                  <div className="mt-4 grid gap-4">
                    <TeamProfileCard title={requestedTeamName} stats={tgem.statsSnapshot?.team} />
                    <TeamProfileCard title={requestedOpponentName} stats={tgem.statsSnapshot?.opponent} />
                  </div>
                </section>

                <AdSlot placement="INLINE_1" className="rounded-3xl" />

                <section className="tgem-surface rounded-3xl p-6 text-gray-900 dark:text-gray-100">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Team Comparison
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-gray-700 dark:text-gray-300">
                    Raw team stats provide the baseline for comparing production, defensive resistance,
                    possession traits, and discipline.
                  </p>
                  {reasonTable ? (
                    <div className="mt-4 overflow-x-auto text-sm text-gray-700 dark:text-gray-300">
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ background: "var(--tgem-surface-subtle)", color: "var(--foreground)" }}>
                            <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid var(--tgem-border)" }}>
                              Away ({game.awayTeam ?? "Away"})
                            </th>
                            <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid var(--tgem-border)" }}>
                              Category
                            </th>
                            <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid var(--tgem-border)" }}>
                              Home ({game.homeTeam ?? "Home"})
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {reasonTable.map((row) => (
                            <tr key={row.reason}>
                              <td style={{ padding: 8, borderBottom: "1px solid var(--tgem-border)" }}>{row.away}</td>
                              <td style={{ padding: 8, borderBottom: "1px solid var(--tgem-border)", fontWeight: 600 }}>{row.reason}</td>
                              <td style={{ padding: 8, borderBottom: "1px solid var(--tgem-border)" }}>{row.home}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">
                      Team comparison data is still loading for this matchup.
                    </p>
                  )}
                </section>
              </div>

              <section className="tgem-surface rounded-3xl p-6 text-gray-900 dark:text-gray-100">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Matchup Overview
                </h3>
                {matchupContent ? (
                  <div className="mt-2 space-y-6 text-sm leading-7 text-gray-700 dark:text-gray-300">
                    <p>{matchupContent.overview}</p>
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        Game Flow Outlook
                      </h4>
                      <p className="mt-2">{matchupContent.flow}</p>
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        Key Matchup Factors
                      </h4>
                      <ul className="mt-3 list-disc space-y-2 pl-5">
                        {matchupContent.keyFactors.map((factor) => (
                          <li key={factor}>{factor}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        Swing Factors
                      </h4>
                      <ul className="mt-3 list-disc space-y-2 pl-5">
                        {matchupContent.swingFactors.map((factor) => (
                          <li key={factor}>{factor}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        Game Summary
                      </h4>
                      <p className="mt-2">{matchupContent.summary}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm leading-7 text-gray-700 dark:text-gray-300">
                    Matchup analysis will appear once team data is available.
                  </p>
                )}
                {tgem.stats ? (
                  <details className="mt-4 text-sm text-gray-700 dark:text-gray-300">
                    <summary className="cursor-pointer font-semibold text-gray-900 dark:text-gray-100">
                      View raw stats snapshot
                    </summary>
                    <pre className="mt-3 whitespace-pre-wrap">{JSON.stringify(tgem.stats, null, 2)}</pre>
                  </details>
                ) : null}
              </section>
            </div>
	          )}
          <div className="tgem-cta-success" style={{ marginTop: 16, padding: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
              Want to compare this game with the rest of your slate?
            </div>
            <p className="tgem-cta-success-copy" style={{ margin: "0 0 12px 0", lineHeight: 1.6 }}>
              Open Pick&apos;em Mode to organize games, compare team context, and make your
              own calls from the full board.
            </p>
            <Link
              href="/pickem"
              style={{
                display: "inline-block",
                borderRadius: 10,
                fontWeight: 700,
                padding: "10px 14px",
                textDecoration: "none",
              }}
              className="tgem-cta-success-button"
            >
              Open Pick&apos;em Mode
            </Link>
          </div>
          <div style={{ marginTop: 14 }}>
          </div>
	        </>
	      )}
      </div>
    </main>
  );
}


