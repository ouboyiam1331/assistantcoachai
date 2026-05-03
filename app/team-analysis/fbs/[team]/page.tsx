"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import InsightBadge from "@/components/homepage/InsightBadge";
import AdSlot from "@/components/ui/AdSlot";
import { LeadersBlock } from "@/components/team/LeadersBlock";
import { FBS_TEAMS } from "@/data/fbsTeams";
import { findRivalryLabel } from "@/data/rivalries";
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
const LEGACY_UI = {
  surface: "var(--tgem-surface)",
  subtle: "var(--tgem-surface-subtle)",
  border: "var(--tgem-border)",
  text: "var(--foreground)",
  muted: "var(--tgem-muted)",
  mutedStrong: "var(--tgem-muted-strong)",
  danger: "#b00020",
};

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

function formatClassificationLabel(value: string | null | undefined, fallback: string) {
  const raw = String(value ?? fallback).trim();
  if (!raw) return fallback;
  const lowered = raw.toLowerCase();
  if (lowered === "fbs") return "FBS";
  if (lowered === "fcs") return "FCS";
  return raw;
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

function buildSeasonDataNote(requestedYear: number, resolvedYear: number) {
  if (resolvedYear < requestedYear) {
    return `Showing previous season data (${resolvedYear}) until ${requestedYear} results are available.`;
  }
  return null;
}

function buildPendingSeasonMessage(seasonYear: number) {
  return `${seasonYear} information will fill in after the first games are completed.`;
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

function buildTeamOverviewText(args: {
  teamName: string;
  mascot?: string | null;
  conference: string;
  classification: string;
  subdivision: string;
  venue?: string | null;
  city?: string | null;
  state?: string | null;
  stats: SeasonStats | null;
}) {
  const {
    teamName,
    mascot,
    conference,
    classification,
    subdivision,
    venue,
    city,
    state,
    stats,
  } = args;
  const nickname = mascot && mascot !== teamName ? mascot : teamName;
  const locationParts = [city, state].filter(Boolean).join(", ");
  const seed = Array.from(teamName).reduce(
    (total, char, index) => (total * 31 + char.charCodeAt(0) * (index + 1)) >>> 0,
    0,
  );
  const variant = seed % 12;
  const locationText = venue
    ? `${venue}${locationParts ? ` in ${locationParts}` : ""}`
    : locationParts || "its home environment";
  const venueLines = [
    `${locationText} gives ${teamName} a familiar stage for the physical side of its season.`,
    `The home base is ${locationText}, a useful piece of context when looking at travel, routine, and game-day edge.`,
    `${teamName}'s home context runs through ${locationText}, tying the program to a specific football setting.`,
    `When the schedule turns home, ${locationText} is the place attached to the team's week-to-week rhythm.`,
    `${locationText} anchors the program geographically and gives the season page a clear football backdrop.`,
    `The venue note matters here: ${locationText} is where the roster's style meets its home crowd and routine.`,
  ];
  const offenseLines =
    stats?.pointsPerGame != null
      ? stats.pointsPerGame >= 34
        ? [
            `${teamName}'s offense brings an explosive gear, especially when pace and early-down execution line up.`,
            `With the ball, the ${nickname} can push tempo and make defenses defend width, space, and finishing power.`,
            `The offensive personality is aggressive; ${teamName} is at its best when drives stay fast and decisive.`,
          ]
        : stats.pointsPerGame >= 24
          ? [
              `${teamName}'s offense has a practical feel, less frantic than flashy and more dependent on timing and clean series.`,
              `${teamName} can vary pace on offense, using field position and timely calls instead of relying only on explosive gains.`,
              `On offense, the ${nickname} look most comfortable when patience and timely shots work together.`,
            ]
          : [
              `${teamName}'s offense is more methodical, so first downs, field position, and avoiding wasted snaps carry extra weight.`,
              `${teamName} leans conservative with the ball, so possession quality matters more than raw pace.`,
              `For the ${nickname}, offensive progress often has to come through patience and cleaner early downs.`,
            ]
      : [
          `${teamName}'s offensive identity is still best judged through tempo, spacing, and how cleanly possessions are managed.`,
          `The offense is easier to understand by watching approach: pace, personnel, and how often drives stay organized.`,
          `With incomplete scoring context, the offensive read is about rhythm, play calling, and drive-to-drive consistency.`,
        ];
  const defenseLines =
    stats?.pointsAllowedPerGame != null
      ? stats.pointsAllowedPerGame <= 20
        ? [
            `${teamName}'s defense can set the tone when it creates difficult down-and-distance situations and wins contact.`,
            `The defensive side has a physical edge, especially when it can dictate down-and-distance and squeeze space.`,
            `${teamName}'s defensive identity gives the ${nickname} a firmer base than the scoreboard alone can explain.`,
          ]
        : stats.pointsAllowedPerGame <= 28
          ? [
              `${teamName} needs steadiness without the ball: tackling, leverage, and fewer series that swing the game.`,
              `${teamName}'s defense works best in a disciplined lane, where structure can matter as much as splash plays.`,
              `Without the ball, ${teamName} needs consistent fits and cleaner late-down answers to keep games under control.`,
            ]
          : [
              `The defensive side has been more uneven, which puts a premium on stops after sudden changes and long possessions.`,
              `${teamName}'s defensive concern is consistency; the ${nickname} need fewer unsettled stretches when the game speeds up.`,
              `${teamName} has to protect its defense with possession control and better answers when opponents find rhythm.`,
            ]
      : [
          `${teamName}'s defense is best evaluated through physicality, leverage, and whether the group can repeat stops over four quarters.`,
          `On defense, the important clues are discipline, tackling, and how often the unit gets off the field cleanly.`,
          `The defensive read comes down to strength, communication, and the ability to handle pressure without giving away momentum.`,
        ];
  const identityLines = [
    `${teamName}'s identity begins in the ${conference}, where the ${nickname} operate on a ${classification} stage inside the ${subdivision.toLowerCase()} picture.`,
    `The ${nickname} bring ${teamName} into the ${conference} race with a ${classification} label and a schedule that tests depth.`,
    `${teamName} carries ${conference} expectations into a ${classification} season, so identity starts with league pressure and weekly execution.`,
    `For ${teamName}, the starting point is simple: ${conference} football, ${classification} competition, and a roster trying to define its edge.`,
    `The ${nickname} are framed by ${conference} play and ${classification} standards, but the useful read comes from how the team handles each week.`,
    `${teamName}'s team page starts with a ${conference} identity, then lets the football details explain what kind of group the ${nickname} are becoming.`,
  ];
  const overallLines =
    stats?.yardsPerGame != null && stats?.yardsAllowedPerGame != null
      ? stats.yardsPerGame > stats.yardsAllowedPerGame
        ? [
            `${teamName} looks most complete when controlled offense and firm defensive play show up in the same game.`,
            `The larger theme is command: move the ball, avoid wasted possessions, and keep the opponent from finding easy answers.`,
            `${teamName}'s cleaner stretches come from assignment soundness and steady execution.`,
          ]
        : [
            `${teamName}'s bigger challenge is tightening the space between offensive rhythm and defensive reliability.`,
            `The team feels more volatile when one side of the ball has to cover for the other too often.`,
            `Consistency is the word to watch as the season sample grows.`,
          ]
      : [
          `${teamName}'s larger identity is still taking shape through leaders, play style, and week-to-week execution.`,
          `The useful read is less about one number and more about how the team plays: pace, physicality, and discipline.`,
          `${teamName} is best understood by pairing program context with the way the roster performs across the schedule.`,
        ];
  const styleOpeners =
    stats?.yardsPerGame != null && stats?.yardsAllowedPerGame != null
      ? stats.yardsPerGame > stats.yardsAllowedPerGame
        ? [
            `${teamName} can look like a control team when efficient offense and firm defensive play show up together.`,
            `Control is the word around ${teamName} when the ${nickname} pair steady movement with enough defensive answers.`,
            `${teamName}'s best football has a composed feel: move the ball, avoid waste, and keep the opponent off schedule.`,
          ]
        : [
            `${teamName} is still working toward a cleaner four-quarter identity between offense, defense, and field position.`,
            `The ${nickname} can become uneven when one side of the ball has to cover too much ground for the other.`,
            `${teamName}'s team identity is about finding steadier control before games start to tilt away.`,
          ]
      : [
          `${teamName}'s football identity is still being written through leaders, style, and weekly execution.`,
          `The ${nickname} are easiest to read through tempo, physicality, and how the roster responds from week to week.`,
          `${teamName} is best read by pairing program context with how the roster actually plays on Saturdays.`,
        ];
  const categoryPools = {
    identity: identityLines,
    venue: venueLines,
    offense: offenseLines,
    defense: defenseLines,
    overall: overallLines,
    style: styleOpeners,
    schedule: [
      `Each ${teamName} game listed below opens a fuller matchup breakdown when one is available.`,
      `The schedule turns this ${nickname} overview into opponent-specific game pages as each matchup is available.`,
      `Use the schedule to move from ${teamName}'s overview into the individual matchup reads.`,
      `Every available game link below carries ${teamName} into a deeper opponent-by-opponent breakdown.`,
      `The schedule section is where this ${teamName} context branches into specific matchup pages.`,
      `From here, the listed games let you open the matchup view tied to each ${nickname} opponent.`,
      `The game list below turns ${teamName}'s profile into matchup-by-matchup context.`,
      `Each available opponent link gives the ${nickname} a more specific game lens.`,
      `The schedule is the bridge from this ${teamName} overview to the individual game pages.`,
      `Open a listed game to see how this ${teamName} context changes against that opponent.`,
      `The opponent rows below carry the ${nickname} from team-level context into matchup detail.`,
      `When a matchup page is available, the schedule links ${teamName}'s team view to that game.`,
    ],
  };
  const categories = ["identity", "venue", "offense", "defense", "overall", "style"] as Array<
    keyof typeof categoryPools
  >;
  const shape = seededCategoryOrder(categories, seed);
  rotateCategoryOrder(shape, (teamName.length + seed) % shape.length);
  const scheduleIndex = 2 + (seed % (shape.length - 1));
  shape.splice(scheduleIndex, 0, "schedule");
  const sentences = shape.map((category, index) => {
    const pool = categoryPools[category];
    return pool[(seed + index * 11 + variant) % pool.length];
  });

  return removeDuplicateSentences(sentences.join(" "));
}

function seededCategoryOrder<T>(items: T[], seed: number) {
  const output = [...items];
  let state = seed || 1;

  for (let index = output.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }

  return output;
}

function rotateCategoryOrder<T>(items: T[], offset: number) {
  if (items.length === 0) return;
  const normalized = offset % items.length;
  if (normalized === 0) return;
  items.push(...items.splice(0, normalized));
}

function removeDuplicateSentences(text: string) {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text];
  const seen = new Set<string>();
  return sentences
    .map((sentence) => sentence.trim())
    .filter((sentence) => {
      const key = sentence.toLowerCase().replace(/\s+/g, " ");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(" ");
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
        className="tgem-color-swatch"
        style={{
          ["--swatch-color" as string]: color,
          width: 28,
          height: 28,
          borderRadius: 9999,
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
    consistencyBoost: number;
  }
> = {
  regular: {
    overallMix: { offense: 0.34, defense: 0.3, discipline: 0.2, specialTeams: 0.16 },
    consistencyBoost: 0,
  },
  championship: {
    overallMix: { offense: 0.31, defense: 0.35, discipline: 0.22, specialTeams: 0.12 },
    consistencyBoost: 3,
  },
  postseason: {
    overallMix: { offense: 0.28, defense: 0.38, discipline: 0.24, specialTeams: 0.1 },
    consistencyBoost: 6,
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

  const consistencyScore = clampScore(
    Math.min(
      97,
      35 +
        Math.min(16, Math.max(0, games)) * 2.8 +
        dataCoverage * 3 +
        profile.consistencyBoost,
    ),
  );

  return { overall, consistencyScore, offense, defense, discipline, specialTeams };
}

const TGEM_NA_TEXT = "Not Available";

function fmtScore100(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return TGEM_NA_TEXT;
  return `${value} / 100`;
}

function getStabilityLabel(consistencyScore: number | null | undefined) {
  if (consistencyScore == null || Number.isNaN(consistencyScore)) return TGEM_NA_TEXT;
  if (consistencyScore >= 80) return "High";
  if (consistencyScore >= 60) return "Medium";
  return "Low";
}

function buildCoachNarrative(
  teamName: string,
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

  const topUnit = strengths[0] ?? null;
  const secondUnit = strengths[1] ?? null;
  const stabilityLabel = getStabilityLabel(analysis?.consistencyScore ?? null);
  const seed = Array.from(teamName).reduce(
    (total, char, index) => (total * 31 + char.charCodeAt(0) * (index + 3)) >>> 0,
    0,
  );
  const pick = <T,>(items: T[], offset = 0) => items[(seed + offset) % items.length];
  const topLabel = topUnit?.label.toLowerCase() ?? "overall structure";
  const secondLabel = secondUnit?.label.toLowerCase() ?? "supporting details";
  const weakLabel = weakness?.label.toLowerCase() ?? "week-to-week consistency";
  const readShapes = [
    [
      `${teamName} is easiest to study through its ${topLabel}, because that area gives the team its clearest football identity right now.`,
      `${secondUnit ? `${secondUnit.label} also shows up enough to shape field position and drive quality.` : "The rest of the profile is still filling in around that main strength."}`,
      `${weakness ? `${weakness.label} needs a closer look, especially when the team has to handle longer possessions or sudden changes.` : "The weaker parts of the profile are harder to isolate with the current sample."}`,
      `${stats?.turnoverMarginPerGame != null ? "Turnover margin adds context to how often the team is protecting its own work." : "Possession data will sharpen the read as more games are added."}`,
    ],
    [
      `${teamName}'s team picture starts with how it manages possessions, not with a single headline number.`,
      `${topUnit ? `${topUnit.label} is the most stable part of the current profile, while ${weakLabel} is the area that deserves the most film-room attention.` : "The available information is still developing, so the read stays broad."}`,
      `${stats?.penaltyYardsPerGame != null ? "Penalty yardage helps explain whether drives stay organized or become harder than they need to be." : "Discipline data will add another useful layer when it is complete."}`,
      `${secondUnit ? `${secondUnit.label} gives the profile a second useful reference point.` : "For now, the profile should be treated as a team-level snapshot."}`,
    ],
    [
      `The best read on ${teamName} comes from the relationship between ${topLabel} and ${weakLabel}.`,
      `${topUnit ? `${topUnit.label} gives the team something to build around across the season sample.` : "The strongest area is still not clearly separated from the rest of the profile."}`,
      `${weakness ? `${weakness.label} is where the profile can become uneven if execution slips.` : "The available categories do not point to one obvious concern yet."}`,
      `${fourthDownPct != null ? "Short-yardage results add a useful clue about trust, tempo, and drive extension." : "Short-yardage detail will help round out the profile when it is available."}`,
    ],
    [
      `${teamName}'s team profile has a practical starting point: find the unit that travels best, then check whether the weaker area is creating extra strain.`,
      `${topUnit ? `${topUnit.label} is carrying the cleanest part of that conversation.` : "No single unit has separated clearly from the rest of the available sample."}`,
      `${secondUnit ? `${secondUnit.label} gives the staff another useful point of emphasis.` : "The secondary support pieces are still coming into focus."}`,
      `${stats?.penaltyYardsPerGame != null ? "Penalty yardage matters here because hidden yards can change how a possession feels before the next snap." : "Discipline detail will make the team picture more complete as it fills in."}`,
    ],
    [
      `For ${teamName}, the profile is less about a headline trait and more about what repeats from drive to drive.`,
      `${topUnit ? `${topUnit.label} is the most repeatable positive in the current view.` : "The repeatable positives are still developing."}`,
      `${weakness ? `${weakness.label} is the category most likely to change the tone of a series.` : "The review points are spread across several categories rather than one clear issue."}`,
      `${stats?.thirdDownPct != null ? "Third-down performance adds context because it determines whether possessions continue or reset quickly." : "Third-down detail will sharpen the read once it is available."}`,
    ],
  ];
  const read = [
    removeDuplicateSentences(pick(readShapes).join(" ")),
    ...(missingLabels.length > 0
      ? [`Some supporting categories are incomplete: ${missingLabels.join(", ")}.`]
      : []),
  ];
  const strengthPool = [
    topUnit ? pick([`${topUnit.label} is the cleanest positive on the team card`, `${topUnit.label} gives the staff the most dependable starting point`, `${topUnit.label} is the unit showing the most repeatable value`], 2) : null,
    secondUnit ? pick([`${secondUnit.label} gives the profile a second useful layer`, `${secondUnit.label} helps keep the team view from becoming one-dimensional`, `${secondUnit.label} adds another steady piece to the evaluation`], 4) : null,
    (analysis?.offense ?? 0) >= 70 ? pick(["Offensive production is supporting drive quality", "The offense is creating enough useful possession value", "Offensive efficiency is helping the team stay organized"], 6) : null,
    (analysis?.defense ?? 0) >= 70 ? pick(["Defensive resistance is a clear part of the identity", "The defense is limiting easy movement well enough to stand out", "Defensive play is giving the team a reliable base"], 8) : null,
    (analysis?.discipline ?? 0) >= 70 ? pick(["Discipline is helping reduce avoidable strain", "Penalty and possession habits are keeping the profile cleaner", "The team is not giving away many hidden-yardage problems"], 10) : null,
    (analysis?.specialTeams ?? 0) >= 65 ? pick(["Special teams are contributing to field position stability", "The kicking and return game is helping with hidden yards", "Special teams are adding useful field-position support"], 12) : null,
    stats?.turnoverMarginPerGame != null && stats.turnoverMarginPerGame >= 0
      ? "Turnover margin is not creating extra drag on the team profile"
      : null,
    fourthDownPct != null && fourthDownPct >= 55
      ? "Short-yardage execution is helping extend possessions"
      : null,
  ].filter(Boolean) as string[];
  const monitorPool = [
    weakness ? pick([`${weakness.label} is the first category to keep reviewing`, `${weakness.label} needs a cleaner weekly sample`, `${weakness.label} is the spot most likely to pull the profile off schedule`], 14) : null,
    (analysis?.offense ?? 100) < 60 ? pick(["Offensive rhythm can become uneven across drives", "The offense needs more repeatable early-down answers", "Drive quality can dip when the offense loses schedule"], 16) : null,
    (analysis?.defense ?? 100) < 60 ? pick(["Defensive resistance needs steadier series-to-series play", "The defense needs more consistent stops before field position flips", "Defensive answers can arrive too late in a possession"], 18) : null,
    (analysis?.discipline ?? 100) < 60 ? pick(["Penalty and possession details can disrupt otherwise useful stretches", "Avoidable yardage can make routine possessions harder", "Discipline details still need cleaner weekly habits"], 20) : null,
    (analysis?.specialTeams ?? 100) < 60 ? pick(["Special teams execution can shift field position", "Hidden-yardage swings remain worth tracking", "The field-position game can become harder when special teams are uneven"], 22) : null,
    stats?.turnoverMarginPerGame != null && stats.turnoverMarginPerGame < 0
      ? "Turnover margin is adding pressure to the weekly profile"
      : null,
    stats?.thirdDownPct != null && stats.thirdDownPct < 36
      ? "Third-down efficiency can limit sustained possession"
      : null,
    fourthDownPct != null && fourthDownPct < 45
      ? "Short-yardage decisions remain worth monitoring"
      : null,
  ].filter(Boolean) as string[];
  const keyReasons = rotateList(strengthPool.length ? strengthPool : [`${teamName}'s strongest signals will clarify as more team data fills in`], seed).slice(0, 5);
  const flipFactors = rotateList(monitorPool.length ? monitorPool : ["More complete season data will sharpen the areas to monitor"], seed + 5).slice(0, 3);
  const overall = analysis?.overall ?? null;
  const summaryLines = [
    overall == null
      ? `${teamName}'s profile summary will sharpen when more complete team data is available.`
      : `${teamName} is best understood through ${topLabel}, while ${weakLabel} remains the detail to keep checking as the sample grows.`,
    overall == null
      ? `The current read on ${teamName} is still an early team snapshot.`
      : `For ${teamName}, the current team shape is strongest where ${topLabel} creates cleaner possessions and less settled where ${weakLabel} shows up.`,
    overall == null
      ? `${teamName}'s team profile is still waiting on a fuller season sample.`
      : `${teamName}'s profile has a clear starting point in ${topLabel}; ${secondLabel} and ${weakLabel} provide the next layer of context.`,
  ];
  const bottomLine = pick(summaryLines, 9);

  const coverage = 6 - missingLabels.length;
  return {
    read: read.slice(0, 2),
    keyReasons: keyReasons.slice(0, 5),
    flipFactors: flipFactors.slice(0, 3),
    bottomLine,
    missingLabels,
    coverage: Math.max(0, coverage),
    grading: {
      overall: analysis?.overall ?? null,
      stabilityLabel,
      offense: analysis?.offense ?? null,
      defense: analysis?.defense ?? null,
      discipline: analysis?.discipline ?? null,
      specialTeams: analysis?.specialTeams ?? null,
    },
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

function rotateList<T>(items: T[], seed: number) {
  if (items.length <= 1) return items;
  const offset = seed % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
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
  shouldAllowPriorSeasonFallback();

  // --- SEASON STATS (CFBD)
  const [seasonStats, setSeasonStats] = useState<SeasonStats | null>(null);
  const [seasonTotals, setSeasonTotals] = useState<SeasonTotals | null>(null);
  const [seasonStatsYear, setSeasonStatsYear] = useState<number>(statsRequestYear);
  const [seasonStatsLoading, setSeasonStatsLoading] = useState(false);
  const [seasonStatsError, setSeasonStatsError] = useState<string | null>(null);
  const [leaders, setLeaders] = useState<LeaderEntry[] | null>(null);
  const [leadersYear, setLeadersYear] = useState<number>(statsRequestYear);
  const [scheduleSeasonYear, setScheduleSeasonYear] = useState<number>(scheduleRequestYear);
  const [showExtendedSeasonTotals, setShowExtendedSeasonTotals] = useState(false);
  const [leadersLoading, setLeadersLoading] = useState(false);
  const [leadersError, setLeadersError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTeamPayload() {
      if (!slug) return;

      setSeasonStatsLoading(true);
      setLeadersLoading(true);
      setScheduleLoading(true);
      setSeasonStatsError(null);
      setLeadersError(null);
      setScheduleError(null);

      try {
        const res = await fetch(
          `/api/analysis/fbs/team/${slug}?statsYear=${statsRequestYear}&scheduleYear=${scheduleRequestYear}`,
          { cache: "no-store" },
        );
        const data = await res.json();
        if (!res.ok || data?.ok === false) {
          throw new Error(data?.error ?? `Team payload request failed (${res.status})`);
        }

        const games: ScheduleGame[] = Array.isArray(data?.schedule) ? data.schedule : [];
        games.sort((a, b) => {
          const da = parseDate(a.startDate)?.getTime() ?? Number.POSITIVE_INFINITY;
          const db = parseDate(b.startDate)?.getTime() ?? Number.POSITIVE_INFINITY;
          if (da !== db) return da - db;
          const wa = a.week ?? Number.POSITIVE_INFINITY;
          const wb = b.week ?? Number.POSITIVE_INFINITY;
          return wa - wb;
        });

        if (!cancelled) {
          setApiMeta((data?.meta ?? null) as TeamMeta | null);
          setSeasonStats((data?.seasonStats ?? null) as SeasonStats | null);
          setSeasonTotals(
            data?.seasonTotals && typeof data.seasonTotals === "object"
              ? (data.seasonTotals as SeasonTotals)
              : null,
          );
          setSeasonStatsYear(
            typeof data?.seasonStatsYear === "number" ? data.seasonStatsYear : statsRequestYear,
          );
          setSeasonStatsError((data?.seasonStatsError as string | null) ?? null);
          setLeaders(Array.isArray(data?.leaders) ? (data.leaders as LeaderEntry[]) : null);
          setLeadersYear(
            typeof data?.leadersYear === "number" ? data.leadersYear : statsRequestYear,
          );
          setLeadersError((data?.leadersError as string | null) ?? null);
          setSchedule(games);
          setScheduleSeasonYear(
            typeof data?.scheduleSeasonYear === "number"
              ? data.scheduleSeasonYear
              : scheduleRequestYear,
          );
          setScheduleError((data?.scheduleError as string | null) ?? null);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : "Unknown error";
          setApiMeta(null);
          setSeasonStats(null);
          setSeasonTotals(null);
          setLeaders(null);
          setSchedule([]);
          setSeasonStatsError(message);
          setLeadersError(message);
          setScheduleError(message);
        }
      } finally {
        if (!cancelled) {
          setSeasonStatsLoading(false);
          setLeadersLoading(false);
          setScheduleLoading(false);
        }
      }
    }

    loadTeamPayload();
    return () => {
      cancelled = true;
    };
  }, [slug, statsRequestYear, scheduleRequestYear]);

  const location = mergedMeta?.location ?? null;
  const colorProfile = resolveTeamColorProfile({
    slug,
    teamName,
    primary: mergedMeta?.color ?? null,
    secondary: mergedMeta?.alt_color ?? null,
  });
  const fourthDownPct = getFourthDownPct(seasonTotals);
  const seasonStatsNote = buildSeasonDataNote(statsRequestYear, seasonStatsYear);
  const leadersNote = buildSeasonDataNote(statsRequestYear, leadersYear);
  const showPendingSeasonStatsMessage =
    !seasonStatsLoading &&
    !seasonStatsError &&
    seasonStatsYear === statsRequestYear &&
    (!seasonStats || (seasonStats.games ?? 0) === 0);
  const showPendingLeadersMessage =
    !leadersLoading &&
    !leadersError &&
    leadersYear === statsRequestYear &&
    !(leaders ?? []).some((entry) => entry.player && entry.stat != null);
  const tgemPhase = useMemo(() => classifyTeamTgemPhase(schedule), [schedule]);
  const tgemTeamAnalysis = useMemo(
    () => buildTgemTeamAnalysis(seasonStats, seasonTotals, fourthDownPct, tgemPhase),
    [seasonStats, seasonTotals, fourthDownPct, tgemPhase],
  );
  const tgemCoach = useMemo(
    () =>
      buildCoachNarrative(
        teamName,
        tgemTeamAnalysis,
        seasonStats,
        fourthDownPct,
      ),
    [teamName, tgemTeamAnalysis, seasonStats, fourthDownPct],
  );

  const teamBadgeText = buildTeamBadgeText(teamName, mergedMeta?.abbreviation);
  const teamOverviewText = buildTeamOverviewText({
    teamName,
    mascot: mergedMeta?.mascot,
    conference,
    classification: formatClassificationLabel(mergedMeta?.classification, "FBS"),
    subdivision,
    venue: location?.name,
    city: location?.city,
    state: location?.state,
    stats: seasonStats,
  });
  const badgeBg = normalizeHexColor(colorProfile.primary) ?? "#f4f4f4";
  const badgeTextColor =
    normalizeHexColor(colorProfile.secondary) ?? contrastTextColor(badgeBg);
  const badgeBorder = normalizeHexColor(colorProfile.secondary) ?? "#d0d0d0";

  return (
    <main className="tgem-shell">
      <div className="mb-4">
        <Link href={backHref} className="tgem-back-link">
          {backLabel}
        </Link>
      </div>

      <section className="tgem-surface rounded-3xl p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-4">
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{teamName}</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-700 dark:text-gray-300">
                College team profile with TGEM team context, season production, key players,
                and clickable matchup paths from the schedule.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="tgem-surface-subtle rounded-full px-3 py-1">{conference}</span>
                <span className="tgem-surface-subtle rounded-full px-3 py-1">{subdivision}</span>
                <span className="tgem-surface-subtle rounded-full px-3 py-1">
                  {formatClassificationLabel(mergedMeta?.classification, "FBS")}
                </span>
              </div>
            </div>
          </div>

          <div className="tgem-surface-subtle min-w-[260px] rounded-2xl p-4">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Team Snapshot
            </div>
            <div className="mt-3 grid gap-2 text-sm text-gray-700 dark:text-gray-300">
              <div>
                <strong className="text-gray-900 dark:text-gray-100">Team Name:</strong>{" "}
                {safeStr(mergedMeta?.mascot)}
              </div>
              <div>
                <strong className="text-gray-900 dark:text-gray-100">Timezone:</strong>{" "}
                {safeStr(location?.timezone)}
              </div>
              <div>
                <strong className="text-gray-900 dark:text-gray-100">Stadium:</strong>{" "}
                {safeStr(location?.name)}
              </div>
              <div>
                <strong className="text-gray-900 dark:text-gray-100">Capacity:</strong>{" "}
                {fmt(location?.capacity ?? null)}
              </div>
              <div>
                <strong className="text-gray-900 dark:text-gray-100">Grass:</strong>{" "}
                {fmtBool(location?.grass ?? null)}
              </div>
            </div>
            <div className="mt-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
              School Colors
            </div>
            <div className="mt-3 flex items-center gap-3">
              <ColorSwatch value={colorProfile.primary} label="Primary" />
              <ColorSwatch value={colorProfile.secondary} label="Secondary" />
            </div>
            <div className="mt-5 border-t border-[var(--tgem-border)] pt-4">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Team Overview
              </div>
              <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-300">
                {teamOverviewText}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="tgem-surface-subtle mt-4 rounded-3xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Understanding the TGEM team profile
            </h2>
            <p className="mt-2 text-sm leading-7 text-gray-700 dark:text-gray-300">
              This page organizes team identity, season production, consistency, and schedule
              context into a cleaner football read before you dig deeper into the numbers below.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/how-tgem-works"
              className="rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
            >
              How TGEM Works
            </Link>
            <Link
              href="/model-breakdown"
              className="rounded-lg border border-[var(--tgem-border)] px-5 py-3 text-sm font-semibold text-gray-900 hover:bg-[var(--tgem-surface)] dark:text-gray-100"
            >
              Profile Breakdown
            </Link>
          </div>
        </div>
      </section>

      <div className="my-4">
        <AdSlot placement="INLINE_1" />
      </div>
      <section
        className="tgem-surface-subtle mt-6 rounded-3xl p-6"
      >
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          TGEM Team Profile
        </h2>

        <div className="tgem-surface mb-3 rounded-2xl p-4">
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Team Profile Summary</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <strong>Team:</strong> {teamName || TGEM_NA_TEXT}
            </div>
            <div>
              <strong>Team Profile Score:</strong>{" "}
              {seasonStatsLoading ? "Computing..." : fmtScore100(tgemTeamAnalysis?.overall)}
            </div>
            <div>
              <strong>Current View:</strong> Season profile
            </div>
            <div>
              <strong>Consistency Indicator:</strong>{" "}
              {seasonStatsLoading ? "Computing..." : fmtScore100(tgemTeamAnalysis?.consistencyScore)}
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {[
              `Profile: Team view`,
              `Available categories: ${tgemCoach.coverage}/6`,
              `Games: ${seasonStats?.games ?? TGEM_NA_TEXT}`,
              `Consistency: ${getStabilityLabel(tgemTeamAnalysis?.consistencyScore ?? null)}`,
            ].map((flag) => (
              <span
                key={flag}
                className="tgem-surface-subtle rounded-full px-3 py-1 text-xs"
              >
                {flag}
              </span>
            ))}
          </div>
        </div>

        <div className="tgem-surface rounded-2xl p-4">
          <div className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
            <strong>TGEM Read</strong>
          </div>
          <div style={{ color: LEGACY_UI.text, lineHeight: 1.45 }}>
            {tgemCoach.read.map((line, idx) => (
              <p key={`${idx}_${line}`} style={{ margin: "0 0 8px 0" }}>
                {line}
              </p>
            ))}
          </div>

          <div style={{ marginTop: 8 }}>
            <strong>Team Profile Breakdown</strong>
            <ul style={{ margin: "6px 0 0 18px" }}>
              <li>Overall: {tgemCoach.grading.overall ?? TGEM_NA_TEXT}</li>
              <li>Consistency Indicator: {tgemCoach.grading.stabilityLabel}</li>
              <li>Offense: {tgemCoach.grading.offense ?? TGEM_NA_TEXT}</li>
              <li>Defense: {tgemCoach.grading.defense ?? TGEM_NA_TEXT}</li>
              <li>Discipline: {tgemCoach.grading.discipline ?? TGEM_NA_TEXT}</li>
              <li>Special Teams: {tgemCoach.grading.specialTeams ?? TGEM_NA_TEXT}</li>
            </ul>
          </div>

          <div style={{ marginTop: 8 }}>
            <strong>Strength Signals</strong>
            <ul style={{ margin: "6px 0 0 18px" }}>
              {tgemCoach.keyReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>

          <div style={{ marginTop: 8 }}>
            <strong>Areas to Monitor</strong>
            <ul style={{ margin: "6px 0 0 18px" }}>
              {tgemCoach.flipFactors.map((factor) => (
                <li key={factor}>{factor}</li>
              ))}
            </ul>
          </div>

          <div style={{ marginTop: 10 }}>
            <strong>Profile Summary:</strong> {tgemCoach.bottomLine}
          </div>
        </div>
      </section>
      {/* Season Stats (Placeholder) */}
      {/* Season Stats (CFBD) */}
      <section className="tgem-surface mt-4 rounded-3xl p-6">
        <div className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
          Season Stats ({seasonStatsYear})
        </div>
        {seasonStatsNote ? (
          <div style={{ marginBottom: 8, color: LEGACY_UI.mutedStrong, fontSize: 13 }}>
            {seasonStatsNote}
          </div>
        ) : null}

        {seasonStatsLoading ? (
          <div style={{ color: LEGACY_UI.mutedStrong }}>Loading season stats...</div>
        ) : seasonStatsError ? (
          <div style={{ color: LEGACY_UI.danger }}>
            Season stats error: {seasonStatsError}
          </div>
        ) : showPendingSeasonStatsMessage ? (
          <div style={{ color: LEGACY_UI.mutedStrong }}>
            {buildPendingSeasonMessage(seasonStatsYear)}
          </div>
        ) : !seasonStats ? (
          <div style={{ color: LEGACY_UI.mutedStrong }}>No season stats available.</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              color: LEGACY_UI.text,
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
            <button
              type="button"
              onClick={() => setShowExtendedSeasonTotals((current) => !current)}
              className="tgem-button-secondary mb-0 rounded-xl px-3 py-2 text-sm font-semibold"
            >
              {showExtendedSeasonTotals
                ? "Hide extended season totals"
                : "Click here to see more"}
            </button>
            {showExtendedSeasonTotals ? (
              <>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>
                  Extended Season Totals (CFBD)
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    color: LEGACY_UI.text,
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
              </>
            ) : null}
          </div>
        ) : null}

        {!seasonStatsNote && !showPendingSeasonStatsMessage ? (
          <div style={{ marginTop: 10, color: LEGACY_UI.mutedStrong, fontSize: 13 }}>
            Showing {seasonStatsYear} season stats.
          </div>
        ) : null}
      </section>
      <LeadersBlock
        seasonYear={leadersYear}
        note={leadersNote}
        emptyMessage={
          showPendingLeadersMessage
            ? buildPendingSeasonMessage(leadersYear)
            : "No key player data available."
        }
        loading={leadersLoading}
        error={leadersError}
        leaders={leaders}
      />
      <div className="my-4">
        <AdSlot placement="INLINE_2" />
      </div>

      <section className="tgem-surface mt-4 rounded-3xl p-6">
      <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-100">Schedule (Season {scheduleSeasonYear})</h2>

      {scheduleLoading ? (
        <div style={{ color: LEGACY_UI.muted }}>Loading schedule...</div>
      ) : scheduleError ? (
        <div style={{ color: LEGACY_UI.danger }}>Schedule error: {scheduleError}</div>
      ) : schedule.length === 0 ? (
        <div style={{ color: LEGACY_UI.muted }}>No games returned for season {scheduleSeasonYear}.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--tgem-border)]">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: LEGACY_UI.subtle }}>
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
                const rivalryLabel = findRivalryLabel(g.homeTeam, g.awayTeam);

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
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
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
                        {rivalryLabel ? <InsightBadge tag="rivalry" compact /> : null}
                      </div>
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






