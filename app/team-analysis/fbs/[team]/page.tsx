"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import AdSlot from "@/components/ui/AdSlot";
import { LeadersBlock } from "@/components/team/LeadersBlock";
import { FBS_TEAMS } from "@/data/fbsTeams";
import type { TeamMeta } from "@/data/teamMeta";
import { getTeamMeta } from "@/data/teamMeta";
import type { LeaderEntry } from "@/lib/cfbd/leaders";
import {
  allowPriorSeasonFallback as shouldAllowPriorSeasonFallback,
  getScheduleSeasonYear,
  getStatsSeasonYear,
} from "@/lib/cfbd/season";
import { resolveTeamColorProfile } from "@/lib/teamColors/colors";

type ScheduleGame = {
  id?: number;
  season?: number;
  week?: number | null;
  seasonType?: string | null;
  startDate?: string | null;

  neutralSite?: boolean | null;
  conferenceGame?: boolean | null;
  completed?: boolean | null;

  venue?: string | null;

  homeTeam?: string | null;
  awayTeam?: string | null;

  homePoints?: number | null;
  awayPoints?: number | null;
};

type SeasonStats = {
  games?: number | null;

  // Offense
  pointsPerGame?: number | null;
  yardsPerGame?: number | null;
  passYardsPerGame?: number | null;
  rushYardsPerGame?: number | null;

  // Defense
  pointsAllowedPerGame?: number | null;
  yardsAllowedPerGame?: number | null;

  // Situational
  thirdDownPct?: number | null; // 0-100
  redZonePct?: number | null; // 0-100

  // Discipline / ball security
  penaltiesPerGame?: number | null;
  penaltyYardsPerGame?: number | null;
  turnoverMarginPerGame?: number | null;
};

type SeasonTotals = Record<string, number>;
type TGEMPhase = "regular" | "championship" | "postseason";

function classifySubdivision(conference: string) {
  const powerConfs = new Set(["SEC", "Big Ten", "Big 12", "ACC"]);
  if (powerConfs.has(conference)) return "FBS - Power Conference";
  if (conference === "Independents") return "FBS - Independent";
  if (conference === "Unknown Conference") return "Unknown";
  return "FBS - Group of Five";
}

function fmt(n: number | null | undefined) {
  if (n === null || n === undefined) return "N/A";
  try {
    return n.toLocaleString();
  } catch {
    return String(n);
  }
}

function fmtBool(b: boolean | null | undefined) {
  if (b === null || b === undefined) return "N/A";
  return b ? "Yes" : "No";
}

function safeStr(s: string | null | undefined) {
  return s && String(s).trim().length ? String(s) : "N/A";
}

function parseDate(s: string | null | undefined) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateTime(startDate: string | null | undefined) {
  const d = parseDate(startDate);
  if (!d) return "TBD";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtNum(n: number | null | undefined, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return "N/A";
  return n.toFixed(digits);
}

function fmtPct(n: number | null | undefined, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return "N/A";
  return `${n.toFixed(digits)}%`;
}

function prettyStatName(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

function normalizeHexColor(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = String(input).trim();
  if (!raw) return null;
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  const isValid = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(withHash);
  return isValid ? withHash : null;
}

function contrastTextColor(bgHex: string | null | undefined) {
  const c = normalizeHexColor(bgHex);
  if (!c) return "#111";
  const hex = c.slice(1);
  const full = hex.length === 3 ? hex.split("").map((x) => x + x).join("") : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? "#111" : "#fff";
}

function buildTeamBadgeText(teamName: string, abbreviation?: string | null) {
  const teamKey = teamName
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "")
    .trim();
  const forcedByTeam: Record<string, string> = {
    florida: "FLA",
    fiu: "FIU",
    floridainternational: "FIU",
    floridaatlantic: "FAU",
    arizonastate: "ASU",
    kansas: "KU",
    arkansas: "ARK",
  };
  if (forcedByTeam[teamKey]) return forcedByTeam[teamKey];

  const cleaned = String(abbreviation ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (cleaned.length >= 2 && cleaned.length <= 4) return cleaned;
  if (cleaned.length > 4) return cleaned.slice(0, 4);

  const words = teamName
    .split(" ")
    .map((w) => w.trim())
    .filter(Boolean);
  if (words.length >= 2) {
    return words
      .slice(0, 3)
      .map((w) => w[0]!.toUpperCase())
      .join("");
  }
  if (words.length === 1) return words[0]!.slice(0, 3).toUpperCase();
  return "N/A";
}

function ColorSwatch({
  value,
  label,
}: {
  value: string | null | undefined;
  label: string;
}) {
  const color = normalizeHexColor(value);
  if (!color) return null;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        marginRight: 10,
      }}
      title={`${label} ${color.toUpperCase()}`}
      aria-label={`${label} color swatch`}
    >
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 5,
          background: color,
          border: "1px solid #ccc",
          display: "inline-block",
        }}
      />
    </span>
  );
}

function getFourthDownPct(totals: SeasonTotals | null): number | null {
  if (!totals) return null;
  const conv = totals.fourthDownConversions;
  const att = totals.fourthDowns;
  if (typeof conv !== "number" || typeof att !== "number" || att <= 0) {
    return null;
  }
  return (conv / att) * 100;
}

function clampScore(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function norm01(
  value: number | null | undefined,
  min: number,
  max: number,
  invert = false,
) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  if (max <= min) return null;
  const raw = (value - min) / (max - min);
  const bounded = Math.max(0, Math.min(1, raw));
  return invert ? 1 - bounded : bounded;
}

function getTotalNum(totals: SeasonTotals | null, key: string) {
  if (!totals) return null;
  const v = totals[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

const TEAM_PHASE_PROFILES: Record<
  TGEMPhase,
  {
    overallMix: {
      offense: number;
      defense: number;
      discipline: number;
      specialTeams: number;
    };
    confidenceBoost: number;
  }
> = {
  regular: {
    overallMix: { offense: 0.34, defense: 0.3, discipline: 0.2, specialTeams: 0.16 },
    confidenceBoost: 0,
  },
  championship: {
    overallMix: { offense: 0.31, defense: 0.35, discipline: 0.22, specialTeams: 0.12 },
    confidenceBoost: 3,
  },
  postseason: {
    overallMix: { offense: 0.28, defense: 0.38, discipline: 0.24, specialTeams: 0.1 },
    confidenceBoost: 6,
  },
};

function classifyTeamTgemPhase(schedule: ScheduleGame[]): TGEMPhase {
  if (!Array.isArray(schedule) || schedule.length === 0) return "regular";

  const now = Date.now();
  const byDateAsc = (a: ScheduleGame, b: ScheduleGame) => {
    const da = parseDate(a.startDate)?.getTime() ?? Number.POSITIVE_INFINITY;
    const db = parseDate(b.startDate)?.getTime() ?? Number.POSITIVE_INFINITY;
    return da - db;
  };

  const completedOrPast = schedule
    .filter((g) => {
      const ts = parseDate(g.startDate)?.getTime();
      return g.completed === true || (typeof ts === "number" && ts <= now);
    })
    .sort(byDateAsc);

  const basisGame =
    completedOrPast[completedOrPast.length - 1] ??
    [...schedule].sort(byDateAsc)[0] ??
    null;

  if (!basisGame) return "regular";

  const seasonType = String(basisGame.seasonType ?? "").toLowerCase();
  if (seasonType.includes("post")) return "postseason";
  if (typeof basisGame.week === "number" && basisGame.week >= 14) {
    return "championship";
  }
  return "regular";
}

function buildTgemTeamAnalysis(
  stats: SeasonStats | null,
  totals: SeasonTotals | null,
  fourthDownPct: number | null,
  phase: TGEMPhase,
) {
  if (!stats) return null;
  const profile = TEAM_PHASE_PROFILES[phase];

  const offPieces = [
    { v: norm01(stats.pointsPerGame, 10, 50), w: 0.38 },
    { v: norm01(stats.yardsPerGame, 250, 550), w: 0.28 },
    { v: norm01(stats.passYardsPerGame, 120, 380), w: 0.12 },
    { v: norm01(stats.rushYardsPerGame, 80, 280), w: 0.12 },
    { v: norm01(stats.thirdDownPct, 25, 60), w: 0.1 },
  ];

  const defPieces = [
    { v: norm01(stats.pointsAllowedPerGame, 10, 45, true), w: 0.55 },
    { v: norm01(stats.yardsAllowedPerGame, 250, 520, true), w: 0.45 },
  ];

  const discPieces = [
    { v: norm01(stats.turnoverMarginPerGame, -2, 2), w: 0.55 },
    { v: norm01(stats.penaltiesPerGame, 3, 9, true), w: 0.2 },
    { v: norm01(stats.penaltyYardsPerGame, 25, 95, true), w: 0.25 },
  ];

  const games = stats.games ?? 0;
  const kr = getTotalNum(totals, "kickReturnYards");
  const pr = getTotalNum(totals, "puntReturnYards");
  const kro = getTotalNum(totals, "kickReturnYardsOpponent");
  const pro = getTotalNum(totals, "puntReturnYardsOpponent");
  const krTd = getTotalNum(totals, "kickReturnTDs");
  const prTd = getTotalNum(totals, "puntReturnTDs");

  const netReturnYpg =
    games > 0 && kr != null && pr != null && kro != null && pro != null
      ? (kr + pr - kro - pro) / games
      : null;

  const stPieces = [
    { v: norm01(netReturnYpg, -40, 40), w: 0.65 },
    { v: norm01((krTd ?? 0) + (prTd ?? 0), 0, 5), w: 0.35 },
  ];

  const scoreFromPieces = (pieces: { v: number | null; w: number }[]) => {
    const valid = pieces.filter((p) => p.v != null);
    if (!valid.length) return null;
    const sumW = valid.reduce((a, b) => a + b.w, 0);
    const weighted = valid.reduce((a, b) => a + (b.v ?? 0) * b.w, 0);
    return clampScore((weighted / sumW) * 100);
  };

  const offense = scoreFromPieces(offPieces);
  const defense = scoreFromPieces(defPieces);
  const discipline = scoreFromPieces(discPieces);
  const specialTeams = scoreFromPieces(stPieces);

  const overallPieces = [
    { v: offense, w: profile.overallMix.offense },
    { v: defense, w: profile.overallMix.defense },
    { v: discipline, w: profile.overallMix.discipline },
    { v: specialTeams, w: profile.overallMix.specialTeams },
  ].filter((p) => typeof p.v === "number") as { v: number; w: number }[];

  const overall =
    overallPieces.length > 0
      ? clampScore(
          overallPieces.reduce((a, b) => a + b.v * b.w, 0) /
            overallPieces.reduce((a, b) => a + b.w, 0),
        )
      : null;

  const dataCoverage = [
    stats.pointsPerGame,
    stats.yardsPerGame,
    stats.pointsAllowedPerGame,
    stats.yardsAllowedPerGame,
    stats.thirdDownPct,
    fourthDownPct,
    stats.turnoverMarginPerGame,
    stats.penaltyYardsPerGame,
    netReturnYpg,
  ].filter((x) => x != null).length;

  const confidence = clampScore(
    Math.min(
      97,
      35 +
        Math.min(16, Math.max(0, games)) * 2.8 +
        dataCoverage * 3 +
        profile.confidenceBoost,
    ),
  );

  const notes: string[] = [];
  if (stats.pointsPerGame != null) notes.push(`PPG: ${stats.pointsPerGame.toFixed(1)}`);
  if (stats.pointsAllowedPerGame != null) {
    notes.push(`PPG Allowed: ${stats.pointsAllowedPerGame.toFixed(1)}`);
  }
  if (stats.turnoverMarginPerGame != null) {
    notes.push(`Turnover Margin/G: ${stats.turnoverMarginPerGame.toFixed(1)}`);
  }
  if (stats.thirdDownPct != null) notes.push(`3rd Down: ${stats.thirdDownPct.toFixed(1)}%`);
  if (fourthDownPct != null) notes.push(`4th Down: ${fourthDownPct.toFixed(1)}%`);
  notes.push(`Phase Profile: ${phase.toUpperCase()}`);

  return { overall, confidence, offense, defense, discipline, specialTeams, notes };
}

const TGEM_NA_TEXT = "Not Available";

function fmtScore100(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return TGEM_NA_TEXT;
  return `${value} / 100`;
}

function getStabilityLabel(confidence: number | null | undefined) {
  if (confidence == null || Number.isNaN(confidence)) return TGEM_NA_TEXT;
  if (confidence >= 80) return "High";
  if (confidence >= 60) return "Medium";
  return "Low";
}

function buildCoachNarrative(
  teamName: string,
  phase: TGEMPhase,
  analysis: ReturnType<typeof buildTgemTeamAnalysis> | null,
  stats: SeasonStats | null,
  fourthDownPct: number | null,
) {
  const unitScores = [
    { label: "Offense", value: analysis?.offense ?? null },
    { label: "Defense", value: analysis?.defense ?? null },
    { label: "Discipline", value: analysis?.discipline ?? null },
    { label: "Special Teams", value: analysis?.specialTeams ?? null },
  ];
  const scoredUnits = unitScores.filter((u) => u.value != null) as {
    label: string;
    value: number;
  }[];
  const strengths = [...scoredUnits].sort((a, b) => b.value - a.value).slice(0, 2);
  const weakness = [...scoredUnits].sort((a, b) => a.value - b.value)[0] ?? null;

  const missingLabels = [
    stats?.pointsPerGame == null ? "points per game" : null,
    stats?.pointsAllowedPerGame == null ? "points allowed per game" : null,
    stats?.thirdDownPct == null ? "third down percentage" : null,
    fourthDownPct == null ? "fourth down percentage" : null,
    stats?.turnoverMarginPerGame == null ? "turnover margin per game" : null,
    stats?.penaltyYardsPerGame == null ? "penalty yards per game" : null,
  ].filter(Boolean) as string[];

  const read: string[] = [];
  if (strengths.length > 0) {
    const first = strengths[0];
    const second = strengths[1];
    read.push(
      `${teamName}'s identity right now is ${first.label.toLowerCase()}${second ? ` and ${second.label.toLowerCase()}` : ""} - they make opponents earn everything.`,
    );
    read.push(
      `${first.label} is the engine of this team, winning down-to-down and controlling game flow. ${second ? `${second.label} supports drive stability and keeps the plan clean.` : "Execution has been consistent in key moments."}`,
    );
  } else {
    read.push(
      `${teamName} does not have enough complete team signals for a full identity read yet.`,
    );
  }
  if (weakness) {
    read.push(
      `The concern is ${weakness.label.toLowerCase()} - that is where momentum can swing if execution slips.`,
    );
  }
  read.push(
    `With the ${phase[0].toUpperCase()}${phase.slice(1)} phase lens applied, TGEM is prioritizing consistency and execution over raw volume stats.`,
  );
  if (missingLabels.length > 0) {
    read.push(
      `Missing data: ${missingLabels.join(
        ", ",
      )}. TGEM is using available unit grades and phase weighting as fallback.`,
    );
  }

  const topUnit = strengths[0] ?? null;
  const secondUnit = strengths[1] ?? null;
  const stabilityLabel = getStabilityLabel(analysis?.confidence ?? null);
  const keyReasons: string[] = [];
  if (topUnit) keyReasons.push(`${topUnit.label} dominance (${topUnit.value} grade)`);
  if (secondUnit) keyReasons.push(`Strong ${secondUnit.label.toLowerCase()} support profile`);
  keyReasons.push(
    `Strong stability rating (${analysis?.confidence ?? TGEM_NA_TEXT} confidence)`,
  );
  keyReasons.push(
    `${(analysis?.offense ?? 0) >= 70 ? "Offense is steady, not explosive" : "Offense variability remains a pressure point"}`,
  );
  keyReasons.push(
    `${(analysis?.specialTeams ?? 0) >= 65 ? "Special teams are stable enough to protect field position" : "Special teams volatility is still present"}`,
  );

  const flipFactors: string[] = [
    "Red-zone trips stall into field goals.",
    "Special teams miscues swing field position.",
    "Early offensive inefficiency forces pressure.",
  ];

  const overall = analysis?.overall ?? null;
  const stability = stabilityLabel;
  const bottomLine =
    overall == null
      ? `${teamName} projects as ${TGEM_NA_TEXT} until more complete team data is available.`
      : `${teamName} projects as a ${stability.toLowerCase()} stability ${topUnit ? topUnit.label.toLowerCase() : "balanced"} team in this ${phase.toLowerCase()} lens - if they stay clean, they are built to grind.`;

  const coverage = 6 - missingLabels.length;
  return {
    read: read.slice(0, 4),
    keyReasons: keyReasons.slice(0, 5),
    flipFactors: flipFactors.slice(0, 3),
    bottomLine,
    missingLabels,
    coverage: Math.max(0, coverage),
    grading: {
      overall: analysis?.overall ?? null,
      stabilityLabel,
      confidence: analysis?.confidence ?? null,
      offense: analysis?.offense ?? null,
      defense: analysis?.defense ?? null,
      discipline: analysis?.discipline ?? null,
      specialTeams: analysis?.specialTeams ?? null,
    },
  };
}

// Tries to normalize whatever the API returns into our SeasonStats shape.
// This keeps us safe even if CFBD fields change or the API returns a slightly different format.
function normalizeSeasonStats(payload: unknown): SeasonStats | null {
  const data = payload as Record<string, unknown> | null;
  const src = data?.stats ?? data?.data ?? data ?? null;
  if (!src) return null;

  // Some endpoints return arrays (one row). Handle that.
  const row = Array.isArray(src) ? src[0] : src;

  // If nothing meaningful exists, bail.
  if (!row || typeof row !== "object") return null;

  // Try multiple likely keys. We keep this defensive.
  const games = row.games ?? row.gp ?? row.totalGames ?? null;

  const pointsPerGame =
    row.pointsPerGame ??
    row.offense?.pointsPerGame ??
    row.offense?.ppg ??
    row.ppg ??
    null;

  const yardsPerGame =
    row.yardsPerGame ??
    row.offense?.yardsPerGame ??
    row.offense?.ypg ??
    row.ypg ??
    null;

  const passYardsPerGame =
    row.passYardsPerGame ??
    row.offense?.passYardsPerGame ??
    row.offense?.passYpg ??
    row.passYpg ??
    null;

  const rushYardsPerGame =
    row.rushYardsPerGame ??
    row.offense?.rushYardsPerGame ??
    row.offense?.rushYpg ??
    row.rushYpg ??
    null;

  const pointsAllowedPerGame =
    row.pointsAllowedPerGame ??
    row.defense?.pointsAllowedPerGame ??
    row.defense?.ppgAllowed ??
    row.ppgAllowed ??
    null;

  const yardsAllowedPerGame =
    row.yardsAllowedPerGame ??
    row.defense?.yardsAllowedPerGame ??
    row.defense?.ypgAllowed ??
    row.ypgAllowed ??
    null;

  const thirdDownPct =
    row.thirdDownPct ??
    row.situational?.thirdDownPct ??
    row.thirdDownConversionPct ??
    null;

  const redZonePct =
    row.redZonePct ??
    row.situational?.redZonePct ??
    row.redZoneScoringPct ??
    null;

  const penaltiesPerGame =
    row.penaltiesPerGame ?? row.discipline?.penaltiesPerGame ?? null;

  const penaltyYardsPerGame =
    row.penaltyYardsPerGame ?? row.discipline?.penaltyYardsPerGame ?? null;

  const turnoverMarginPerGame =
    row.turnoverMarginPerGame ??
    row.ballSecurity?.turnoverMarginPerGame ??
    null;

  return {
    games: games ?? null,
    pointsPerGame: pointsPerGame ?? null,
    yardsPerGame: yardsPerGame ?? null,
    passYardsPerGame: passYardsPerGame ?? null,
    rushYardsPerGame: rushYardsPerGame ?? null,
    pointsAllowedPerGame: pointsAllowedPerGame ?? null,
    yardsAllowedPerGame: yardsAllowedPerGame ?? null,
    thirdDownPct: thirdDownPct ?? null,
    redZonePct: redZonePct ?? null,
    penaltiesPerGame: penaltiesPerGame ?? null,
    penaltyYardsPerGame: penaltyYardsPerGame ?? null,
    turnoverMarginPerGame: turnoverMarginPerGame ?? null,
  };
}

function normalizeTeamName(s: string) {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, "") // remove (FL), (OH), etc
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "") // strip spaces/punctuation
    .trim();
}

function isSameTeam(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  const na = normalizeTeamName(a);
  const nb = normalizeTeamName(b);
  if (!na || !nb) return false;

  // exact match or one contains the other (helps "Miami" vs "Miami (FL)" etc)
  return na === nb || na.includes(nb) || nb.includes(na);
}

export default function FbsTeamPage() {
  const params = useParams<{ team: string }>();
  const search = useSearchParams();
  const slug = params?.team ?? "";
  const from = search.get("from");

  const team = useMemo(() => {
    return FBS_TEAMS.find((t) => t.slug === slug) ?? null;
  }, [slug]);
  const backHref = useMemo(() => {
    if (from === "by-conference") return "/team-analysis/fbs/by-conference";
    if (from === "by-team") return "/team-analysis/fbs/by-team";
    return "/team-analysis/fbs";
  }, [from]);
  const backLabel = useMemo(() => {
    if (from === "by-conference") return "<- Back to FBS by Conference";
    if (from === "by-team") return "<- Back to FBS by Team";
    return "<- Back to FBS";
  }, [from]);

  const meta = useMemo(() => {
    return slug ? getTeamMeta(slug) : null;
  }, [slug]);
  const [apiMeta, setApiMeta] = useState<TeamMeta | null>(null);

  const mergedMeta = apiMeta ?? meta;

  const teamName = team?.name ?? mergedMeta?.name ?? "Unknown Team";
  const conference =
    team?.conference ?? mergedMeta?.conference ?? "Unknown Conference";
  const subdivision = classifySubdivision(conference);

  // helper: map opponent team name -> slug (for matchup links)
  function nameToSlug(teamNameRaw: string | null | undefined) {
    if (!teamNameRaw) return null;
    const tn = teamNameRaw.toLowerCase();

    const exact = FBS_TEAMS.find((t) => t.name.toLowerCase() === tn);
    if (exact) return exact.slug;

    const loose = FBS_TEAMS.find((t) => tn.includes(t.name.toLowerCase()));
    if (loose) return loose.slug;

    return null;
  }

  // --- SCHEDULE
  const [schedule, setSchedule] = useState<ScheduleGame[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const statsRequestYear = getStatsSeasonYear();
  const scheduleRequestYear = getScheduleSeasonYear();
  const allowPriorSeasonFallback = shouldAllowPriorSeasonFallback();

  // --- SEASON STATS (CFBD)
  const [seasonStats, setSeasonStats] = useState<SeasonStats | null>(null);
  const [seasonTotals, setSeasonTotals] = useState<SeasonTotals | null>(null);
  const [seasonStatsYear, setSeasonStatsYear] = useState<number>(statsRequestYear);
  const [seasonStatsLoading, setSeasonStatsLoading] = useState(false);
  const [seasonStatsError, setSeasonStatsError] = useState<string | null>(null);
  const [leaders, setLeaders] = useState<LeaderEntry[] | null>(null);
  const [leadersYear, setLeadersYear] = useState<number>(statsRequestYear);
  const [scheduleSeasonYear, setScheduleSeasonYear] = useState<number>(scheduleRequestYear);
  const [leadersLoading, setLeadersLoading] = useState(false);
  const [leadersError, setLeadersError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMeta() {
      if (!slug) return;

      try {
        const res = await fetch(`/api/cfbd/fbs/team-meta/${slug}?year=${scheduleRequestYear}`);
        const data = await res.json();
        if (!res.ok || data?.ok === false) return;

        const nextMeta = (data?.meta ?? null) as TeamMeta | null;
        if (!cancelled) setApiMeta(nextMeta);
      } catch {
        if (!cancelled) setApiMeta(null);
      }
    }

    loadMeta();
    return () => {
      cancelled = true;
    };
  }, [slug, scheduleRequestYear]);

  useEffect(() => {
    let cancelled = false;

    async function fetchFor(y: number) {
      const res = await fetch(`/api/cfbd/fbs/season-stats/${slug}?year=${y}`);
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || `Season stats failed (${res.status})`);
      }
      const normalized = normalizeSeasonStats(data);
      const totals =
        data?.seasonTotals && typeof data.seasonTotals === "object"
          ? (data.seasonTotals as SeasonTotals)
          : null;
      return { normalized, totals, raw: data };
    }

    async function load() {
      if (!slug) return;

      setSeasonStatsLoading(true);
      setSeasonStatsError(null);

      try {
        // Try current year first
        let y = statsRequestYear;
        let out = await fetchFor(y);

        // If 2025 has no stats yet, fallback to 2024 automatically
        if (
          allowPriorSeasonFallback &&
          (!out.normalized || out.normalized.games == null)
        ) {
          y = statsRequestYear - 1;
          out = await fetchFor(y);
        }

        if (!cancelled) {
          setSeasonStatsYear(y);
          setSeasonStats(out.normalized);
          setSeasonTotals(out.totals);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setSeasonStatsError(e instanceof Error ? e.message : "Unknown error");
        }
      } finally {
        if (!cancelled) setSeasonStatsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug, statsRequestYear, allowPriorSeasonFallback]);

  useEffect(() => {
    let cancelled = false;

    async function fetchFor(y: number) {
      const res = await fetch(`/api/cfbd/fbs/leaders/${slug}?year=${y}`);
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || `Leaders request failed (${res.status})`);
      }
      const list = Array.isArray(data?.leaders) ? (data.leaders as LeaderEntry[]) : [];
      const availableCount =
        typeof data?.availableCount === "number"
          ? data.availableCount
          : list.filter((l) => l.player && l.stat != null).length;
      return { list, availableCount };
    }

    async function load() {
      if (!slug) return;

      setLeadersLoading(true);
      setLeadersError(null);
      try {
        let y = statsRequestYear;
        let out = await fetchFor(y);
        if (allowPriorSeasonFallback && out.availableCount === 0) {
          y = statsRequestYear - 1;
          out = await fetchFor(y);
        }
        if (!cancelled) {
          setLeadersYear(y);
          setLeaders(out.list);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setLeadersError(e instanceof Error ? e.message : "Unknown error");
        }
      } finally {
        if (!cancelled) setLeadersLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug, statsRequestYear, allowPriorSeasonFallback]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!slug) return;

      setScheduleLoading(true);
      setScheduleError(null);

      try {
        const res = await fetch(`/api/cfbd/fbs/schedule/${slug}?year=${scheduleRequestYear}`);
        const data = await res.json();

        if (!res.ok || data?.ok === false) {
          const msg =
            data?.error ||
            data?.message ||
            `Schedule request failed (${res.status})`;
          throw new Error(msg);
        }

        const games: ScheduleGame[] = Array.isArray(data?.games)
          ? data.games
          : Array.isArray(data)
            ? data
            : [];

        // sort by date first, then week
        games.sort((a, b) => {
          const da =
            parseDate(a.startDate)?.getTime() ?? Number.POSITIVE_INFINITY;
          const db =
            parseDate(b.startDate)?.getTime() ?? Number.POSITIVE_INFINITY;
          if (da !== db) return da - db;

          const wa = a.week ?? Number.POSITIVE_INFINITY;
          const wb = b.week ?? Number.POSITIVE_INFINITY;
          return wa - wb;
        });

        if (!cancelled) {
          setSchedule(games);
          const apiResolvedYear =
            typeof data?.resolvedYear === "number" ? data.resolvedYear : null;
          setScheduleSeasonYear(apiResolvedYear ?? scheduleRequestYear);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setScheduleError(e instanceof Error ? e.message : "Unknown error");
        }
      } finally {
        if (!cancelled) setScheduleLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug, scheduleRequestYear]);

  const location = mergedMeta?.location ?? null;
  const colorProfile = resolveTeamColorProfile({
    slug,
    teamName,
    primary: mergedMeta?.color ?? null,
    secondary: mergedMeta?.alt_color ?? null,
  });
  const fourthDownPct = getFourthDownPct(seasonTotals);
  const tgemPhase = useMemo(() => classifyTeamTgemPhase(schedule), [schedule]);
  const tgemTeamAnalysis = useMemo(
    () => buildTgemTeamAnalysis(seasonStats, seasonTotals, fourthDownPct, tgemPhase),
    [seasonStats, seasonTotals, fourthDownPct, tgemPhase],
  );
  const tgemCoach = useMemo(
    () =>
      buildCoachNarrative(
        teamName,
        tgemPhase,
        tgemTeamAnalysis,
        seasonStats,
        fourthDownPct,
      ),
    [teamName, tgemPhase, tgemTeamAnalysis, seasonStats, fourthDownPct],
  );

  const teamBadgeText = buildTeamBadgeText(teamName, mergedMeta?.abbreviation);
  const badgeBg = normalizeHexColor(colorProfile.primary) ?? "#f4f4f4";
  const badgeTextColor =
    normalizeHexColor(colorProfile.secondary) ?? contrastTextColor(badgeBg);
  const badgeBorder = normalizeHexColor(colorProfile.secondary) ?? "#d0d0d0";

  return (
    <main className="tgem-shell">
      <div style={{ marginBottom: 14 }}>
        <Link href={backHref} className="tgem-back-link">
          {backLabel}
        </Link>
      </div>

      {/* Header */}
      <section style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 12,
            background: badgeBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            flexShrink: 0,
            fontWeight: 700,
            color: badgeTextColor,
            border: `1px solid ${badgeBorder}`,
            letterSpacing: 0.5,
            fontSize: 20,
          }}
          title={teamName}
        >
          {teamBadgeText}
        </div>

        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>{teamName}</h1>
          <div style={{ marginTop: 6, color: "#444" }}>
            <strong>Conference:</strong> {conference}{" "}
            <span style={{ color: "#999" }}>|</span>{" "}
            <strong>Subdivision:</strong> {subdivision}
          </div>
        </div>
      </section>

      <hr style={{ margin: "18px 0" }} />

      {/* Metadata */}
      <h2 style={{ margin: "0 0 10px 0", fontSize: 18 }}>Team Metadata</h2>

      <div
        className="tgem-card"
        style={{
          border: "1px solid #e6e6e6",
          borderRadius: 12,
          padding: 14,
          marginBottom: 16,
          background: "#fff",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <div>
            <strong>Abbreviation:</strong> {safeStr(teamBadgeText)}
          </div>
          <div>
            <strong>Mascot:</strong> {safeStr(mergedMeta?.mascot)}
          </div>
          <div>
            <strong>Conference:</strong>{" "}
            {safeStr(mergedMeta?.conference ?? conference)}
          </div>
          <div>
            <strong>Classification:</strong>{" "}
            {safeStr(mergedMeta?.classification ?? "FBS")}
          </div>
          <div>
            <strong>School Colors:</strong>{" "}
            {normalizeHexColor(colorProfile.primary) ||
            normalizeHexColor(colorProfile.secondary) ? (
              <>
                <ColorSwatch value={colorProfile.primary} label="Primary" />
                <ColorSwatch value={colorProfile.secondary} label="Secondary" />
              </>
            ) : (
              safeStr(colorProfile.primary)
            )}
            <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
              {colorProfile.sourceUrl ? (
                <>
                  {colorProfile.disclaimer}{" "}
                  <a
                    href={colorProfile.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ textDecoration: "underline" }}
                  >
                    Source
                  </a>
                </>
              ) : (
                colorProfile.disclaimer
              )}
            </div>
          </div>
          <div>
            <strong>Timezone:</strong> {safeStr(location?.timezone)}
          </div>
        </div>
      </div>

      {/* Stadium / Location */}
      <h2 style={{ margin: "0 0 10px 0", fontSize: 18 }}>Stadium / Location</h2>
      <div
        className="tgem-card"
        style={{
          border: "1px solid #e6e6e6",
          borderRadius: 12,
          padding: 14,
          marginBottom: 18,
          background: "#fff",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <div>
            <strong>Stadium:</strong> {safeStr(location?.name)}
          </div>
          <div>
            <strong>City/State:</strong> {safeStr(location?.city)}
            {location?.state ? `, ${location.state}` : ""}
          </div>

          <div>
            <strong>Capacity:</strong> {fmt(location?.capacity ?? null)}
          </div>
          <div>
            <strong>Year Built:</strong>{" "}
            {fmt(location?.year_constructed ?? null)}
          </div>

          <div>
            <strong>Latitude:</strong>{" "}
            {location?.latitude === null || location?.latitude === undefined
              ? "N/A"
              : String(location.latitude)}
          </div>
          <div>
            <strong>Longitude:</strong>{" "}
            {location?.longitude === null || location?.longitude === undefined
              ? "N/A"
              : String(location.longitude)}
          </div>

          <div>
            <strong>Grass:</strong> {fmtBool(location?.grass ?? null)}
          </div>
          <div>
            <strong>Dome:</strong> {fmtBool(location?.dome ?? null)}
          </div>
        </div>
      </div>

      <div style={{ margin: "10px 0 16px 0" }}>
        <AdSlot placement="INLINE_1" />
      </div>
      <section
        className="tgem-card"
        style={{
          marginTop: 16,
          marginBottom: 16,
          border: "1px solid #e5e5e5",
          borderRadius: 12,
          padding: 12,
          background: "#fafafa",
        }}
      >
        <h2 style={{ margin: "0 0 10px 0", fontSize: 18 }}>
          TGEM v11 - Team Analysis
        </h2>

        <div className="tgem-card" style={{ marginBottom: 10, padding: 12 }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: 16 }}>TGEM Projection</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <strong>Team:</strong> {teamName || TGEM_NA_TEXT}
            </div>
            <div>
              <strong>Overall Team Rating:</strong>{" "}
              {seasonStatsLoading ? "Computing..." : fmtScore100(tgemTeamAnalysis?.overall)}
            </div>
            <div>
              <strong>Phase Label:</strong> {tgemPhase.toUpperCase()}
            </div>
            <div>
              <strong>Stability / Confidence:</strong>{" "}
              {seasonStatsLoading ? "Computing..." : fmtScore100(tgemTeamAnalysis?.confidence)}
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {[
              `Model: TGEM v11`,
              `Coverage: ${tgemCoach.coverage}/6`,
              `Games: ${seasonStats?.games ?? TGEM_NA_TEXT}`,
              `Stability: ${getStabilityLabel(tgemTeamAnalysis?.confidence ?? null)}`,
            ].map((flag) => (
              <span
                key={flag}
                style={{
                  fontSize: 12,
                  padding: "2px 8px",
                  borderRadius: 999,
                  border: "1px solid #d8d8d8",
                  background: "#fff",
                }}
              >
                {flag}
              </span>
            ))}
          </div>
        </div>

        <div className="tgem-card" style={{ padding: 12 }}>
          <div style={{ margin: "0 0 8px 0", fontSize: 16 }}>
            <strong>TGEM Read</strong>
          </div>
          <div style={{ color: "#222", lineHeight: 1.45 }}>
            {tgemCoach.read.map((line, idx) => (
              <p key={`${idx}_${line}`} style={{ margin: "0 0 8px 0" }}>
                {line}
              </p>
            ))}
          </div>

          <div style={{ marginTop: 8 }}>
            <strong>Grading</strong>
            <ul style={{ margin: "6px 0 0 18px" }}>
              <li>Overall grade: {tgemCoach.grading.overall ?? TGEM_NA_TEXT}</li>
              <li>
                Stability: {tgemCoach.grading.stabilityLabel}
                {tgemCoach.grading.confidence != null ? ` (${tgemCoach.grading.confidence})` : ""}
              </li>
              <li>Offense: {tgemCoach.grading.offense ?? TGEM_NA_TEXT}</li>
              <li>Defense: {tgemCoach.grading.defense ?? TGEM_NA_TEXT}</li>
              <li>Discipline: {tgemCoach.grading.discipline ?? TGEM_NA_TEXT}</li>
              <li>Special Teams: {tgemCoach.grading.specialTeams ?? TGEM_NA_TEXT}</li>
            </ul>
          </div>

          <div style={{ marginTop: 8 }}>
            <strong>Key Reasons</strong>
            <ul style={{ margin: "6px 0 0 18px" }}>
              {tgemCoach.keyReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>

          <div style={{ marginTop: 8 }}>
            <strong>Flip Factors</strong>
            <ul style={{ margin: "6px 0 0 18px" }}>
              {tgemCoach.flipFactors.map((factor) => (
                <li key={factor}>{factor}</li>
              ))}
            </ul>
          </div>

          <div style={{ marginTop: 10 }}>
            <strong>Bottom Line:</strong> {tgemCoach.bottomLine}
          </div>
        </div>
      </section>
      {/* Season Stats (Placeholder) */}
      {/* Season Stats (CFBD) */}
      <section
        className="tgem-card"
        style={{
          marginTop: 14,
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 10,
          background: "#fff",
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: 8, color: "#111" }}>
          Season Stats ({seasonStatsYear})
        </div>

        {seasonStatsLoading ? (
          <div style={{ color: "#333" }}>Loading season stats...</div>
        ) : seasonStatsError ? (
          <div style={{ color: "#b00020" }}>
            Season stats error: {seasonStatsError}
          </div>
        ) : !seasonStats ? (
          <div style={{ color: "#333" }}>No season stats available.</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              color: "#111",
            }}
          >
            <div>
              <strong>Games:</strong> {seasonStats.games ?? "N/A"}
            </div>

            <div />

            <div>
              <strong>Offense PPG:</strong> {fmtNum(seasonStats.pointsPerGame)}
            </div>
            <div>
              <strong>Defense PPG Allowed:</strong>{" "}
              {fmtNum(seasonStats.pointsAllowedPerGame)}
            </div>

            <div>
              <strong>Offense YPG:</strong> {fmtNum(seasonStats.yardsPerGame)}
            </div>
            <div>
              <strong>Defense YPG Allowed:</strong>{" "}
              {fmtNum(seasonStats.yardsAllowedPerGame)}
            </div>

            <div>
              <strong>Pass YPG:</strong> {fmtNum(seasonStats.passYardsPerGame)}
            </div>
            <div>
              <strong>Rush YPG:</strong> {fmtNum(seasonStats.rushYardsPerGame)}
            </div>

            <div>
              <strong>3rd Down:</strong> {fmtPct(seasonStats.thirdDownPct)}
            </div>
            {fourthDownPct != null ? (
              <div>
                <strong>4th Down:</strong> {fmtPct(fourthDownPct)}
              </div>
            ) : (
              <div />
            )}

            <div>
              <strong>Penalties / Game:</strong>{" "}
              {fmtNum(seasonStats.penaltiesPerGame)}
            </div>
            <div>
              <strong>Penalty Yds / Game:</strong>{" "}
              {fmtNum(seasonStats.penaltyYardsPerGame)}
            </div>

            <div>
              <strong>Turnover Margin / Game:</strong>{" "}
              {fmtNum(seasonStats.turnoverMarginPerGame)}
            </div>
          </div>
        )}

        {seasonTotals && Object.keys(seasonTotals).length > 0 ? (
          <div style={{ marginTop: 12 }}>
            <hr style={{ margin: "10px 0" }} />
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              Extended Season Totals (CFBD)
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                color: "#111",
              }}
            >
              {Object.entries(seasonTotals)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, v]) => (
                  <div key={k}>
                    <strong>{prettyStatName(k)}:</strong> {fmt(v)}
                  </div>
                ))}
            </div>
          </div>
        ) : null}

        <div style={{ marginTop: 10, color: "#333", fontSize: 13 }}>
          Note: If the current season is not available yet, TGEM Sports
          automatically falls back to the previous season.
        </div>
      </section>
      <LeadersBlock
        seasonYear={leadersYear}
        loading={leadersLoading}
        error={leadersError}
        leaders={leaders}
      />
      <div style={{ margin: "14px 0" }}>
        <AdSlot placement="INLINE_2" />
      </div>

      <section
        className="tgem-card"
        style={{
          marginTop: 14,
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 10,
          background: "#fff",
        }}
      >
      {/* Schedule */}
      <h2 style={{ margin: "0 0 10px 0", fontSize: 18 }}>Schedule (Season {scheduleSeasonYear})</h2>

      {scheduleLoading ? (
        <div style={{ color: "#666" }}>Loading schedule...</div>
      ) : scheduleError ? (
        <div style={{ color: "#b00020" }}>Schedule error: {scheduleError}</div>
      ) : schedule.length === 0 ? (
        <div style={{ color: "#666" }}>No games returned for season {scheduleSeasonYear}.</div>
      ) : (
        <div
          style={{
            overflowX: "auto",
            border: "1px solid #eee",
            borderRadius: 12,
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <th
                  style={{
                    textAlign: "left",
                    padding: 10,
                    borderBottom: "1px solid #eee",
                  }}
                >
                  Week
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: 10,
                    borderBottom: "1px solid #eee",
                  }}
                >
                  Date
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: 10,
                    borderBottom: "1px solid #eee",
                  }}
                >
                  Matchup
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: 10,
                    borderBottom: "1px solid #eee",
                  }}
                >
                  Venue
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: 10,
                    borderBottom: "1px solid #eee",
                  }}
                >
                  Result
                </th>
              </tr>
            </thead>

            <tbody>
              {schedule.map((g, idx) => {
                const week = g.week ?? "-";
                const dateStr = formatDateTime(g.startDate);

                const matchupText =
                  g.homeTeam && g.awayTeam
                    ? `${g.awayTeam} @ ${g.homeTeam}`
                    : "TBD";

                const opponentName =
                  g.homeTeam?.toLowerCase() === teamName.toLowerCase()
                    ? g.awayTeam
                    : g.homeTeam;

                const opponentSlug = nameToSlug(opponentName);

                // IMPORTANT: this matches your folder: app/team-analysis/fbs/[team]/matchup/[gameId]/page.tsx
                const matchupHref =
                  g.id != null && slug
                    ? `/team-analysis/fbs/${encodeURIComponent(slug)}/matchup/${encodeURIComponent(String(g.id))}${
                        opponentSlug
                          ? `?opponent=${encodeURIComponent(opponentSlug)}`
                          : ""
                      }`
                    : null;

                const venue = safeStr(g.venue);

                const hasScore = g.homePoints != null && g.awayPoints != null;

                let result = g.completed ? "Final" : "TBD";

                if (hasScore) {
                  const homePoints = g.homePoints!;
                  const awayPoints = g.awayPoints!;
                  // keep the same score display format you already use: away - home
                  const scoreText = `${awayPoints} - ${homePoints}`;

                  const teamIsHome = isSameTeam(teamName, g.homeTeam);
                  const teamIsAway = isSameTeam(teamName, g.awayTeam);

                  // Determine W/L/T from the page team's perspective
                  let tag: "W" | "L" | "T" | "" = "";

                  if (homePoints === awayPoints) {
                    tag = "T";
                  } else if (teamIsHome) {
                    tag = homePoints > awayPoints ? "W" : "L";
                  } else if (teamIsAway) {
                    tag = awayPoints > homePoints ? "W" : "L";
                  } else {
                    // fallback (shouldn't happen often)
                    tag = "";
                  }

                  result = tag ? `${tag} ${scoreText}` : scoreText;
                }

                return (
                  <tr key={String(g.id ?? idx)}>
                    <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                      {week}
                    </td>

                    <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                      {dateStr}
                    </td>

                    <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                      {matchupHref ? (
                        <Link
                          href={matchupHref}
                          style={{ textDecoration: "underline" }}
                        >
                          {matchupText}
                        </Link>
                      ) : (
                        matchupText
                      )}
                    </td>

                    <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                      {venue}
                    </td>

                    <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                      {result}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ marginTop: 10, color: "#333", fontSize: 13 }}>
        {scheduleSeasonYear === scheduleRequestYear
          ? `Showing ${scheduleSeasonYear} schedule.`
          : `Showing ${scheduleSeasonYear} schedule (fallback from requested ${scheduleRequestYear}).`}
      </div>
      </section>
    </main>
  );
}






