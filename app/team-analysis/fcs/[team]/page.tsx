"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import InsightBadge from "@/components/homepage/InsightBadge";
import AdSlot from "@/components/ui/AdSlot";
import { LeadersBlock } from "@/components/team/LeadersBlock";
import { findRivalryLabel } from "@/data/rivalries";
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
  completed?: boolean | null;
  venue?: string | null;
  homeTeam?: string | null;
  awayTeam?: string | null;
  homePoints?: number | null;
  awayPoints?: number | null;
};

type SeasonStats = {
  games?: number | null;
  pointsPerGame?: number | null;
  yardsPerGame?: number | null;
  passYardsPerGame?: number | null;
  rushYardsPerGame?: number | null;
  pointsAllowedPerGame?: number | null;
  yardsAllowedPerGame?: number | null;
  thirdDownPct?: number | null;
  redZonePct?: number | null;
  penaltiesPerGame?: number | null;
  penaltyYardsPerGame?: number | null;
  turnoverMarginPerGame?: number | null;
};

type FcsMeta = {
  name?: string | null;
  slug?: string | null;
  abbreviation?: string | null;
  mascot?: string | null;
  conference?: string | null;
  division?: string | null;
  classification?: string | null;
  color?: string | null;
  alt_color?: string | null;
  location?: {
    name?: string | null;
    city?: string | null;
    state?: string | null;
    timezone?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    capacity?: number | null;
    year_constructed?: number | null;
    grass?: boolean | null;
    dome?: boolean | null;
  } | null;
} | null;

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
  conference?: string | null;
  classification: string;
  venue?: string | null;
  city?: string | null;
  state?: string | null;
  stats: SeasonStats | null;
}) {
  const { teamName, mascot, conference, classification, venue, city, state, stats } = args;
  const nickname = mascot && mascot !== teamName ? mascot : teamName;
  const conferenceLabel = safeStr(conference);
  const locationParts = [city, state].filter(Boolean).join(", ");
  const seed = Array.from(teamName).reduce(
    (total, char, index) => (total * 31 + char.charCodeAt(0) * (index + 1)) >>> 0,
    0,
  );
  const variant = seed % 12;
  const locationText = venue
    ? `${venue}${locationParts ? ` in ${locationParts}` : ""}`
    : locationParts || "its home setting";
  const venueLines = [
    `${locationText} gives ${teamName} a home reference point for the way the roster wants to play.`,
    `The local piece matters too: ${locationText} ties the program to a specific football community.`,
    `${teamName}'s home context runs through ${locationText}, which helps ground the schedule beyond names and dates.`,
    `Home games point back to ${locationText}, where routine and crowd feel can shape the week.`,
    `${locationText} is the backdrop, but the real read comes from how the team handles the ball and tackles in space.`,
    `${locationText} sets the local frame, while the football read comes from how ${teamName} handles each series.`,
  ];
  const offenseLines =
    stats?.pointsPerGame != null
      ? stats.pointsPerGame >= 32
        ? [
            `${teamName} can bring an aggressive offensive tone, especially when tempo and red-zone execution travel together.`,
            `The offense has enough pace to change the game when the ${nickname} find early rhythm.`,
            `With the ball, ${teamName} is at its most effective when it creates space and turns drives into field-position pressure.`,
          ]
        : stats.pointsPerGame >= 22
          ? [
              `${teamName}'s offense is more practical than flashy, leaning on timing, field position, and avoiding long-yardage traps.`,
              `${teamName} works best on offense when the ${nickname} stay efficient and avoid asking one possession to fix the whole game.`,
              `On offense, patience matters; ${teamName} needs clean sequences more than isolated explosive moments.`,
            ]
          : [
              `${teamName}'s offense has a conservative bend, so execution and possession quality become central themes.`,
              `${teamName} has to earn its way down the field, with tempo and decision-making carrying extra value.`,
              `For the ${nickname}, offensive answers often come from staying organized rather than forcing low-percentage situations.`,
            ]
      : [
          `${teamName}'s offensive identity is still forming around tempo, personnel usage, and how often drives avoid trouble.`,
          `The offensive read starts with structure: spacing, early-down choices, and whether the unit can stay efficient.`,
          `Without a full scoring sample, ${teamName}'s offense is best judged by rhythm, control, and execution habits.`,
        ];
  const defenseLines =
    stats?.pointsAllowedPerGame != null
      ? stats.pointsAllowedPerGame <= 21
        ? [
            `${teamName}'s defense gives the team a physical edge, especially when it can close space and tackle cleanly.`,
            `The defensive group sets a firm tone, turning physicality and assignment discipline into the team's calling card.`,
            `Defense can lead the evaluation here; the ${nickname} have enough structure to keep games organized.`,
          ]
        : stats.pointsAllowedPerGame <= 30
          ? [
              `${teamName} lives in the defensive details: leverage, tackling, and limiting the possession that changes momentum.`,
              `${teamName}'s defense is about more than stops; avoiding sudden swings and forcing patience are just as important.`,
              `Without the ball, the ${nickname} need discipline and clear assignments, especially on late downs.`,
            ]
          : [
              `${teamName}'s defensive picture is more uneven, which makes possession control and special-teams field position more important.`,
              `${teamName} has to find firmer defensive footing when games speed up, particularly after explosive plays or short fields.`,
              `For the ${nickname}, defensive consistency is the piece that can change how the rest of the team is viewed.`,
            ]
      : [
          `The defensive view is built around physicality, communication, and whether the group can repeat sound possessions.`,
          `On defense, the key traits are discipline, pursuit, and how often the unit can finish drives cleanly.`,
          `${teamName}'s defensive identity comes from toughness, leverage, and the ability to avoid extended leaks.`,
        ];
  const identityLines = [
    `${teamName}'s identity starts in the ${conferenceLabel}, where the ${nickname} compete as a ${classification} program.`,
    `The ${nickname} give ${teamName} its football personality inside the ${conferenceLabel}, with ${classification} competition shaping the weekly demands.`,
    `${teamName}'s season view begins with ${conferenceLabel} football and a ${classification} identity, then moves into how the team actually plays.`,
    `For ${teamName}, the ${conferenceLabel} schedule brings the first set of questions: opponent style, ${classification} pace, and roster response.`,
    `${teamName} carries more than an FCS label; the ${nickname}'s league identity matters every week.`,
    `The ${nickname} sit inside the ${conferenceLabel} picture, but ${teamName}'s style has to be judged by execution more than label alone.`,
  ];
  const overallLines =
    stats?.yardsPerGame != null && stats.yardsPerGame >= 380
      ? [
          `${teamName} wants to create movement, stack first downs, and keep opponents reacting instead of settling into comfort.`,
          `When the offense stays efficient, the whole team can play with better field position and more assertive calls.`,
          `For the ${nickname}, the path is control: move the chains, avoid waste, and stay ahead of pressure.`,
        ]
      : stats?.yardsAllowedPerGame != null && stats.yardsAllowedPerGame <= 340
        ? [
            `${teamName}'s cleanest identity is defensive: control space, stay organized, and keep the game from getting stretched.`,
            `The best version of the ${nickname} is measured in toughness and restraint, not just highlight plays.`,
            `${teamName} can change the tone of games when it wins the physical downs.`,
          ]
        : [
            `${teamName} is best understood through week-to-week consistency, player leaders, and how the staff manages the game.`,
            `This is a team view built around tendencies: tempo, discipline, field position, and the way roles settle over time.`,
            `The ${nickname} need the schedule sample to clarify the read, because style can shift depending on opponent and venue.`,
          ];
  const styleOpeners =
    stats?.yardsPerGame != null && stats.yardsPerGame >= 380
      ? [
          `${teamName} can take on an assertive identity when the offense is moving chains and keeping defenses in retreat.`,
          `The ${nickname} have a movement-first feel when tempo, spacing, and first-down execution show up early.`,
          `${teamName}'s cleanest version starts with offensive control and the ability to keep the next snap manageable.`,
        ]
      : stats?.yardsAllowedPerGame != null && stats.yardsAllowedPerGame <= 340
        ? [
            `${teamName}'s team identity can start on defense, where toughness and organization give the roster its clearest shape.`,
            `The ${nickname} are easiest to understand through defensive control when the game turns physical.`,
            `${teamName}'s best football has a defensive spine: tackle, stay organized, and keep the field from opening up.`,
          ]
        : [
            `${teamName} needs consistency because the weekly shape can change with opponent and venue.`,
            `The ${nickname} are still defining their style through tempo, discipline, and how the staff manages each game.`,
            `${teamName}'s football identity is less about one trait and more about how the roster settles into the schedule.`,
          ];
  const categoryPools = {
    identity: identityLines,
    venue: venueLines,
    offense: offenseLines,
    defense: defenseLines,
    overall: overallLines,
    style: styleOpeners,
    schedule: [
      `Each ${teamName} game listed below leads into a matchup page when a deeper read is available.`,
      `The schedule turns this ${nickname} snapshot into opponent-by-opponent matchup context.`,
      `Use the game list to move from ${teamName}'s overview into the available matchup breakdowns.`,
      `Every available schedule link gives ${teamName} a more specific game-level view.`,
      `The opponent list below is where this ${teamName} overview branches into individual matchup pages.`,
      `From the schedule, each available game opens a fuller read on how the ${nickname} line up with that opponent.`,
      `The game list below moves ${teamName} from team context into matchup-specific detail.`,
      `Each available opponent row gives the ${nickname} a clearer game-level lens.`,
      `The schedule is where this ${teamName} overview turns into individual matchup context.`,
      `Open a listed game to see how ${teamName}'s traits carry into that opponent's setup.`,
      `The opponent rows carry this ${nickname} snapshot into specific matchup pages when available.`,
      `When a game page is ready, the schedule links ${teamName}'s overview to that matchup read.`,
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
    return pool[(seed + index * 13 + variant) % pool.length];
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

function ColorSwatch({ value, label }: { value: string | null | undefined; label: string }) {
  const color = normalizeHexColor(value);
  if (!color) return null;
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", marginRight: 10 }}
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
  if (typeof conv !== "number" || typeof att !== "number" || att <= 0) return null;
  return (conv / att) * 100;
}

function clampScore(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function norm01(value: number | null | undefined, min: number, max: number, invert = false) {
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
  { overallMix: { offense: number; defense: number; discipline: number; specialTeams: number }; consistencyBoost: number }
> = {
  regular: { overallMix: { offense: 0.34, defense: 0.3, discipline: 0.2, specialTeams: 0.16 }, consistencyBoost: 0 },
  championship: { overallMix: { offense: 0.31, defense: 0.35, discipline: 0.22, specialTeams: 0.12 }, consistencyBoost: 3 },
  postseason: { overallMix: { offense: 0.28, defense: 0.38, discipline: 0.24, specialTeams: 0.1 }, consistencyBoost: 6 },
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
  const basisGame = completedOrPast[completedOrPast.length - 1] ?? [...schedule].sort(byDateAsc)[0] ?? null;
  if (!basisGame) return "regular";
  const seasonType = String(basisGame.seasonType ?? "").toLowerCase();
  if (seasonType.includes("post")) return "postseason";
  if (typeof basisGame.week === "number" && basisGame.week >= 14) return "championship";
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
  const netReturnYpg = games > 0 && kr != null && pr != null && kro != null && pro != null ? (kr + pr - kro - pro) / games : null;
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
      ? clampScore(overallPieces.reduce((a, b) => a + b.v * b.w, 0) / overallPieces.reduce((a, b) => a + b.w, 0))
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
    Math.min(97, 35 + Math.min(16, Math.max(0, games)) * 2.8 + dataCoverage * 3 + profile.consistencyBoost),
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
  const scoredUnits = unitScores.filter((u) => u.value != null) as { label: string; value: number }[];
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
    (total, char, index) => (total * 31 + char.charCodeAt(0) * (index + 5)) >>> 0,
    0,
  );
  const pick = <T,>(items: T[], offset = 0) => items[(seed + offset) % items.length];
  const topLabel = topUnit?.label.toLowerCase() ?? "overall structure";
  const secondLabel = secondUnit?.label.toLowerCase() ?? "supporting unit play";
  const weakLabel = weakness?.label.toLowerCase() ?? "week-to-week consistency";
  const readShapes = [
    [
      `${teamName} has to be read through the part of the profile that travels best, and right now that starts with ${topLabel}.`,
      `${secondUnit ? `${secondUnit.label} gives the team another stabilizing piece.` : "The rest of the profile is still taking shape around that main point."}`,
      `${weakness ? `${weakness.label} is where the staff would want cleaner answers over a longer sample.` : "There is not one obvious soft spot in the available categories yet."}`,
      `${stats?.turnoverMarginPerGame != null ? "Possession margin helps explain whether the team is making its own job easier or harder." : "Possession detail will matter more as the season file fills in."}`,
    ],
    [
      `The FCS read on ${teamName} is less about one headline and more about how the units fit together.`,
      `${topUnit ? `${topUnit.label} is the area giving the profile its strongest shape.` : "The strongest area is still hard to separate from the rest of the sample."}`,
      `${stats?.penaltyYardsPerGame != null ? "Penalty yardage adds context because hidden yards can change field position quickly at this level." : "Discipline detail will round out the evaluation when it is complete."}`,
      `${weakness ? `${weakness.label} remains the category that can make the team profile feel uneven.` : "The available data keeps the analysis broad for now."}`,
    ],
    [
      `${teamName}'s profile is most useful when it is read like a staff note: identify the reliable unit, then check what can interrupt it.`,
      `${topUnit ? `${topUnit.label} is the reliable piece in the current sample.` : "The reliable piece is still emerging."}`,
      `${secondUnit ? `${secondUnit.label} gives the team some additional support.` : "The next layer will depend on more complete weekly data."}`,
      `${weakness ? `${weakness.label} is the area that needs more consistent answers.` : "No single concern separates clearly from the rest yet."}`,
    ],
    [
      `${teamName}'s FCS profile starts with what can be trusted over multiple series.`,
      `${topUnit ? `${topUnit.label} is the part of the team that currently gives the cleanest answer.` : "That trusted piece is still developing in the available sample."}`,
      `${weakness ? `${weakness.label} is where the review needs to stay honest because it can affect field position and tempo.` : "The main review points are spread across the team rather than sitting in one category."}`,
      `${stats?.thirdDownPct != null ? "Third-down work matters here because it decides whether the offense or defense gets off the field cleanly." : "Third-down data will make the read more specific when it fills in."}`,
    ],
    [
      `A clean read on ${teamName} starts by separating steady habits from one-off results.`,
      `${secondUnit ? `${secondUnit.label} is part of that steady base.` : `${topLabel} is the first place to look for that base.`}`,
      `${stats?.penaltyYardsPerGame != null ? "Penalty yardage helps show whether the team is making the down-and-distance math harder than necessary." : "Discipline detail is still part of the missing context."}`,
      `${weakness ? `${weakness.label} is the category most likely to decide whether a strong series becomes a full-game trait.` : "The profile does not isolate one clear limiter yet."}`,
    ],
  ];
  const read = [
    removeDuplicateSentences(pick(readShapes).join(" ")),
    ...(missingLabels.length > 0 ? [`Incomplete supporting categories: ${missingLabels.join(", ")}.`] : []),
  ];
  const strengthPool = [
    topUnit ? pick([`${topUnit.label} is the strongest current signal`, `${topUnit.label} is the most dependable part of the team read`, `${topUnit.label} gives the profile its clearest starting point`], 3) : null,
    secondUnit ? pick([`${secondUnit.label} gives the profile another useful layer`, `${secondUnit.label} helps support the primary team strength`, `${secondUnit.label} adds a second point of stability`], 5) : null,
    (analysis?.offense ?? 0) >= 70 ? pick(["Offensive production is helping keep possessions on schedule", "The offense is producing enough structure to support the rest of the team", "Offensive efficiency is showing up as a useful weekly trait"], 7) : null,
    (analysis?.defense ?? 0) >= 70 ? pick(["Defensive resistance is a clear part of the team identity", "The defense is keeping the team profile grounded", "Defensive work is limiting easy answers from opponents"], 9) : null,
    (analysis?.discipline ?? 0) >= 70 ? pick(["Discipline is supporting field position and drive quality", "Cleaner penalty habits are helping the weekly profile", "Possession care is keeping avoidable strain down"], 11) : null,
    (analysis?.specialTeams ?? 0) >= 65 ? pick(["Special teams are helping with hidden-yardage control", "The field-position units are adding useful support", "Special teams are keeping the team from losing easy yardage"], 13) : null,
    stats?.turnoverMarginPerGame != null && stats.turnoverMarginPerGame >= 0
      ? "Possession margin is not working against the team profile"
      : null,
    fourthDownPct != null && fourthDownPct >= 55 ? "Short-yardage execution is extending drives" : null,
  ].filter(Boolean) as string[];
  const monitorPool = [
    weakness ? pick([`${weakness.label} needs the closest week-to-week review`, `${weakness.label} is the main category to keep testing`, `${weakness.label} is where the profile can lose some shape`], 15) : null,
    (analysis?.offense ?? 100) < 60 ? pick(["Offensive consistency can tighten up across possessions", "The offense needs more reliable answers on routine downs", "Drive rhythm can flatten when the offense falls behind schedule"], 17) : null,
    (analysis?.defense ?? 100) < 60 ? pick(["Defensive series need more repeatable stops", "The defense needs cleaner exits from long possessions", "Opponent movement can become too comfortable if stops arrive late"], 19) : null,
    (analysis?.discipline ?? 100) < 60 ? pick(["Penalties and possession details can create avoidable strain", "Hidden yardage can make the profile harder to sustain", "Discipline details remain a week-to-week review point"], 21) : null,
    (analysis?.specialTeams ?? 100) < 60 ? pick(["Special teams can still swing field position", "The kicking and return game needs steadier hidden-yardage results", "Field-position exchanges can get away from the team when special teams are uneven"], 23) : null,
    stats?.turnoverMarginPerGame != null && stats.turnoverMarginPerGame < 0
      ? "Turnover margin is adding stress to the profile"
      : null,
    stats?.thirdDownPct != null && stats.thirdDownPct < 36
      ? "Third-down conversion rate can limit drive length"
      : null,
    fourthDownPct != null && fourthDownPct < 45 ? "Fourth-down situations remain a review point" : null,
  ].filter(Boolean) as string[];
  const keyReasons = rotateList(strengthPool.length ? strengthPool : [`${teamName}'s best signals will sharpen with more data`], seed).slice(0, 5);
  const flipFactors = rotateList(monitorPool.length ? monitorPool : ["Additional season data will define the main review points"], seed + 7).slice(0, 3);
  const overall = analysis?.overall ?? null;
  const summaries = [
    overall == null
      ? `${teamName}'s team profile will become clearer as the season sample fills in.`
      : `${teamName} is currently defined most by ${topLabel}, while ${weakLabel} is the detail that still needs regular review.`,
    overall == null
      ? `The current ${teamName} read is still early and should stay tied to available team information.`
      : `The cleanest summary for ${teamName}: ${topLabel} gives the team its foundation, and ${weakLabel} shapes the next layer of review.`,
    overall == null
      ? `${teamName}'s profile is waiting on a fuller set of team data.`
      : `${teamName}'s best team view starts with ${topLabel}; ${secondLabel} and ${weakLabel} explain how complete the profile feels.`,
  ];
  const bottomLine = pick(summaries, 11);

  const coverage = 6 - missingLabels.length;
  return {
    read: read.slice(0, 2),
    keyReasons: keyReasons.slice(0, 5),
    flipFactors: flipFactors.slice(0, 3),
    bottomLine,
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
    .replace(/\([^)]*\)/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function isSameTeam(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  const na = normalizeTeamName(a);
  const nb = normalizeTeamName(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

function rotateList<T>(items: T[], seed: number) {
  if (items.length <= 1) return items;
  const offset = seed % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

export default function FcsTeamPage() {
  const params = useParams<{ team: string }>();
  const search = useSearchParams();
  const slug = params?.team ?? "";
  const from = search.get("from");
  const statsRequestYear = getStatsSeasonYear();
  const scheduleRequestYear = getScheduleSeasonYear();
  shouldAllowPriorSeasonFallback();

  const [meta, setMeta] = useState<FcsMeta>(null);
  const [schedule, setSchedule] = useState<ScheduleGame[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
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
  const teamName = meta?.name ?? slug;

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
          `/api/analysis/fcs/team/${slug}?statsYear=${statsRequestYear}&scheduleYear=${scheduleRequestYear}`,
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
          setMeta((data?.meta ?? null) as FcsMeta);
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
          setMeta(null);
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

  const backHref = useMemo(() => {
    if (from === "by-conference") return "/team-analysis/fcs/by-conference";
    if (from === "by-team") return "/team-analysis/fcs/by-team";
    return "/team-analysis/fcs";
  }, [from]);
  const backLabel = useMemo(() => {
    if (from === "by-conference") return "<- Back to FCS by Conference";
    if (from === "by-team") return "<- Back to FCS by Team";
    return "<- Back to FCS";
  }, [from]);
  const location = meta?.location ?? null;
  const colorProfile = resolveTeamColorProfile({
    slug,
    teamName,
    primary: meta?.color ?? null,
    secondary: meta?.alt_color ?? null,
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

  const teamBadgeText = buildTeamBadgeText(teamName, meta?.abbreviation);
  const teamOverviewText = buildTeamOverviewText({
    teamName,
    mascot: meta?.mascot,
    conference: meta?.conference,
    classification: formatClassificationLabel(meta?.classification, "FCS"),
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
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
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
            FCS team profile with TGEM team context, season production, key players,
            and clickable matchup paths from the schedule.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm text-gray-700 dark:text-gray-300">
            <span className="tgem-surface-subtle rounded-full px-3 py-1">{safeStr(meta?.conference)}</span>
            <span className="tgem-surface-subtle rounded-full px-3 py-1">{formatClassificationLabel(meta?.classification, "FCS")}</span>
          </div>
        </div>
        </div>
        <div className="tgem-surface-subtle min-w-[260px] rounded-2xl p-4">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Team Snapshot</div>
          <div className="mt-3 grid gap-2 text-sm text-gray-700 dark:text-gray-300">
            <div><strong className="text-gray-900 dark:text-gray-100">Team Name:</strong> {safeStr(meta?.mascot)}</div>
            <div><strong className="text-gray-900 dark:text-gray-100">Timezone:</strong> {safeStr(location?.timezone)}</div>
            <div><strong className="text-gray-900 dark:text-gray-100">Stadium:</strong> {safeStr(location?.name)}</div>
            <div><strong className="text-gray-900 dark:text-gray-100">Capacity:</strong> {fmt(location?.capacity ?? null)}</div>
            <div><strong className="text-gray-900 dark:text-gray-100">Grass:</strong> {fmtBool(location?.grass ?? null)}</div>
          </div>
          <div className="mt-4 text-sm font-semibold text-gray-900 dark:text-gray-100">School Colors</div>
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

      <section className="tgem-surface-subtle mt-6 rounded-3xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">TGEM Team Profile</h2>

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
              <span key={flag} className="tgem-surface-subtle rounded-full px-3 py-1 text-xs">
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
      <section className="tgem-surface mt-4 rounded-3xl p-6">
        <div className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">Season Stats ({seasonStatsYear})</div>
        {seasonStatsNote ? (
          <div style={{ marginBottom: 8, color: LEGACY_UI.mutedStrong, fontSize: 13 }}>{seasonStatsNote}</div>
        ) : null}
        {seasonStatsLoading ? (
          <div style={{ color: LEGACY_UI.mutedStrong }}>Loading season stats...</div>
        ) : seasonStatsError ? (
          <div style={{ color: LEGACY_UI.danger }}>Season stats error: {seasonStatsError}</div>
        ) : showPendingSeasonStatsMessage ? (
          <div style={{ color: LEGACY_UI.mutedStrong }}>{buildPendingSeasonMessage(seasonStatsYear)}</div>
        ) : !seasonStats ? (
          <div style={{ color: LEGACY_UI.mutedStrong }}>No season stats available.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, color: LEGACY_UI.text }}>
            <div><strong>Games:</strong> {seasonStats.games ?? "N/A"}</div>
            <div />
            <div><strong>Offense PPG:</strong> {fmtNum(seasonStats.pointsPerGame)}</div>
            <div><strong>Defense PPG Allowed:</strong> {fmtNum(seasonStats.pointsAllowedPerGame)}</div>
            <div><strong>Offense YPG:</strong> {fmtNum(seasonStats.yardsPerGame)}</div>
            <div><strong>Defense YPG Allowed:</strong> {fmtNum(seasonStats.yardsAllowedPerGame)}</div>
            <div><strong>Pass YPG:</strong> {fmtNum(seasonStats.passYardsPerGame)}</div>
            <div><strong>Rush YPG:</strong> {fmtNum(seasonStats.rushYardsPerGame)}</div>
            <div><strong>3rd Down:</strong> {fmtPct(seasonStats.thirdDownPct)}</div>
            {fourthDownPct != null ? (
              <div><strong>4th Down:</strong> {fmtPct(fourthDownPct)}</div>
            ) : (
              <div />
            )}
            <div><strong>Penalties / Game:</strong> {fmtNum(seasonStats.penaltiesPerGame)}</div>
            <div><strong>Penalty Yds / Game:</strong> {fmtNum(seasonStats.penaltyYardsPerGame)}</div>
            <div><strong>Turnover Margin / Game:</strong> {fmtNum(seasonStats.turnoverMarginPerGame)}</div>
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
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Extended Season Totals (CFBD)</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, color: LEGACY_UI.text }}>
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
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Week</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Date</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Matchup</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Venue</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Result</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((g, idx) => {
                const week = g.week ?? "-";
                const dateStr = formatDateTime(g.startDate);
                const matchupText = g.homeTeam && g.awayTeam ? `${g.awayTeam} @ ${g.homeTeam}` : "TBD";
                const rivalryLabel = findRivalryLabel(g.homeTeam, g.awayTeam);
                const opponentName =
                  g.homeTeam?.toLowerCase() === teamName.toLowerCase() ? g.awayTeam : g.homeTeam;
                const matchupHref =
                  g.id != null && slug
                    ? `/team-analysis/fcs/${encodeURIComponent(slug)}/matchup/${encodeURIComponent(String(g.id))}?teamName=${encodeURIComponent(
                        teamName,
                      )}${opponentName ? `&opponentName=${encodeURIComponent(opponentName)}` : ""}`
                    : null;
                const venue = safeStr(g.venue);
                const hasScore = g.homePoints != null && g.awayPoints != null;
                let result = g.completed ? "Final" : "TBD";
                if (hasScore) {
                  const homePoints = g.homePoints!;
                  const awayPoints = g.awayPoints!;
                  const scoreText = `${awayPoints} - ${homePoints}`;
                  const teamIsHome = isSameTeam(teamName, g.homeTeam);
                  const teamIsAway = isSameTeam(teamName, g.awayTeam);
                  let tag: "W" | "L" | "T" | "" = "";
                  if (homePoints === awayPoints) tag = "T";
                  else if (teamIsHome) tag = homePoints > awayPoints ? "W" : "L";
                  else if (teamIsAway) tag = awayPoints > homePoints ? "W" : "L";
                  result = tag ? `${tag} ${scoreText}` : scoreText;
                }
                return (
                  <tr key={String(g.id ?? idx)}>
                    <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{week}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{dateStr}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                        {matchupHref ? (
                          <Link href={matchupHref} style={{ textDecoration: "underline" }}>
                            {matchupText}
                          </Link>
                        ) : (
                          matchupText
                        )}
                        {rivalryLabel ? <InsightBadge tag="rivalry" compact /> : null}
                      </div>
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{venue}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{result}</td>
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



