type VenueHint = "home" | "away" | "neutral";
import { resolveCfbdTeamName } from "@/lib/cfbd/teamName";
type TGEMPhase = "regular" | "championship" | "bowl" | "cfp";
type TGEMPhaseInput = TGEMPhase | "postseason";

export type AnalyzeMatchupInput = {
  team: string; // slug
  opponent: string; // slug
  year: number; // season year
  venue?: VenueHint;
  phase?: TGEMPhaseInput;
  week?: number;
  seasonType?: string;
  lightweight?: boolean;
};

type SeasonStats = {
  games: number | null;

  // Offense
  pointsPerGame: number | null;
  yardsPerGame: number | null;
  passYardsPerGame: number | null;
  rushYardsPerGame: number | null;

  // Defense
  pointsAllowedPerGame: number | null;
  yardsAllowedPerGame: number | null;

  // Situational
  thirdDownPct: number | null; // 0-100
  fourthDownPct: number | null; // 0-100
  redZonePct: number | null; // 0-100

  // Discipline / ball security
  penaltiesPerGame: number | null;
  penaltyYardsPerGame: number | null;

  // takeaways - giveaways per game
  turnoverMarginPerGame: number | null;
};

type TeamGameStat = {
  category?: unknown;
  label?: unknown;
  stat?: unknown;
  value?: unknown;
};

type TeamGameSide = {
  school?: unknown;
  team?: unknown;
  name?: unknown;
  points?: unknown;
  stats?: unknown;
};

type AvailabilityRisk = {
  risk: number; // 0-100
  flags: string[];
};

export type AnalyzeMatchupOutput = {
  meta: { team: string; opponent: string };
  lean: "HOME" | "AWAY";
  confidence: number; // 0-100
  ratings?: {
    team: number;
    opponent: number;
    delta: number;
  };
  reasons: string[];
  factors: {
    seasonStatsEdge: number; // -1..+1-ish
    venue: number; // -1..+1-ish
    availabilityRisk?: number; // 0..100
  };
  statsSnapshot: {
    team: SeasonStats | null;
    opponent: SeasonStats | null;
    yearUsed?: { team?: number; opponent?: number };
    diffs?: unknown;
    score?: unknown;
  };
  modelMeta?: {
    phase: TGEMPhase;
    phaseModules: PhaseModuleWeights;
    moduleCoverage: {
      directWeight: number;
      proxyWeight: number;
      missingWeight: number;
      missingModules: string[];
      proxyModules: string[];
    };
  };
};

const CFBD_API = "https://api.collegefootballdata.com";
const API_KEY = process.env.CFBD_API_KEY;

type PhaseModuleWeights = {
  rsi: number;
  qbImpact: number;
  scheduleDifficulty: number;
  injuryDepth: number;
  efficiency: number;
  turnoverVolatility: number;
  coachingStability: number;
  psychologyMotivation: number;
  modifier: number;
};

// Source: TGEM_v11_Weighting_Tables.pdf
const PHASE_MODULE_WEIGHTS: Record<TGEMPhase, PhaseModuleWeights> = {
  regular: {
    rsi: 22,
    qbImpact: 15,
    scheduleDifficulty: 10,
    injuryDepth: 12,
    efficiency: 15,
    turnoverVolatility: 10,
    coachingStability: 8,
    psychologyMotivation: 5,
    modifier: 3,
  },
  championship: {
    rsi: 20,
    qbImpact: 15,
    scheduleDifficulty: 8,
    injuryDepth: 12,
    efficiency: 18,
    turnoverVolatility: 12,
    coachingStability: 8,
    psychologyMotivation: 7, // 5 championship exp + 2 pressure index
    modifier: 0,
  },
  bowl: {
    rsi: 18,
    qbImpact: 15,
    scheduleDifficulty: 0,
    injuryDepth: 18, // injury + opt-out adjustment
    efficiency: 12,
    turnoverVolatility: 10,
    coachingStability: 7, // interim coach energy modifier
    psychologyMotivation: 20, // motivation + momentum
    modifier: 0,
  },
  cfp: {
    rsi: 23,
    qbImpact: 18,
    scheduleDifficulty: 0,
    injuryDepth: 10,
    efficiency: 18,
    turnoverVolatility: 10,
    coachingStability: 15, // coaching + preparedness/rest differential
    psychologyMotivation: 6,
    modifier: 0,
  },
};

function getPhaseScoringWeights(phase: TGEMPhase) {
  const modules = PHASE_MODULE_WEIGHTS[phase];
  const efficiencyScale = modules.efficiency / 15;
  const turnoverScale = modules.turnoverVolatility / 10;
  const rsiQbScale = (modules.rsi + modules.qbImpact) / (22 + 15);

  return {
    ppg: 2.0 * efficiencyScale,
    defPpg: 2.0 * efficiencyScale,
    ypg: 0.02 * efficiencyScale,
    defYpg: 0.02 * efficiencyScale,
    third: 0.2 * efficiencyScale,
    redZone: 0.15 * efficiencyScale,
    turnovers: 8.0 * turnoverScale,
    ratingScale: 2.2 * rsiQbScale,
    modules,
  };
}

type PostseasonBucketScore = {
  structural: number;
  performance: number;
  context: number;
  volatility: number;
  momentum: number;
  qbImpact: number;
  final: number;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function safeNum(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function avg(sum: number, games: number) {
  return games > 0 ? sum / games : 0;
}

function parseMadeAttPair(value: unknown): [number, number] | null {
  if (typeof value !== "string") return null;
  const m = value.match(/(\d+)\s*-\s*(\d+)/);
  if (!m) return null;
  const made = Number(m[1]);
  const att = Number(m[2]);
  if (!Number.isFinite(made) || !Number.isFinite(att)) return null;
  return [made, att];
}

// Normalize strings so "Miami (FL)" and "Miami" can match well.
function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, "") // remove (FL), (OH), etc
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "") // strip punctuation/spaces
    .trim();
}

// Convert your slugs to CFBD team names (CFBD wants official team name strings)
function slugToCfbdTeamName(slugOrName: string) {
  return resolveCfbdTeamName(slugOrName);
}

async function cfbdFetchJson(url: string) {
  if (!API_KEY) throw new Error("CFBD_API_KEY not configured");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${API_KEY}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CFBD season stats failed (${res.status}): ${text}`);
  }

  return res.json();
}

// Pull per-game stats from CFBD /games/teams
async function fetchGamesTeams(teamSlug: string, year: number) {
  const cfbdTeamName = slugToCfbdTeamName(teamSlug);

  const url = `${CFBD_API}/games/teams?year=${encodeURIComponent(
    String(year),
  )}&team=${encodeURIComponent(cfbdTeamName)}&seasonType=both`;

  const rows = await cfbdFetchJson(url);
  return Array.isArray(rows) ? rows : [];
}

async function fetchGamesByTeam(teamSlug: string, year: number) {
  const cfbdTeamName = slugToCfbdTeamName(teamSlug);
  const url = `${CFBD_API}/games?year=${encodeURIComponent(
    String(year),
  )}&team=${encodeURIComponent(cfbdTeamName)}&seasonType=both`;
  const rows = await cfbdFetchJson(url);
  return Array.isArray(rows) ? rows : [];
}

async function fetchGamesPlayers(teamSlug: string, year: number) {
  const cfbdTeamName = slugToCfbdTeamName(teamSlug);
  const url = `${CFBD_API}/games/players?year=${encodeURIComponent(
    String(year),
  )}&team=${encodeURIComponent(cfbdTeamName)}&seasonType=both`;
  const rows = await cfbdFetchJson(url);
  return Array.isArray(rows) ? rows : [];
}

// Aggregate CFBD /games/teams into season averages for the given team
function aggregateSeasonStats(
  rows: unknown[],
  teamSlug: string,
): SeasonStats | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  let games = 0;

  let ptsFor = 0;
  let ptsAgainst = 0;

  let ydsFor = 0;
  let ydsAgainst = 0;

  let passFor = 0;
  let rushFor = 0;

  let thirdMade = 0;
  let thirdAtt = 0;
  let fourthMade = 0;
  let fourthAtt = 0;

  let rzMade = 0;
  let rzAtt = 0;

  let penalties = 0;
  let penaltyYds = 0;

  let giveaways = 0;
  let takeaways = 0;

  // IMPORTANT: Match based on CFBD team name (normalized)
  const tq = norm(slugToCfbdTeamName(teamSlug));

  for (const g of rows) {
    const teamsRaw = (g as { teams?: unknown })?.teams;
    const teams = Array.isArray(teamsRaw) ? teamsRaw : null;
    if (!teams || teams.length < 2) continue;

    const a = teams[0] as TeamGameSide;
    const b = teams[1] as TeamGameSide;

    const aName = norm(String(a?.school ?? a?.team ?? a?.name ?? ""));
    const bName = norm(String(b?.school ?? b?.team ?? b?.name ?? ""));

    let t: TeamGameSide | null = null;
    let o: TeamGameSide | null = null;

    if (aName.includes(tq) || tq.includes(aName)) {
      t = a;
      o = b;
    } else if (bName.includes(tq) || tq.includes(bName)) {
      t = b;
      o = a;
    } else {
      // fallback (rare if query matched properly)
      t = a;
      o = b;
    }

    const tPts = safeNum(t?.points);
    const oPts = safeNum(o?.points);

    // skip future games without scores
    if (tPts == null || oPts == null) continue;

    games += 1;
    ptsFor += tPts;
    ptsAgainst += oPts;

    const tStats: TeamGameStat[] = Array.isArray(t?.stats)
      ? (t.stats as TeamGameStat[])
      : [];
    const oStats: TeamGameStat[] = Array.isArray(o?.stats)
      ? (o.stats as TeamGameStat[])
      : [];

    function statVal(statsArr: TeamGameStat[], keyContains: string) {
      const hit = statsArr.find((s) =>
        String(s?.category ?? s?.label ?? "")
          .toLowerCase()
          .includes(keyContains),
      );
      return safeNum(hit?.stat ?? hit?.value);
    }

    // Yardage
    const tTotal = statVal(tStats, "total");
    const oTotal = statVal(oStats, "total");
    if (tTotal != null) ydsFor += tTotal;
    if (oTotal != null) ydsAgainst += oTotal;

    const tPass = statVal(tStats, "passing");
    const tRush = statVal(tStats, "rushing");
    if (tPass != null) passFor += tPass;
    if (tRush != null) rushFor += tRush;

    // 3rd down often formatted "6-14"
    const tThird = tStats.find((s) =>
      String(s?.category ?? "")
        .toLowerCase()
        .includes("third"),
    );
    if (
      tThird?.stat &&
      typeof tThird.stat === "string" &&
      tThird.stat.includes("-")
    ) {
      const [m, a2] = tThird.stat.split("-").map((x: string) => Number(x));
      if (Number.isFinite(m) && Number.isFinite(a2)) {
        thirdMade += m;
        thirdAtt += a2;
      }
    }

    // 4th down often formatted "1-2"
    const tFourth = tStats.find((s) => {
      const c = String(s?.category ?? "").toLowerCase();
      return c.includes("fourth") || c.includes("4th");
    });
    const fourthPair = parseMadeAttPair(tFourth?.stat);
    if (fourthPair) {
      fourthMade += fourthPair[0];
      fourthAtt += fourthPair[1];
    }

    // red zone often formatted "3-5"
    const tRz = tStats.find((s) =>
      String(s?.category ?? "")
        .toLowerCase()
        .includes("red zone"),
    );
    if (tRz?.stat && typeof tRz.stat === "string" && tRz.stat.includes("-")) {
      const [m, a2] = tRz.stat.split("-").map((x: string) => Number(x));
      if (Number.isFinite(m) && Number.isFinite(a2)) {
        rzMade += m;
        rzAtt += a2;
      }
    }

    // Discipline
    const tPenEntry = tStats.find((s) =>
      String(s?.category ?? s?.label ?? "")
        .toLowerCase()
        .includes("penalt"),
    );
    const tPen = statVal(tStats, "penalt");
    const tPenY =
      statVal(tStats, "penalty yards") ?? statVal(tStats, "penalty yds");
    if (tPen != null) penalties += tPen;
    if (tPenY != null) penaltyYds += tPenY;
    if ((tPen == null || tPenY == null) && tPenEntry) {
      const penaltyPair = parseMadeAttPair(tPenEntry?.stat);
      if (penaltyPair) {
        if (tPen == null) penalties += penaltyPair[0];
        if (tPenY == null) penaltyYds += penaltyPair[1];
      }
    }

    // Turnovers
    const tTo = statVal(tStats, "turnovers");
    const oTo = statVal(oStats, "turnovers");
    if (tTo != null) giveaways += tTo;
    if (oTo != null) takeaways += oTo;
  }

  if (games === 0) return null;

  const thirdPct = thirdAtt > 0 ? (thirdMade / thirdAtt) * 100 : null;
  const fourthPct = fourthAtt > 0 ? (fourthMade / fourthAtt) * 100 : null;
  const rzPct = rzAtt > 0 ? (rzMade / rzAtt) * 100 : null;
  const toMarginPerGame = (takeaways - giveaways) / games;

  return {
    games,

    pointsPerGame: round1(avg(ptsFor, games)),
    yardsPerGame: ydsFor > 0 ? round1(avg(ydsFor, games)) : null,
    passYardsPerGame: passFor > 0 ? round1(avg(passFor, games)) : null,
    rushYardsPerGame: rushFor > 0 ? round1(avg(rushFor, games)) : null,

    pointsAllowedPerGame: round1(avg(ptsAgainst, games)),
    yardsAllowedPerGame: ydsAgainst > 0 ? round1(avg(ydsAgainst, games)) : null,

    thirdDownPct: thirdPct != null ? round1(thirdPct) : null,
    fourthDownPct: fourthPct != null ? round1(fourthPct) : null,
    redZonePct: rzPct != null ? round1(rzPct) : null,

    penaltiesPerGame: penalties > 0 ? round1(avg(penalties, games)) : null,
    penaltyYardsPerGame: penaltyYds > 0 ? round1(avg(penaltyYds, games)) : null,

    turnoverMarginPerGame: round1(toMarginPerGame),
  };
}

async function getAlignedSeasonStats(
  teamSlug: string,
  opponentSlug: string,
  year: number,
) {
  for (const y of [year, year - 1]) {
    const [teamRows, oppRows] = await Promise.all([
      fetchGamesTeams(teamSlug, y),
      fetchGamesTeams(opponentSlug, y),
    ]);
    const teamStats = aggregateSeasonStats(teamRows, teamSlug);
    const oppStats = aggregateSeasonStats(oppRows, opponentSlug);
    if (
      teamStats?.games != null &&
      teamStats.games > 0 &&
      oppStats?.games != null &&
      oppStats.games > 0
    ) {
      return { yearUsed: y, teamStats, oppStats };
    }
  }
  return {
    yearUsed: year,
    teamStats: null as SeasonStats | null,
    oppStats: null as SeasonStats | null,
  };
}

function parsePlayerStatNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;

  const pair = parseMadeAttPair(s);
  if (pair) {
    // CFBD often encodes rushing/receiving/passing as attempts-yards.
    return Math.max(pair[0], pair[1]);
  }

  const n = Number(s);
  if (Number.isFinite(n)) return n;

  const nums = s.match(/-?\d+(\.\d+)?/g);
  if (!nums || nums.length === 0) return null;
  const vals = nums.map((x) => Number(x)).filter((x) => Number.isFinite(x));
  if (vals.length === 0) return null;
  return Math.max(...vals);
}

function normalizePlayerName(name: string) {
  return String(name || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function parseCompletedGameIds(rows: unknown[]) {
  const out: Array<{ id: number; ts: number }> = [];
  for (const row of rows as Record<string, unknown>[]) {
    const idRaw = row.id ?? row.gameId ?? row.game_id;
    const id =
      typeof idRaw === "number"
        ? idRaw
        : Number.isFinite(Number(idRaw))
          ? Number(idRaw)
          : null;
    if (id == null) continue;

    const hp = safeNum(row.homePoints ?? row.home_points);
    const ap = safeNum(row.awayPoints ?? row.away_points);
    if (hp == null || ap == null) continue; // skip future/unplayed

    const startDate = String(row.startDate ?? row.start_date ?? "");
    const dateScore = startDate ? Date.parse(startDate) : Number.NaN;
    out.push({ id, ts: Number.isFinite(dateScore) ? dateScore : 0 });
  }
  out.sort((a, b) => a.ts - b.ts);
  return out.map((x) => x.id);
}

function buildGamePlayerUsage(
  rows: unknown[],
  teamSlug: string,
  validGameIds: Set<number>,
) {
  const teamKey = norm(slugToCfbdTeamName(teamSlug));
  const perGame = new Map<number, Map<string, number>>();

  for (const row of rows as Record<string, unknown>[]) {
    const idRaw = row.id;
    const gameId =
      typeof idRaw === "number"
        ? idRaw
        : Number.isFinite(Number(idRaw))
          ? Number(idRaw)
          : null;
    if (gameId == null || !validGameIds.has(gameId)) continue;

    const teams = Array.isArray(row.teams) ? (row.teams as Record<string, unknown>[]) : [];
    const teamRow =
      teams.find((t) => {
        const tn = norm(String(t.team ?? t.school ?? ""));
        return tn === teamKey || tn.includes(teamKey) || teamKey.includes(tn);
      }) ?? null;
    if (!teamRow) continue;

    const categories = Array.isArray(teamRow.categories)
      ? (teamRow.categories as Record<string, unknown>[])
      : [];
    const gameMap = perGame.get(gameId) ?? new Map<string, number>();

    for (const category of categories) {
      const catName = String(category.name ?? "").toLowerCase();
      if (!catName.includes("passing") && !catName.includes("rushing") && !catName.includes("receiving")) {
        continue;
      }

      const types = Array.isArray(category.types)
        ? (category.types as Record<string, unknown>[])
        : [];
      for (const typ of types) {
        const athletes = Array.isArray(typ.athletes)
          ? (typ.athletes as Record<string, unknown>[])
          : [];
        for (const a of athletes) {
          const name = normalizePlayerName(String(a.name ?? ""));
          if (!name) continue;
          const statNum = parsePlayerStatNumber(a.stat);
          if (statNum == null) continue;
          gameMap.set(name, (gameMap.get(name) ?? 0) + statNum);
        }
      }
    }

    perGame.set(gameId, gameMap);
  }

  return perGame;
}

async function computeAvailabilityRisk(teamSlug: string, year: number): Promise<AvailabilityRisk> {
  try {
    const [games, playerRows] = await Promise.all([
      fetchGamesByTeam(teamSlug, year),
      fetchGamesPlayers(teamSlug, year),
    ]);

    const completedIds = parseCompletedGameIds(games);
    if (completedIds.length < 5) return { risk: 0, flags: [] };

    const idSet = new Set(completedIds);
    const perGameUsage = buildGamePlayerUsage(playerRows, teamSlug, idSet);
    if (perGameUsage.size < 3) return { risk: 0, flags: [] };

    const orderedIds = completedIds.filter((id) => perGameUsage.has(id));
    if (orderedIds.length < 4) return { risk: 0, flags: [] };

    const recentIds = orderedIds.slice(-2);
    const baselineIds = orderedIds.slice(Math.max(0, orderedIds.length - 8), -2);
    if (baselineIds.length < 2) return { risk: 0, flags: [] };

    const seasonTotals = new Map<string, number>();
    for (const id of orderedIds) {
      const gm = perGameUsage.get(id);
      if (!gm) continue;
      for (const [name, val] of gm.entries()) {
        seasonTotals.set(name, (seasonTotals.get(name) ?? 0) + val);
      }
    }

    const topPlayers = [...seasonTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);
    if (topPlayers.length === 0) return { risk: 0, flags: [] };

    const playerRiskParts: number[] = [];
    const flags: string[] = [];
    for (const player of topPlayers) {
      const baselineVals = baselineIds.map((id) => perGameUsage.get(id)?.get(player) ?? 0);
      const recentVals = recentIds.map((id) => perGameUsage.get(id)?.get(player) ?? 0);
      const baselineAvg = baselineVals.reduce((a, b) => a + b, 0) / baselineVals.length;
      const recentAvg = recentVals.reduce((a, b) => a + b, 0) / recentVals.length;
      if (baselineAvg < 20) continue;
      const drop = clamp((baselineAvg - recentAvg) / baselineAvg, 0, 1);
      if (drop >= 0.55) {
        flags.push(
          `${player}: recent usage down ${(drop * 100).toFixed(0)}% (${recentAvg.toFixed(1)} vs ${baselineAvg.toFixed(1)})`,
        );
      }
      playerRiskParts.push(drop * 100);
    }

    if (playerRiskParts.length === 0) return { risk: 0, flags: [] };
    const risk = round1(playerRiskParts.reduce((a, b) => a + b, 0) / playerRiskParts.length);
    return { risk: clamp(risk, 0, 100), flags: flags.slice(0, 3) };
  } catch {
    return { risk: 0, flags: [] };
  }
}

function scoreMatchup(
  teamStats: SeasonStats,
  oppStats: SeasonStats,
  phase: TGEMPhase,
) {
  let score = 0;
  let usedFactors = 0;

  const safeDiff = (a: number | null, b: number | null) =>
    a != null && b != null ? a - b : null;
  const addFactor = (diff: number | null, weight: number) => {
    if (diff == null) return;
    score += diff * weight;
    usedFactors += 1;
  };

  const ppgDiff = safeDiff(teamStats.pointsPerGame, oppStats.pointsPerGame);
  const defPpgEdge = safeDiff(
    oppStats.pointsAllowedPerGame,
    teamStats.pointsAllowedPerGame,
  );
  const ypgDiff = safeDiff(teamStats.yardsPerGame, oppStats.yardsPerGame);
  const defYpgEdge = safeDiff(
    oppStats.yardsAllowedPerGame,
    teamStats.yardsAllowedPerGame,
  );
  const thirdDiff = safeDiff(teamStats.thirdDownPct, oppStats.thirdDownPct);
  const rzDiff = safeDiff(teamStats.redZonePct, oppStats.redZonePct);
  const toDiff = safeDiff(
    teamStats.turnoverMarginPerGame,
    oppStats.turnoverMarginPerGame,
  );

  const w = getPhaseScoringWeights(phase);
  addFactor(ppgDiff, w.ppg);
  addFactor(defPpgEdge, w.defPpg);
  addFactor(ypgDiff, w.ypg);
  addFactor(defYpgEdge, w.defYpg);
  addFactor(thirdDiff, w.third);
  addFactor(rzDiff, w.redZone);
  addFactor(toDiff, w.turnovers);

  return {
    score,
    usedFactors,
    totalFactors: 7,
    phaseModules: w.modules,
    diffs: {
      ppgDiff,
      defPpgEdge,
      ypgDiff,
      defYpgEdge,
      thirdDiff,
      rzDiff,
      toDiff,
    },
  };
}

function normEdge(v: number, scale: number) {
  if (!Number.isFinite(v) || !Number.isFinite(scale) || scale <= 0) return 0;
  return clamp(v / scale, -1, 1);
}

function capNonStructuralFactor(v: number) {
  // Hard guard rail: no single non-structural factor can exceed 15 points.
  return clamp(v, -15, 15);
}

function buildPostseasonScore(args: {
  diffs: {
    ppgDiff: number | null;
    defPpgEdge: number | null;
    ypgDiff: number | null;
    defYpgEdge: number | null;
    thirdDiff: number | null;
    rzDiff: number | null;
    toDiff: number | null;
  };
  teamStats: SeasonStats;
  oppStats: SeasonStats;
  ratingDelta: number;
  venue?: VenueHint;
}): PostseasonBucketScore {
  const { diffs, teamStats, oppStats, ratingDelta, venue } = args;

  const penaltyDiff =
    oppStats.penaltyYardsPerGame != null && teamStats.penaltyYardsPerGame != null
      ? oppStats.penaltyYardsPerGame - teamStats.penaltyYardsPerGame
      : null;
  const penaltyEdge = penaltyDiff != null ? normEdge(penaltyDiff, 40) : 0;
  const venueEdge = venue === "home" ? 0.25 : venue === "away" ? -0.25 : 0;
  const combineAvailable = (parts: Array<{ v: number | null; w: number }>) => {
    const valid = parts.filter((p) => p.v != null) as Array<{
      v: number;
      w: number;
    }>;
    if (!valid.length) return 0;
    const sumW = valid.reduce((a, b) => a + b.w, 0);
    return clamp(valid.reduce((a, b) => a + b.v * b.w, 0) / sumW, -1, 1);
  };

  // 40% - Structural Team Quality (allowed to exceed 15 points).
  const structuralRaw = combineAvailable([
    { v: normEdge(ratingDelta, 22), w: 0.5 },
    {
      v: diffs.defPpgEdge != null ? normEdge(diffs.defPpgEdge, 14) : null,
      w: 0.2,
    },
    { v: diffs.ppgDiff != null ? normEdge(diffs.ppgDiff, 14) : null, w: 0.2 },
    {
      v: diffs.defYpgEdge != null ? normEdge(diffs.defYpgEdge, 200) : null,
      w: 0.1,
    },
  ]);
  const structural = structuralRaw * 40;

  // 30% - Performance Reality.
  const performanceRaw = combineAvailable([
    { v: diffs.thirdDiff != null ? normEdge(diffs.thirdDiff, 20) : null, w: 0.35 },
    { v: diffs.rzDiff != null ? normEdge(diffs.rzDiff, 20) : null, w: 0.35 },
    { v: diffs.toDiff != null ? normEdge(diffs.toDiff, 2) : null, w: 0.3 },
  ]);
  const performance = capNonStructuralFactor(performanceRaw * 30);

  // 20% - Context & Environment.
  const contextRaw = clamp(venueEdge * 0.6 + penaltyEdge * 0.4, -1, 1);
  const context = capNonStructuralFactor(contextRaw * 20);

  // 10% - Volatility and Risk.
  const volatilityRaw = combineAvailable([
    { v: diffs.toDiff != null ? normEdge(diffs.toDiff, 2) : null, w: 0.6 },
    { v: penaltyEdge, w: 0.4 },
  ]);
  const volatility = capNonStructuralFactor(volatilityRaw * 10);

  // Hard caps
  const momentum = clamp(0, -3, 3); // cap at 3%
  const qbImpact = clamp(0, -10, 10); // cap at 10%

  const final = structural + performance + context + volatility + momentum + qbImpact;

  return {
    structural: round1(structural),
    performance: round1(performance),
    context: round1(context),
    volatility: round1(volatility),
    momentum: round1(momentum),
    qbImpact: round1(qbImpact),
    final: round1(final),
  };
}

function computeModuleCoverage(phaseModules: PhaseModuleWeights) {
  const directModules: Array<[keyof PhaseModuleWeights, string]> = [
    ["efficiency", "Efficiency"],
    ["turnoverVolatility", "Turnover & Volatility"],
  ];
  const proxyModules: Array<[keyof PhaseModuleWeights, string]> = [
    ["rsi", "Roster Strength Index (proxy via team rating)"],
    ["qbImpact", "QB Impact (proxy via team rating)"],
    ["injuryDepth", "Injury & Depth (proxy via availability risk)"],
  ];
  const missingModules: Array<[keyof PhaseModuleWeights, string]> = [
    ["scheduleDifficulty", "Schedule Difficulty (SDI)"],
    ["coachingStability", "Coaching & Stability"],
    ["psychologyMotivation", "Psychological & Motivation"],
    ["modifier", "Rankings Soft Modifier"],
  ];

  const sum = (
    rows: Array<[keyof PhaseModuleWeights, string]>,
  ) => rows.reduce((acc, [k]) => acc + (phaseModules[k] ?? 0), 0);

  const directWeight = sum(directModules);
  const proxyWeight = sum(proxyModules);
  const missingWeight = sum(missingModules);

  return {
    directWeight,
    proxyWeight,
    missingWeight,
    missingModules: missingModules
      .filter(([k]) => (phaseModules[k] ?? 0) > 0)
      .map(([, label]) => label),
    proxyModules: proxyModules
      .filter(([k]) => (phaseModules[k] ?? 0) > 0)
      .map(([, label]) => label),
  };
}

function classifyTgemPhase(input: {
  phase?: TGEMPhaseInput;
  seasonType?: string;
  week?: number;
}): TGEMPhase {
  if (input.phase === "regular" || input.phase === "championship") {
    return input.phase;
  }
  if (input.phase === "bowl" || input.phase === "cfp") {
    return input.phase;
  }
  const st = String(input.seasonType ?? "").toLowerCase();
  if (input.phase === "postseason" && !st) {
    return "bowl";
  }
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
  if (typeof input.week === "number" && input.week >= 14) return "championship";
  return "regular";
}

function computeTeamRating(stats: SeasonStats) {
  let score = 50;

  score += (stats.pointsPerGame ?? 28) * 0.65;
  score += (45 - (stats.pointsAllowedPerGame ?? 28)) * 0.7;

  score += (stats.yardsPerGame ?? 380) * 0.035;
  score += (500 - (stats.yardsAllowedPerGame ?? 380)) * 0.03;

  score += (stats.thirdDownPct ?? 40) * 0.12;
  score += (stats.redZonePct ?? 84) * 0.08;

  score += (stats.turnoverMarginPerGame ?? 0) * 9;
  score -= (stats.penaltyYardsPerGame ?? 55) * 0.07;

  return clamp(Math.round(score), 40, 99);
}

function fallbackLean(
  team: string,
  opponent: string,
  venue?: VenueHint,
): "HOME" | "AWAY" {
  if (venue === "home") return "HOME";
  if (venue === "away") return "AWAY";
  const seed = `${team}|${opponent}`;
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h % 2 === 0 ? "HOME" : "AWAY";
}

function formatDiff(n: number | null) {
  return n == null ? "N/A" : n.toFixed(1);
}

// ✅ Export used by your API route
export async function analyzeMatchupSeasonOnly(
  input: AnalyzeMatchupInput,
): Promise<AnalyzeMatchupOutput> {
  const { team, opponent, year, venue } = input;
  const lightweight = input.lightweight === true;
  const phase = classifyTgemPhase(input);

  if (!Number.isFinite(year)) {
    throw new Error(`Invalid year passed into TGEM: ${String(year)}`);
  }

  const reasons: string[] = [];

  // venue factor (neutral=0)
  const venueFactor = venue === "home" ? 0.1 : venue === "away" ? -0.1 : 0;

  let yearUsed = year;
  let teamStats: SeasonStats | null = null;
  let oppStats: SeasonStats | null = null;

  try {
    const out = await getAlignedSeasonStats(team, opponent, year);
    yearUsed = out.yearUsed;
    teamStats = out.teamStats;
    oppStats = out.oppStats;
  } catch (e: unknown) {
    reasons.push(
      `Season stats: error (${e instanceof Error ? e.message : "unknown"})`,
    );
  }

  if (!teamStats || !oppStats) {
    if (!teamStats) {
      reasons.push(`Team season stats unavailable (team=${team}, year=${yearUsed})`);
    }
    if (!oppStats) {
      reasons.push(
        `Opponent season stats unavailable (opponent=${opponent}, year=${yearUsed})`,
      );
    }
    reasons.push(
      "Season stats alignment failed for both teams in the same season year. Mixed-season comparison is disabled.",
    );

    // ✅ IMPORTANT: do NOT assume HOME if venue is missing
    reasons.push(
      `Venue factor: team is ${venue ? venue.toUpperCase() : "NEUTRAL"}`,
    );

    return {
      meta: { team, opponent },
      lean: fallbackLean(team, opponent, venue),
      confidence: 50,
      reasons,
      factors: { seasonStatsEdge: 0, venue: venueFactor },
      statsSnapshot: {
        team: teamStats,
        opponent: oppStats,
        yearUsed: { team: yearUsed, opponent: yearUsed },
      },
    };
  }

  reasons.push(`Season stats loaded (aligned yearUsed=${yearUsed} for both teams)`);

  const { score, diffs, usedFactors, totalFactors } = scoreMatchup(
    teamStats,
    oppStats,
    phase,
  );
  const w = getPhaseScoringWeights(phase);
  const phaseModules = PHASE_MODULE_WEIGHTS[phase];
  const moduleCoverage = computeModuleCoverage(phaseModules);
  const teamRating = computeTeamRating(teamStats);
  const opponentRating = computeTeamRating(oppStats);
  const ratingDelta = teamRating - opponentRating;
  const [teamAvailability, oppAvailability] = lightweight
    ? [
        { risk: 0, flags: [] as string[] },
        { risk: 0, flags: [] as string[] },
      ]
    : await Promise.all([
        computeAvailabilityRisk(team, yearUsed),
        computeAvailabilityRisk(opponent, yearUsed),
      ]);
  const combinedAvailabilityRisk = Math.max(
    teamAvailability.risk,
    oppAvailability.risk,
  );

  const venueBump = venue === "home" ? 4 : venue === "away" ? -4 : 0;
  const eliminationBuckets =
    phase === "bowl" || phase === "cfp"
      ? buildPostseasonScore({
          diffs,
          teamStats,
          oppStats,
          ratingDelta,
          venue,
        })
      : null;
  const finalScore = eliminationBuckets ? eliminationBuckets.final : score + venueBump;

  const lean: "HOME" | "AWAY" = finalScore >= 0 ? "HOME" : "AWAY";
  const sampleFloor = Math.min(teamStats.games ?? 0, oppStats.games ?? 0);
  const coverage = totalFactors > 0 ? usedFactors / totalFactors : 0;
  const yearPenalty = yearUsed === year ? 0 : 5;
  const samplePenalty =
    sampleFloor >= 10 ? 0 : sampleFloor >= 7 ? 3 : sampleFloor >= 4 ? 7 : 10;
  const coveragePenalty = Math.round((1 - coverage) * 14);
  const phaseBase =
    phase === "cfp" ? 58 : phase === "championship" ? 56 : phase === "bowl" ? 52 : 54;
  const volatilityPenalty = phase === "bowl" ? 4 : 0;
  const availabilityPenalty = Math.round(
    (combinedAvailabilityRisk / 100) *
      (phaseModules.injuryDepth >= 18 ? 12 : phaseModules.injuryDepth >= 12 ? 8 : 5),
  );
  const moduleGapPenalty = Math.round((moduleCoverage.missingWeight / 100) * 10);
  const confidence = clamp(
    Math.round(
      phaseBase +
        Math.abs(finalScore) * w.ratingScale -
        yearPenalty -
        samplePenalty -
        coveragePenalty -
        volatilityPenalty -
        availabilityPenalty -
        moduleGapPenalty,
    ),
    50,
    phase === "cfp" ? 95 : 92,
  );

  reasons.push(`Offense PPG diff: ${formatDiff(diffs.ppgDiff)}`);
  reasons.push(`Defense PPG allowed edge: ${formatDiff(diffs.defPpgEdge)}`);
  reasons.push(`Yards per game diff: ${formatDiff(diffs.ypgDiff)}`);
  reasons.push(`Yards allowed edge: ${formatDiff(diffs.defYpgEdge)}`);
  reasons.push(`3rd down diff: ${formatDiff(diffs.thirdDiff)} pts`);
  reasons.push(`Red zone diff: ${formatDiff(diffs.rzDiff)} pts`);
  const penaltyEdgeDiff =
    oppStats.penaltyYardsPerGame != null && teamStats.penaltyYardsPerGame != null
      ? oppStats.penaltyYardsPerGame - teamStats.penaltyYardsPerGame
      : null;
  reasons.push(`Penalty yds/game edge: ${formatDiff(penaltyEdgeDiff)}`);
  reasons.push(`Turnover margin diff: ${formatDiff(diffs.toDiff)}`);
  reasons.push(`TGEM phase profile: ${phase.toUpperCase()}`);
  reasons.push(
    `Phase weights (v11 table): RSI ${phaseModules.rsi}%, QB ${phaseModules.qbImpact}%, SDI ${phaseModules.scheduleDifficulty}%, Injury ${phaseModules.injuryDepth}%, Efficiency ${phaseModules.efficiency}%, Turnover ${phaseModules.turnoverVolatility}%, Coaching ${phaseModules.coachingStability}%, Psychology ${phaseModules.psychologyMotivation}%${phaseModules.modifier ? `, Modifier ${phaseModules.modifier}%` : ""}`,
  );
  reasons.push(
    `Module coverage: direct ${moduleCoverage.directWeight}%, proxy ${moduleCoverage.proxyWeight}%, missing ${moduleCoverage.missingWeight}% (confidence penalty ${moduleGapPenalty})`,
  );
  if (moduleCoverage.missingModules.length > 0) {
    reasons.push(`Missing modules: ${moduleCoverage.missingModules.join(", ")}`);
  }
  if (moduleCoverage.proxyModules.length > 0) {
    reasons.push(`Proxy modules: ${moduleCoverage.proxyModules.join(", ")}`);
  }
  reasons.push(
    `TGEM rating: ${team} ${teamRating} vs ${opponent} ${opponentRating} (delta ${ratingDelta >= 0 ? "+" : ""}${ratingDelta})`,
  );
  if (lightweight) {
    reasons.push("Availability risk skipped for homepage prewarm mode to minimize API usage.");
  } else {
    reasons.push(
      `Availability risk (proxy): ${team} ${teamAvailability.risk.toFixed(1)} / ${opponent} ${oppAvailability.risk.toFixed(1)} (confidence penalty ${availabilityPenalty})`,
    );
    for (const f of teamAvailability.flags) {
      reasons.push(`Availability flag ${team}: ${f}`);
    }
    for (const f of oppAvailability.flags) {
      reasons.push(`Availability flag ${opponent}: ${f}`);
    }
  }
  reasons.push(`Feature coverage: ${usedFactors}/${totalFactors} factors used`);
  if (eliminationBuckets) {
    reasons.push(
      `${phase.toUpperCase()} weights -> Structural 40%, Performance 30%, Context 20%, Volatility 10%`,
    );
    reasons.push(
      `${phase.toUpperCase()} bucket scores: Structural ${eliminationBuckets.structural}, Performance ${eliminationBuckets.performance}, Context ${eliminationBuckets.context}, Volatility ${eliminationBuckets.volatility}`,
    );
    reasons.push(
      `Hard guard rails applied: non-structural factor <= 15, Momentum cap 3, QB impact cap 10`,
    );
  }
  reasons.push(`Model edge score: ${finalScore.toFixed(2)}`);
  if (venue) reasons.push(`Venue: ${venue.toUpperCase()}`);

  const seasonStatsEdge = clamp(finalScore / 20, -1, 1);

  return {
    meta: { team, opponent },
    lean,
    confidence,
    ratings: {
      team: teamRating,
      opponent: opponentRating,
      delta: ratingDelta,
    },
    reasons,
    factors: {
      seasonStatsEdge,
      venue: venueFactor,
      availabilityRisk: combinedAvailabilityRisk,
    },
    statsSnapshot: {
      team: teamStats,
      opponent: oppStats,
      yearUsed: { team: yearUsed, opponent: yearUsed },
      diffs,
      score: {
        base: score,
        venueBump,
        final: finalScore,
        postseasonBuckets: eliminationBuckets ?? undefined,
        availabilityRisk: {
          team: teamAvailability,
          opponent: oppAvailability,
          combined: combinedAvailabilityRisk,
        },
      },
    },
    modelMeta: {
      phase,
      phaseModules,
      moduleCoverage,
    },
  };
}
