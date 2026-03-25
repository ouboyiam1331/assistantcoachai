"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import TgemDisclaimer from "@/components/ui/TgemDisclaimer";

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

    const homeRating =
      teamIsHome || !teamIsAway
        ? (tgem.ratings?.team ?? null)
        : (tgem.ratings?.opponent ?? null);
    const awayRating =
      teamIsAway || !teamIsHome
        ? (tgem.ratings?.team ?? null)
        : (tgem.ratings?.opponent ?? null);

    return [
      {
        reason: "TGEM Rating",
        away: awayRating == null ? "N/A" : String(awayRating),
        home: homeRating == null ? "N/A" : String(homeRating),
      },
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

  const coachRead = useMemo(() => {
    if (!tgem) return null;
    const teamDisplay = findTeamBySlug(teamSlug)?.name ?? tgem.team ?? teamSlug;
    const opponentDisplay =
      (opponentSlug ? findTeamBySlug(opponentSlug)?.name : null) ??
      tgem.opponent ??
      opponentSlug ??
      "Opponent";

    const teamIsHome = Boolean(homeSlug) && homeSlug === teamSlug;
    const teamIsAway = Boolean(awaySlug) && awaySlug === teamSlug;
    const favoredByLean =
      tgem.lean === "HOME"
        ? teamIsHome
          ? teamDisplay
          : game?.homeTeam ?? teamDisplay
        : tgem.lean === "AWAY"
          ? teamIsAway
            ? teamDisplay
            : game?.awayTeam ?? opponentDisplay
          : (tgem.ratings?.delta ?? 0) >= 0
            ? teamDisplay
            : opponentDisplay;
    const underdog = favoredByLean === teamDisplay ? opponentDisplay : teamDisplay;

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
      confidence: tgem.confidence,
      phase: effectivePhase,
      favoredStats,
      opponentStats,
      fallbackReasons: tgem.reasons ?? [],
    });
  }, [
    tgem,
    teamSlug,
    opponentSlug,
    homeSlug,
    awaySlug,
    game?.homeTeam,
    game?.awayTeam,
    effectivePhase,
  ]);

  return (
    <main className="tgem-shell">
      <div style={{ marginBottom: 14 }}>
        <Link href={`/team-analysis/fbs/${teamSlug}`} className="tgem-back-link">
          {"<- Back"}
        </Link>
      </div>
      <div style={{ marginBottom: 14 }}>
      </div>

      <h1 style={{ marginTop: 0, marginBottom: 8 }}>{seoHeading}</h1>
      <p style={{ marginTop: 0, marginBottom: 16, maxWidth: 820, color: "#444", lineHeight: 1.6 }}>
        {seoDescription}
      </p>

      {err ? (
        <div style={{ color: "#b00020" }}>{err}</div>
      ) : !game ? (
        <div style={{ color: "#666" }}>Loading game…</div>
      ) : (
        <>
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: "#444" }}>
              <strong>Team:</strong> {teamSlug}{" "}
              <span style={{ color: "#999" }}>|</span> <strong>Season:</strong>{" "}
              {seasonYear} <span style={{ color: "#999" }}>|</span>{" "}
              <strong>Opponent:</strong> {opponentSlug || "Resolving…"}
            </div>

            <h2 style={{ marginBottom: 6 }}>{title}</h2>

            <div>
              <strong>Date:</strong> {formatDateTime(game.startDate)}
            </div>
            <div>
              <strong>Venue:</strong> {game.venue ?? "TBD"}
              {game.neutralSite ? " (Neutral)" : ""}
            </div>
            <div>
              <strong>Status:</strong> {status}
            </div>
          </div>

          <hr style={{ margin: "18px 0" }} />

          <h2 style={{ marginBottom: 10 }}>TGEM v11 Analysis</h2>
          <TgemDisclaimer />
          <div style={{ marginBottom: 10, display: "flex", gap: 10, alignItems: "center" }}>
            <label htmlFor="phaseOverride" style={{ fontWeight: 600 }}>
              TGEM Phase:
            </label>
            <select
              id="phaseOverride"
              value={phaseOverride}
              onChange={(e) => setPhaseOverride(e.target.value as "auto" | TgemPhase)}
              style={{ border: "1px solid #ccc", borderRadius: 6, padding: "4px 8px" }}
            >
              <option value="auto">Auto ({autoPhase.toUpperCase()})</option>
              <option value="regular">Regular</option>
              <option value="championship">Championship</option>
              <option value="bowl">Bowl</option>
              <option value="cfp">CFP</option>
            </select>
            <span style={{ color: "#666", fontSize: 13 }}>
              Effective: {effectivePhase.toUpperCase()}
            </span>
          </div>

	          {tgemErr ? (
	            <div style={{ color: "#b00020" }}>{tgemErr}</div>
	          ) : !tgem ? (
	            <div style={{ color: "#666" }}>Running TGEM…</div>
	          ) : (
            <div
              className="tgem-card"
              style={{
                border: "1px solid #eee",
                borderRadius: 12,
                padding: 14,
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <strong>Lean:</strong> {tgem.lean ?? "UNDEFINED"}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Confidence:</strong>{" "}
                {typeof tgem.confidence === "number"
                  ? `${tgem.confidence} / 100`
                  : "N/A"}
              </div>
	              <div style={{ marginBottom: 8 }}>
                <strong>TGEM Ratings:</strong>{" "}
                {typeof tgem.ratings?.team === "number" &&
                typeof tgem.ratings?.opponent === "number" ? (
                  <>
                    {teamSlug}: {tgem.ratings.team} | {opponentSlug}:{" "}
                    {tgem.ratings.opponent}
                    {typeof tgem.ratings?.delta === "number" ? (
                      <>
                        {" "}
                        | <strong>Rating Edge:</strong> {tgem.ratings.delta}
                      </>
                    ) : null}
                  </>
                ) : (
                  "N/A"
                )}
              </div>
              {typeof tgem.ratings?.delta === "number" ? (
                <div style={{ marginBottom: 8, fontSize: 13, color: "#555" }}>
                  Rating Edge = {teamSlug} rating minus {opponentSlug} rating.
                  Positive favors {teamSlug}; negative favors {opponentSlug}.
                </div>
              ) : null}
              {coachRead ? (
                <div style={{ marginBottom: 10, lineHeight: 1.5, color: "#222" }}>
                  <strong>TGEM Coach Read:</strong> {coachRead}
                </div>
              ) : null}
              <div style={{ marginBottom: 6 }}>
                <strong>Reasons Table (Away vs Home):</strong>
              </div>
              {reasonTable ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#fafafa" }}>
                        <th
                          style={{
                            textAlign: "left",
                            padding: 8,
                            borderBottom: "1px solid #eee",
                          }}
                        >
                          Away ({game.awayTeam ?? "Away"})
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: 8,
                            borderBottom: "1px solid #eee",
                          }}
                        >
                          Reason
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: 8,
                            borderBottom: "1px solid #eee",
                          }}
                        >
                          Home ({game.homeTeam ?? "Home"})
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {reasonTable.map((row) => (
                        <tr key={row.reason}>
                          <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>
                            {row.away}
                          </td>
                          <td
                            style={{
                              padding: 8,
                              borderBottom: "1px solid #f0f0f0",
                              fontWeight: 600,
                            }}
                          >
                            {row.reason}
                          </td>
                          <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>
                            {row.home}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <ul style={{ marginTop: 6 }}>
                  {(tgem.reasons ?? []).map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}

              {tgem.stats ? (
                <>
                  <hr style={{ margin: "14px 0" }} />
                  <div style={{ fontSize: 13, color: "#555" }}>
                    <strong>Stats Snapshot:</strong>
                    <pre style={{ whiteSpace: "pre-wrap" }}>
                      {JSON.stringify(tgem.stats, null, 2)}
                    </pre>
                  </div>
                </>
              ) : null}
	            </div>
	          )}
          <div style={{ marginTop: 14 }}>
          </div>
	        </>
	      )}
    </main>
  );
}


