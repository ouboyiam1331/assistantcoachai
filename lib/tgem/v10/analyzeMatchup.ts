// lib/tgem/v10/analyzeMatchup.ts

export type TGEMLean = "HOME" | "AWAY" | "PUSH" | "UNDEFINED";

export type SeasonStats = {
  games?: number | null;
  pointsForPerGame?: number | null;
  pointsAgainstPerGame?: number | null;

  totalYardsPerGame?: number | null;
  passYardsPerGame?: number | null;
  rushYardsPerGame?: number | null;

  thirdDownPct?: number | null; // 0-100
  redZoneTdPct?: number | null; // 0-100

  turnoversPerGame?: number | null;
  takeawaysPerGame?: number | null;

  penaltyYardsPerGame?: number | null;
};

export type TGEMSeasonStatsAnalysis = {
  ok: true;
  meta: {
    team: string;
    opponent: string;
    matchupYear: number;
    statsYear: number;
  };
  lean: TGEMLean;
  confidence: number; // 0-100
  reasons: string[];
  factors: {
    seasonStatsEdge: number; // -1..+1 (positive favors TEAM)
    venue: number; // -1..+1 (positive favors HOME)
  };
  statsSnapshot: {
    team: SeasonStats | null;
    opponent: SeasonStats | null;
  };
};

type CfbdSeasonStatRow = {
  team?: string;
  season?: number;
  statName?: string;
  statValue?: number;
};

// -----------------------------
// Helpers
// -----------------------------

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function safeNum(v: any): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function pctTo0to100(v: any): number | null {
  const n = safeNum(v);
  if (n === null) return null;
  // CFBD sometimes gives 0-1 or 0-100 depending on endpoint; normalize to 0-100
  return n <= 1 ? n * 100 : n;
}

function normalizeTeamSlug(s: string) {
  return (s ?? "").toLowerCase().trim();
}

/**
 * CFBD season stats endpoint:
 * https://api.collegefootballdata.com/stats/season?year=YYYY&team=Team Name
 *
 * Returns list of {statName, statValue, ...}
 */
async function fetchCfbdSeasonStats(teamSlug: string, year: number): Promise<CfbdSeasonStatRow[]> {
  const apiKey = process.env.CFBD_API_KEY || process.env.CFBD_KEY || "";
  if (!apiKey) {
    throw new Error("Missing CFBD API key (set CFBD_API_KEY in .env.local).");
  }

  // CFBD expects a team *name* (often works with common name). If your slug is "florida-state",
  // convert to "Florida State".
  const teamNameGuess = teamSlug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");

  const url =
    `https://api.collegefootballdata.com/stats/season` +
    `?year=${encodeURIComponent(String(year))}` +
    `&team=${encodeURIComponent(teamNameGuess)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    // prevent caching weirdness in dev
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`CFBD season stats failed (${res.status}): ${text || res.statusText}`);
  }

  const data = (await res.json()) as any;
  return Array.isArray(data) ? (data as CfbdSeasonStatRow[]) : [];
}

function pickStat(rows: CfbdSeasonStatRow[], name: string): number | null {
  // CFBD statName varies; this is best-effort.
  const row = rows.find((r) => (r.statName ?? "").toLowerCase() === name.toLowerCase());
  return row ? safeNum(row.statValue) : null;
}

function buildSeasonStats(rows: CfbdSeasonStatRow[]): SeasonStats {
  // These stat names may vary by CFBD; adjust later once you see the real payload.
  // For now we map common names used by CFBD "stats/season".
  const games = pickStat(rows, "games");

  const pointsForPerGame =
    safeNum(pickStat(rows, "pointsPerGame")) ??
    safeNum(pickStat(rows, "points per game"));

  const pointsAgainstPerGame =
    safeNum(pickStat(rows, "opponentPointsPerGame")) ??
    safeNum(pickStat(rows, "oppPointsPerGame")) ??
    safeNum(pickStat(rows, "opponent points per game"));

  const totalYardsPerGame =
    safeNum(pickStat(rows, "totalYardsPerGame")) ??
    safeNum(pickStat(rows, "yardsPerGame")) ??
    safeNum(pickStat(rows, "total yards per game"));

  const passYardsPerGame =
    safeNum(pickStat(rows, "netPassingYardsPerGame")) ??
    safeNum(pickStat(rows, "passingYardsPerGame")) ??
    safeNum(pickStat(rows, "pass yards per game"));

  const rushYardsPerGame =
    safeNum(pickStat(rows, "rushingYardsPerGame")) ??
    safeNum(pickStat(rows, "rush yards per game"));

  const thirdDownPct =
    pctTo0to100(pickStat(rows, "thirdDownConversionPct")) ??
    pctTo0to100(pickStat(rows, "third down pct")) ??
    pctTo0to100(pickStat(rows, "3rd down conversion pct"));

  const redZoneTdPct =
    pctTo0to100(pickStat(rows, "redZoneTdPct")) ??
    pctTo0to100(pickStat(rows, "red zone td pct"));

  const turnoversPerGame =
    safeNum(pickStat(rows, "turnoversPerGame")) ??
    safeNum(pickStat(rows, "turnovers per game"));

  const takeawaysPerGame =
    safeNum(pickStat(rows, "takeawaysPerGame")) ??
    safeNum(pickStat(rows, "takeaways per game"));

  const penaltyYardsPerGame =
    safeNum(pickStat(rows, "penaltyYardsPerGame")) ??
    safeNum(pickStat(rows, "penalty yards per game"));

  return {
    games: games ?? null,
    pointsForPerGame: pointsForPerGame ?? null,
    pointsAgainstPerGame: pointsAgainstPerGame ?? null,
    totalYardsPerGame: totalYardsPerGame ?? null,
    passYardsPerGame: passYardsPerGame ?? null,
    rushYardsPerGame: rushYardsPerGame ?? null,
    thirdDownPct: thirdDownPct ?? null,
    redZoneTdPct: redZoneTdPct ?? null,
    turnoversPerGame: turnoversPerGame ?? null,
    takeawaysPerGame: takeawaysPerGame ?? null,
    penaltyYardsPerGame: penaltyYardsPerGame ?? null,
  };
}

/**
 * Simple season stats edge model:
 * returns -1..+1 where + favors TEAM
 */
function computeSeasonStatsEdge(team: SeasonStats | null, opp: SeasonStats | null): { edge: number; notes: string[] } {
  const notes: string[] = [];

  if (!team || !opp) {
    notes.push("Season stats: not available yet (API returned null)");
    return { edge: 0, notes };
  }

  // weights (keep it small for now)
  const wPts = 0.35;
  const wYds = 0.25;
  const w3rd = 0.15;
  const wRZ = 0.15;
  const wTov = 0.10;

  function diff(a: number | null | undefined, b: number | null | undefined) {
    if (a == null || b == null) return null;
    return a - b;
  }

  // offense minus defense style: higher PF good, lower PA good
  const ptsNetA =
    team.pointsForPerGame != null && team.pointsAgainstPerGame != null
      ? team.pointsForPerGame - team.pointsAgainstPerGame
      : null;

  const ptsNetB =
    opp.pointsForPerGame != null && opp.pointsAgainstPerGame != null
      ? opp.pointsForPerGame - opp.pointsAgainstPerGame
      : null;

  const ptsNetDiff = diff(ptsNetA, ptsNetB);

  // yards (total)
  const ydsDiff = diff(team.totalYardsPerGame, opp.totalYardsPerGame);

  // conversions / efficiency
  const thirdDiff = diff(team.thirdDownPct, opp.thirdDownPct);
  const rzDiff = diff(team.redZoneTdPct, opp.redZoneTdPct);

  // turnovers: fewer is better, so invert
  const tovDiffRaw = diff(team.turnoversPerGame, opp.turnoversPerGame);
  const tovDiff = tovDiffRaw == null ? null : -tovDiffRaw;

  // normalize each component into roughly -1..+1
  const nPts = ptsNetDiff == null ? 0 : clamp(ptsNetDiff / 14, -1, 1);
  const nYds = ydsDiff == null ? 0 : clamp(ydsDiff / 200, -1, 1);
  const n3rd = thirdDiff == null ? 0 : clamp(thirdDiff / 20, -1, 1);
  const nRz = rzDiff == null ? 0 : clamp(rzDiff / 20, -1, 1);
  const nTov = tovDiff == null ? 0 : clamp(tovDiff / 2, -1, 1);

  const edge = clamp(
    nPts * wPts + nYds * wYds + n3rd * w3rd + nRz * wRZ + nTov * wTov,
    -1,
    1
  );

  notes.push(`Season stats model edge: ${(edge * 100).toFixed(0)} / 100 (positive favors TEAM)`);

  // add a couple readable comparisons when present
  if (team.pointsForPerGame != null && opp.pointsForPerGame != null) {
    notes.push(`Points For/G: TEAM ${team.pointsForPerGame.toFixed(1)} vs OPP ${opp.pointsForPerGame.toFixed(1)}`);
  }
  if (team.pointsAgainstPerGame != null && opp.pointsAgainstPerGame != null) {
    notes.push(`Points Against/G: TEAM ${team.pointsAgainstPerGame.toFixed(1)} vs OPP ${opp.pointsAgainstPerGame.toFixed(1)}`);
  }
  if (team.totalYardsPerGame != null && opp.totalYardsPerGame != null) {
    notes.push(`Total Yards/G: TEAM ${team.totalYardsPerGame.toFixed(1)} vs OPP ${opp.totalYardsPerGame.toFixed(1)}`);
  }
  if (team.thirdDownPct != null && opp.thirdDownPct != null) {
    notes.push(`3rd Down %: TEAM ${team.thirdDownPct.toFixed(1)} vs OPP ${opp.thirdDownPct.toFixed(1)}`);
  }

  return { edge, notes };
}

function decideLeanFromEdge(edge: number): TGEMLean {
  if (Math.abs(edge) < 0.08) return "PUSH";
  return edge > 0 ? "HOME" : "AWAY";
}

function confidenceFromEdge(edge: number): number {
  // edge -1..+1 -> confidence 50..95
  const c = 50 + Math.abs(edge) * 45;
  return Math.round(clamp(c, 50, 95));
}

// -----------------------------
// Main exported function
// -----------------------------
export async function analyzeMatchupSeasonOnly(params: {
  team: string; // slug
  opponent: string; // slug
  matchupYear: number;
  statsYear: number;
  isNeutralSite?: boolean;
  teamIsHome?: boolean;
}): Promise<TGEMSeasonStatsAnalysis> {
  const team = normalizeTeamSlug(params.team);
  const opponent = normalizeTeamSlug(params.opponent);
  const matchupYear = params.matchupYear;
  const statsYear = params.statsYear;

  // venue factor: simple placeholder
  const teamIsHome = params.teamIsHome ?? true;
  const venue = params.isNeutralSite ? 0 : teamIsHome ? +0.1 : -0.1;

  let teamStats: SeasonStats | null = null;
  let oppStats: SeasonStats | null = null;

  const reasons: string[] = [];

  try {
    const teamRows = await fetchCfbdSeasonStats(team, statsYear);
    teamStats = teamRows.length ? buildSeasonStats(teamRows) : null;
  } catch (e: any) {
    reasons.push(`Team season stats: error (${e?.message ?? "unknown"})`);
  }

  try {
    const oppRows = await fetchCfbdSeasonStats(opponent, statsYear);
    oppStats = oppRows.length ? buildSeasonStats(oppRows) : null;
  } catch (e: any) {
    reasons.push(`Opponent season stats: error (${e?.message ?? "unknown"})`);
  }

  const { edge: seasonStatsEdge, notes } = computeSeasonStatsEdge(teamStats, oppStats);
  reasons.push(...notes);

  // Combine edge with venue lightly
  const combined = clamp(seasonStatsEdge + venue, -1, 1);

  // lean: if TEAM is home, HOME means TEAM; if TEAM is away, flip.
  let lean: TGEMLean = decideLeanFromEdge(combined);
  if (!teamIsHome) {
    if (lean === "HOME") lean = "AWAY";
    else if (lean === "AWAY") lean = "HOME";
  }

  const confidence = confidenceFromEdge(combined);

  reasons.push(`Venue factor: ${params.isNeutralSite ? "neutral" : teamIsHome ? "team is HOME" : "team is AWAY"}`);

  return {
    ok: true,
    meta: { team, opponent, matchupYear, statsYear },
    lean: lean ?? "UNDEFINED",
    confidence,
    reasons,
    factors: {
      seasonStatsEdge,
      venue,
    },
    statsSnapshot: {
      team: teamStats,
      opponent: oppStats,
    },
  };
}
