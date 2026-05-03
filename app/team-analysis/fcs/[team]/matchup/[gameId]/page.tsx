"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AdSlot from "@/components/ui/AdSlot";

type TGEMResult = {
  ok: boolean;
  lean?: string;
  confidence?: number;
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

function normalizeCfbdGame(raw: Record<string, unknown>): ScheduleGame {
  const rawId = raw.id ?? raw.game_id ?? null;
  const id =
    typeof rawId === "number"
      ? rawId
      : Number.isFinite(Number(rawId))
        ? Number(rawId)
        : undefined;
  return {
    id,
    week: typeof raw.week === "number" ? raw.week : null,
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
      typeof raw.season === "number"
        ? raw.season
        : typeof raw.year === "number"
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

function SummaryTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="tgem-surface-subtle rounded-2xl p-4">
      <div className="text-sm text-gray-700 dark:text-gray-300">{label}</div>
      <div className="mt-2 text-xl font-semibold text-gray-900 dark:text-gray-100">{value}</div>
    </div>
  );
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
  if (gameName.includes("rival") || gameName.includes("classic")) tags.add("Rivalry");
  const seasonType = String(game.seasonType ?? "").toLowerCase();
  if (seasonType.includes("post") || seasonType.includes("championship") || (game.week ?? 0) >= 11) {
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
    `Red-zone snaps are a good place to begin for ${teamName} and ${opponentName} ${venueText}. ${redZoneTeam ? `${redZoneTeam} has the profile clue that can matter when space gets tight.` : `The numbers do not give either side an easy finishing label.`} In FCS games with narrow margins, one stalled drive inside scoring range can change how both staffs handle the next series.`,
    `The defensive front is the first real question. ${pressureTeam} is tied to the disruption angle, whether that comes from interior push, edge contain, or forcing throws before the route develops. The opposing offense has to keep the game out of recovery mode.`,
    `Explosive-play prevention gives this game a different lens ${venueText}. ${offenseTeam ? `${offenseTeam} has more scoring lift in the profile, so missed tackles and poor pursuit angles are dangerous.` : `With scoring production close, a single chunk play can become the separator.`} The rest of the matchup is about limiting those sudden stress points.`,
    `Consistency is the story if this game settles into routine possessions. ${consistencyTeam} owns the cleaner operational hint, but that only matters if it carries through penalties, substitutions, and late-down choices. ${teamName} and ${opponentName} both need repeatable answers rather than one good series.`,
    `The setting comes with its own demands ${venueText}. ${game.week != null && game.week >= 11 ? `Late-season FCS football can expose depth and special teams operation quickly.` : `Earlier schedule spots can still reveal which roster is settling into its weekly identity.`} Communication, tackling, and sideline adjustment matter as much as the top-line production.`,
    `Quarterback timing is the hinge point. If protection holds, the offense can stay layered; if ${pressureTeam} compresses the pocket, throws become shorter, reads speed up, and second down gets harder. That pressure story is worth watching from the first series.`,
    `Special teams can carry a larger share of this game than the matchup card suggests. Coverage lanes, return decisions, and punt location can decide how much grass each offense has to cover. That is especially important if both defenses make early stops.`,
    `Short-yardage football gives this page its cleanest physical lens. ${defenseTeam ? `${defenseTeam} has the better defensive signal, but the test is repeated contact, not one isolated stop.` : `The defensive split is not strong enough to settle the read alone.`} Watch how each side handles third-and-short, goal-line spacing, and tackles after contact.`,
  ];
  const flowOptions = [
    `A red-zone-heavy script would make tight formations, fourth-down judgment, and goal-line tackling more important than yardage totals.`,
    `If pressure wins early, expect quicker throws, moving pockets, and more calls designed to slow the rush.`,
    `A special teams field-position game can make both offenses feel more conservative than their season profiles suggest.`,
    `Explosive plays would open the game up; if they disappear, patience and drive finishing become the operating terms.`,
    `If ${thirdDownTeam ?? "one side"} keeps converting late downs, the other defense may have to simplify personnel calls.`,
    `A sudden turnover can change the play-calling temperature, especially if ${turnoverTeam ?? "the recovering team"} has to defend a short field.`,
    `Penalty trouble can make the game choppy and force drives to survive behind-schedule snaps.`,
    `Fatigue matters if one front keeps absorbing downhill runs without clean substitution chances.`,
  ];
  const factorPool = [
    redZoneTeam ? `${redZoneTeam}'s red-zone patience` : "Who finishes drives after crossing midfield",
    `${pressureTeam}'s ability to hurry the quarterback`,
    offenseTeam ? `${offenseTeam}'s explosive-play creation` : "The first offense to create space after the catch",
    defenseTeam ? `${defenseTeam}'s tackling through contact` : "Defensive fits against second-effort yards",
    thirdDownTeam ? `${thirdDownTeam}'s late-down conversion work` : "Early-down success before third down arrives",
    turnoverTeam ? `${turnoverTeam}'s short-field prevention` : "Ball security after momentum shifts",
    cleanerTeam ? `${cleanerTeam}'s discipline on drive-extending downs` : "Penalty timing around midfield",
    game.neutralSite ? "Neutral-site cadence and communication" : "Home-site operation and substitution rhythm",
  ];
  const keyFactors = rotateFromSeed(factorPool, seed + angle).slice(0, 4);
  const swingPool = [
    "A busted coverage can create a touchdown chance before the defense resets.",
    "A red-zone false start can turn a scoring chance into a field-goal decision.",
    "Interior pressure can force hurried throws before routes uncover.",
    "Missed tackles after contact can turn modest gains into explosive plays.",
    "A punt coverage mistake can hand the offense a short field.",
    "A worn-down defensive front can change the fourth-quarter run menu.",
    "A quarterback scramble on third down can extend more than just the drive.",
    "A mishandled exchange can become the sudden-change play both teams remember.",
  ];
  const swingFactors = rotateFromSeed(swingPool, seed + 7).slice(0, 3);
  const summaryOptions = [
    `Drive finishing may say more than yardage if both teams reach scoring range.`,
    `Pocket stress, tackling, and special teams detail give this game its most useful shape.`,
    `Explosive-play control is the difference between a measured game and a sudden one.`,
    `The steadier sideline across ordinary snaps should have the better handle on game state.`,
    `Short fields and red-zone defense are worth tracking as closely as offensive output.`,
    `This is a detail read: pressure, leverage, communication, and drive-ending execution.`,
    `Consistency on routine downs may matter more than one standout possession.`,
    `The game story is a set of pressure points, not one category carrying the whole read.`,
  ];
  const overview = overviewOptions[angle];
  const flow = flowOptions[(seed >>> 3) % flowOptions.length];
  const summary = summaryOptions[(seed >>> 5) % summaryOptions.length];
  return { overview, flow, keyFactors, swingFactors, summary };
}

export default function FcsMatchupPage() {
  const params = useParams<{ team: string; gameId: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const teamSlug = params?.team ?? "";
  const gameId = params?.gameId ?? "";
  const phaseOverrideParam = search.get("phaseOverride");
  const teamName = search.get("teamName") ?? teamSlug;
  const opponentFromQuery = search.get("opponentName") ?? "";

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

  const seasonYear = useMemo(() => {
    if (typeof game?.season === "number") return game.season;
    const d = parseDate(game?.startDate ?? null);
    if (!d) return 2025;
    const month = d.getMonth();
    const y = d.getFullYear();
    return month === 0 || month === 1 ? y - 1 : y;
  }, [game?.season, game?.startDate]);

  const opponentName = useMemo(() => {
    if (opponentFromQuery) return opponentFromQuery;
    if (!game?.homeTeam || !game?.awayTeam || !teamName) return "";
    const teamNorm = normalizeTeamName(teamName);
    const homeNorm = normalizeTeamName(game.homeTeam);
    const awayNorm = normalizeTeamName(game.awayTeam);
    if (homeNorm.includes(teamNorm) || teamNorm.includes(homeNorm)) return game.awayTeam ?? "";
    if (awayNorm.includes(teamNorm) || teamNorm.includes(awayNorm)) return game.homeTeam ?? "";
    return game.homeTeam ?? "";
  }, [opponentFromQuery, game?.homeTeam, game?.awayTeam, teamName]);

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
        params.set("team", teamName);
        if (opponentFromQuery) params.set("opponent", opponentFromQuery);
        if (phaseOverride !== "auto") params.set("phaseOverride", phaseOverride);

        const res = await fetch(`/api/analysis/fcs/game/${encodeURIComponent(gameId)}?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok || data?.ok === false) throw new Error(data?.error ?? "Matchup fetch failed");
        const rawGame = data?.game as Record<string, unknown> | null;
        if (!rawGame) throw new Error("Game not found.");
        if (!cancelled) {
          setGame(normalizeCfbdGame(rawGame));
          setTgem((data?.tgem as TGEMResult | null) ?? null);
          if (!data?.tgem) {
            setTgemErr("Matchup analysis unavailable.");
          }
        }
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Unknown error");
      }
    }
    loadMatchupPayload();
    return () => {
      cancelled = true;
    };
  }, [gameId, teamName, opponentFromQuery, phaseOverride]);

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

  const reasonTable = useMemo(() => {
    if (!tgem) return null;
    const teamStats = tgem.statsSnapshot?.team ?? null;
    const opponentStats = tgem.statsSnapshot?.opponent ?? null;
    if (!teamStats || !opponentStats) return null;
    const teamNorm = normalizeTeamName(teamName);
    const homeNorm = normalizeTeamName(game?.homeTeam ?? "");
    const awayNorm = normalizeTeamName(game?.awayTeam ?? "");
    const teamIsHome = Boolean(homeNorm) && (homeNorm.includes(teamNorm) || teamNorm.includes(homeNorm));
    const teamIsAway = Boolean(awayNorm) && (awayNorm.includes(teamNorm) || teamNorm.includes(awayNorm));

    const homeStats = teamIsHome ? teamStats : teamIsAway ? opponentStats : teamStats;
    const awayStats = teamIsAway ? teamStats : teamIsHome ? opponentStats : opponentStats;

    return [
      { reason: "Points / Game", away: fmtStat(awayStats.pointsPerGame), home: fmtStat(homeStats.pointsPerGame) },
      { reason: "Points Allowed / Game", away: fmtStat(awayStats.pointsAllowedPerGame), home: fmtStat(homeStats.pointsAllowedPerGame) },
      { reason: "Yards / Game", away: fmtStat(awayStats.yardsPerGame), home: fmtStat(homeStats.yardsPerGame) },
      { reason: "Yards Allowed / Game", away: fmtStat(awayStats.yardsAllowedPerGame), home: fmtStat(homeStats.yardsAllowedPerGame) },
      { reason: "3rd Down %", away: fmtStat(awayStats.thirdDownPct, 1, true), home: fmtStat(homeStats.thirdDownPct, 1, true) },
      { reason: "4th Down %", away: fmtStat(awayStats.fourthDownPct, 1, true), home: fmtStat(homeStats.fourthDownPct, 1, true) },
      { reason: "Turnover Margin / Game", away: fmtStat(awayStats.turnoverMarginPerGame), home: fmtStat(homeStats.turnoverMarginPerGame) },
      { reason: "Penalty Yds / Game", away: fmtStat(awayStats.penaltyYardsPerGame), home: fmtStat(homeStats.penaltyYardsPerGame) },
    ];
  }, [tgem, teamName, game?.homeTeam, game?.awayTeam]);

  const requestedTeamName = useMemo(() => teamName || teamSlug, [teamName, teamSlug]);
  const requestedOpponentName = useMemo(() => opponentName || "Opponent", [opponentName]);
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
        <Link href={`/team-analysis/fcs/${teamSlug}`} className="hover:underline">
          {"<- Back to Team Page"}
        </Link>
        <span>|</span>
        <Link href="/team-analysis/fcs" className="hover:underline">
          FCS Analysis Home
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100" style={{ marginTop: 0, marginBottom: 8 }}>{seoHeading}</h1>
      <p className="max-w-3xl text-gray-700 dark:text-gray-300" style={{ marginTop: 0, marginBottom: 16, lineHeight: 1.6 }}>
        {seoDescription}
      </p>
      {err ? <div style={{ color: "#b00020" }}>{err}</div> : null}

      {!game ? (
        <div style={{ color: "var(--tgem-muted)" }}>Loading game...</div>
      ) : (
        <>
          <div className="tgem-surface rounded-3xl p-6" style={{ marginBottom: 20 }}>
            <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-700 dark:text-gray-300">
              <span className="rounded-full border border-[var(--tgem-border)] px-3 py-1">
                Season {seasonYear}
              </span>
              <span className="rounded-full border border-[var(--tgem-border)] px-3 py-1">
                Matchup Analysis
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-gray-100" style={{ marginBottom: 6 }}>{title}</h2>
            <p className="max-w-3xl text-sm leading-7 text-gray-700 dark:text-gray-300">
              An in-depth breakdown of team strengths, styles, and matchup dynamics for{" "}
              {requestedTeamName} and {requestedOpponentName}.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <SummaryTile label="Date" value={formatDateTime(game.startDate)} />
              <SummaryTile
                label="Venue"
                value={`${game.venue ?? "TBD"}${game.neutralSite ? " (Neutral)" : ""}`}
              />
              <SummaryTile label="Status" value={status} />
            </div>
          </div>

          {tgemErr ? (
            <div style={{ color: "#b00020" }}>{tgemErr}</div>
          ) : !tgem ? (
            <div style={{ color: "var(--tgem-muted)" }}>Loading matchup data...</div>
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
