"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AdSlot from "@/components/ui/AdSlot";
import TgemDisclaimer from "@/components/ui/TgemDisclaimer";
import { applyCollegeMatchupGuardrails } from "@/lib/college/matchupGuardrails";

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

function deriveTgemPhase(game: ScheduleGame | null): TgemPhase {
  const st = String(game?.seasonType ?? "").toLowerCase();
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
  if (typeof game?.week === "number" && game.week >= 14) return "championship";
  return "regular";
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

type SnapshotLine = {
  pointsPerGame?: number | null;
  pointsAllowedPerGame?: number | null;
  thirdDownPct?: number | null;
  turnoverMarginPerGame?: number | null;
  penaltyYardsPerGame?: number | null;
};

function buildCoachMatchupRead(args: {
  favored: string;
  opponent: string;
  confidence?: number;
  phase: TgemPhase;
  favoredStats: SnapshotLine | null;
  opponentStats: SnapshotLine | null;
  fallbackReasons: string[];
}) {
  const {
    favored,
    opponent,
    confidence,
    phase,
    favoredStats,
    opponentStats,
    fallbackReasons,
  } = args;

  const bullets: string[] = [];
  const risks: string[] = [];

  const ppgEdge =
    favoredStats?.pointsPerGame != null && opponentStats?.pointsPerGame != null
      ? favoredStats.pointsPerGame - opponentStats.pointsPerGame
      : null;
  if (ppgEdge != null) {
    if (ppgEdge >= 2) bullets.push("their offense has been creating steadier scoring drives");
    else if (ppgEdge <= -2) risks.push("the offense can get squeezed if early drives stall");
  }

  const defEdge =
    favoredStats?.pointsAllowedPerGame != null &&
    opponentStats?.pointsAllowedPerGame != null
      ? opponentStats.pointsAllowedPerGame - favoredStats.pointsAllowedPerGame
      : null;
  if (defEdge != null) {
    if (defEdge >= 2) bullets.push("the defense has been more reliable at limiting scoring");
    else if (defEdge <= -2) risks.push("defensive leaks can flip momentum fast");
  }

  const thirdEdge =
    favoredStats?.thirdDownPct != null && opponentStats?.thirdDownPct != null
      ? favoredStats.thirdDownPct - opponentStats.thirdDownPct
      : null;
  if (thirdEdge != null) {
    if (thirdEdge >= 3) bullets.push("they are extending drives better on third down");
    else if (thirdEdge <= -3) risks.push("third-down efficiency is a pressure point");
  }

  const toEdge =
    favoredStats?.turnoverMarginPerGame != null &&
    opponentStats?.turnoverMarginPerGame != null
      ? favoredStats.turnoverMarginPerGame - opponentStats.turnoverMarginPerGame
      : null;
  if (toEdge != null) {
    if (toEdge >= 0.2) bullets.push("they have the cleaner turnover profile");
    else if (toEdge <= -0.2) risks.push("turnovers are the clearest upset path");
  }

  const disciplineEdge =
    favoredStats?.penaltyYardsPerGame != null &&
    opponentStats?.penaltyYardsPerGame != null
      ? opponentStats.penaltyYardsPerGame - favoredStats.penaltyYardsPerGame
      : null;
  if (disciplineEdge != null) {
    if (disciplineEdge >= 5) bullets.push("discipline has been better in hidden-yardage spots");
    else if (disciplineEdge <= -5) risks.push("penalty volume can stall otherwise good possessions");
  }

  const confidenceText =
    typeof confidence === "number" ? ` at ${confidence}/100 confidence` : "";
  const line1 = `From a sideline view, TGEM leans ${favored}${confidenceText} in this ${phase.toUpperCase()} spot.`;

  if (bullets.length === 0) {
    const fallback = fallbackReasons.slice(0, 2).join("; ");
    const line2 = fallback
      ? `The edge is model-driven right now: ${fallback}.`
      : `The edge is coming from composite ratings and situational execution signals.`;
    return `${line1} ${line2}`;
  }

  const line2 = `${favored} has the cleaner path because ${bullets.slice(0, 2).join(" and ")}.`;
  const line3 =
    risks.length > 0
      ? `Flip risk: ${risks[0]}. If ${opponent} wins that area, this game can turn fast.`
      : `If they stay clean situationally, ${favored} is built to control this game wire to wire.`;
  return `${line1} ${line2} ${line3}`;
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
  const autoPhase = useMemo(() => deriveTgemPhase(game), [game]);
  const effectivePhase = phaseOverride === "auto" ? autoPhase : phaseOverride;
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
    if (!game?.homeTeam || !game?.awayTeam) return "College Football Prediction & Analysis";
    return `${game.homeTeam} vs ${game.awayTeam} Prediction & Analysis`;
  }, [game]);
  const seoDescription = useMemo(() => {
    if (!game?.homeTeam || !game?.awayTeam) {
      return "TGEM matchup breakdown with key stats, matchup advantages, and model-based prediction.";
    }
    return `TGEM breakdown of ${game.homeTeam} vs ${game.awayTeam}, including key stats, matchup advantages, and model-based prediction.`;
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

    const homeRating = teamIsHome || !teamIsAway ? (tgem.ratings?.team ?? null) : (tgem.ratings?.opponent ?? null);
    const awayRating = teamIsAway || !teamIsHome ? (tgem.ratings?.team ?? null) : (tgem.ratings?.opponent ?? null);

    return [
      { reason: "TGEM Rating", away: awayRating == null ? "N/A" : String(awayRating), home: homeRating == null ? "N/A" : String(homeRating) },
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
  const guardedSummary = useMemo(
    () =>
      applyCollegeMatchupGuardrails({
        homeTeam: game?.homeTeam,
        awayTeam: game?.awayTeam,
        neutralSite: game?.neutralSite,
        lean: tgem?.lean,
        confidence: tgem?.confidence,
        reasons: tgem?.reasons,
      }),
    [game?.awayTeam, game?.homeTeam, game?.neutralSite, tgem?.confidence, tgem?.lean, tgem?.reasons],
  );

  const coachRead = useMemo(() => {
    if (!tgem) return null;
    const teamDisplay = teamName || "Team";
    const oppDisplay = opponentName || "Opponent";

    const teamNorm = normalizeTeamName(teamName);
    const homeNorm = normalizeTeamName(game?.homeTeam ?? "");
    const awayNorm = normalizeTeamName(game?.awayTeam ?? "");
    const teamIsHome = Boolean(homeNorm) && (homeNorm.includes(teamNorm) || teamNorm.includes(homeNorm));
    const teamIsAway = Boolean(awayNorm) && (awayNorm.includes(teamNorm) || teamNorm.includes(awayNorm));

    const favoredByLean =
      guardedSummary.lean === "HOME"
        ? teamIsHome
          ? teamDisplay
          : game?.homeTeam ?? teamDisplay
        : guardedSummary.lean === "AWAY"
          ? teamIsAway
            ? teamDisplay
            : game?.awayTeam ?? oppDisplay
          : (tgem.ratings?.delta ?? 0) >= 0
            ? teamDisplay
            : oppDisplay;

    const underdog = favoredByLean === teamDisplay ? oppDisplay : teamDisplay;
    const favoredStats =
      favoredByLean === teamDisplay
        ? tgem.statsSnapshot?.team ?? null
        : tgem.statsSnapshot?.opponent ?? null;
    const opponentStats =
      favoredByLean === teamDisplay
        ? tgem.statsSnapshot?.opponent ?? null
        : tgem.statsSnapshot?.team ?? null;

    return buildCoachMatchupRead({
      favored: favoredByLean,
      opponent: underdog,
      confidence: guardedSummary.confidence ?? undefined,
      phase: effectivePhase,
      favoredStats,
      opponentStats,
      fallbackReasons: guardedSummary.reasons,
    });
  }, [
    guardedSummary.confidence,
    guardedSummary.lean,
    guardedSummary.reasons,
    tgem,
    teamName,
    opponentName,
    game?.homeTeam,
    game?.awayTeam,
    effectivePhase,
  ]);

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
                {effectivePhase.toUpperCase()} Phase
              </span>
              <span className="rounded-full border border-[var(--tgem-border)] px-3 py-1">
                TGEM Matchup Read
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-gray-100" style={{ marginBottom: 6 }}>{title}</h2>
            <p className="max-w-3xl text-sm leading-7 text-gray-700 dark:text-gray-300">
              Compare the current college profile for {requestedTeamName} and {requestedOpponentName},
              then read the live TGEM lean without changing any of the underlying matchup logic.
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

          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100" style={{ marginBottom: 10 }}>TGEM v11 Analysis</h2>
          <TgemDisclaimer />
          <div style={{ marginBottom: 10, display: "flex", gap: 10, alignItems: "center" }}>
            <label htmlFor="phaseOverride" style={{ fontWeight: 600 }}>
              TGEM Phase:
            </label>
            <select
              id="phaseOverride"
              value={phaseOverride}
              onChange={(e) => setPhaseOverride(e.target.value as "auto" | TgemPhase)}
              style={{ border: "1px solid var(--tgem-border)", borderRadius: 6, padding: "4px 8px", background: "var(--tgem-surface)", color: "var(--foreground)" }}
            >
              <option value="auto">Auto ({autoPhase.toUpperCase()})</option>
              <option value="regular">Regular</option>
              <option value="championship">Championship</option>
              <option value="bowl">Bowl</option>
              <option value="cfp">CFP</option>
            </select>
            <span style={{ color: "var(--tgem-muted)", fontSize: 13 }}>
              Effective: {effectivePhase.toUpperCase()}
            </span>
          </div>
          {tgemErr ? (
            <div style={{ color: "#b00020" }}>{tgemErr}</div>
          ) : !tgem ? (
            <div style={{ color: "var(--tgem-muted)" }}>Running TGEM...</div>
          ) : (
            <div className="space-y-6">
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
                    Weighted Category Scores
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-gray-700 dark:text-gray-300">
                    This keeps the existing college comparison logic, but presents it as a cleaner
                    side-by-side scoring board.
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
                    <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-gray-700 dark:text-gray-300">
                      {(tgem.reasons ?? []).slice(0, 8).map((r, i) => (
                        <li key={`${i}_${r}`}>{r}</li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              <section className="tgem-surface rounded-3xl p-6 text-gray-900 dark:text-gray-100">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  TGEM Read
                </h3>
                <p className="mt-2 text-sm leading-7 text-gray-700 dark:text-gray-300">
                  The model output below is unchanged. This is the same lean, confidence, and reasons,
                  just organized into a cleaner read.
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <SummaryTile label="Lean" value={guardedSummary.lean ?? "UNDEFINED"} />
                  <SummaryTile
                    label="Confidence"
                    value={
                      typeof guardedSummary.confidence === "number"
                        ? `${guardedSummary.confidence} / 100`
                        : "N/A"
                    }
                  />
                  <SummaryTile
                    label="Rating Edge"
                    value={
                      typeof tgem.ratings?.delta === "number"
                        ? String(tgem.ratings.delta)
                        : "N/A"
                    }
                  />
                </div>
                <div className="mt-4 text-sm text-gray-700 dark:text-gray-300">
                  {typeof tgem.ratings?.team === "number" && typeof tgem.ratings?.opponent === "number" ? (
                    <>
                      <strong className="text-gray-900 dark:text-gray-100">TGEM Ratings:</strong>{" "}
                      {requestedTeamName}: {tgem.ratings.team} | {requestedOpponentName}: {tgem.ratings.opponent}
                    </>
                  ) : null}
                </div>
                {coachRead ? (
                  <p className="mt-4 text-sm leading-7 text-gray-700 dark:text-gray-300">
                    <strong className="text-gray-900 dark:text-gray-100">TGEM Coach Read:</strong>{" "}
                    {coachRead}
                  </p>
                ) : null}
                <div className="mt-4">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Model Reasons</div>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-700 dark:text-gray-300">
                    {guardedSummary.reasons.slice(0, 8).map((r, i) => (
                      <li key={`${i}_${r}`}>{r}</li>
                    ))}
                  </ul>
                </div>
              </section>
            </div>
          )}
          <div className="tgem-cta-success" style={{ marginTop: 16, padding: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
              Want to carry this lean into Pick&apos;em?
            </div>
            <p className="tgem-cta-success-copy" style={{ margin: "0 0 12px 0", lineHeight: 1.6 }}>
              Jump into Pick&apos;em Mode to stack multiple TGEM matchup reads on one
              slate and make your own calls from there. The lean is a guide, not a lock.
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
              Build Picks Now
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
