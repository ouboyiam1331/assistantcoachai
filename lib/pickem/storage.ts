import type { MatchupAnalysis } from "@/lib/contracts/matchupAnalysis";
import type { SlateSchema, SlateUserPick } from "@/lib/contracts/slate";
import { LeagueKey } from "@/lib/leagues/config";

export type PickChoice = "home" | "away" | null;

export type SlateGame = {
  id: string;
  startDate: string | null;
  homeTeam: string | null;
  awayTeam: string | null;
  venue: string | null;
  neutralSite: boolean;
  completed: boolean;
  homePoints: number | null;
  awayPoints: number | null;
};

export type GameSuggestion = {
  pick: Exclude<PickChoice, null>;
  confidence: number | null;
  lean: "HOME" | "AWAY" | string | null;
  reasons: string[];
  updatedAt: string;
};

export type SlateRecord = {
  wins: number;
  losses: number;
  pushes: number;
  pending: number;
};

export type PickemMode = "college" | "nfl";
export type PickemEntryMode = "auto" | "manual";
export type PickemPhase = "regular" | "championship" | "postseason";

export type PickemSlate = SlateSchema & {
  // normalized fields
  slateId: string;
  name: string;
  league: LeagueKey;
  weekOrRound: string;
  matchups: SlateSchema["matchups"];
  userPicks: SlateUserPick[];
  analysis: MatchupAnalysis[];
  createdBy: string;

  // backward-compatible fields
  id: string;
  slateName: string;
  week: number;
  mode: PickemMode;
  entryMode: PickemEntryMode;
  phase: PickemPhase;
  picks: Record<string, PickChoice>;
  suggestions: Record<string, GameSuggestion>;
  games: SlateGame[];
  record: SlateRecord;
};

const KEY = "assistantcoachai_pickem_slates_v3";
const LAST_SYNC_KEY = "assistantcoachai_pickem_last_sync_ms_v1";
const MIN_SYNC_GAP_MS = 90_000;
const AUTO_SYNC_MS = 300_000;

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function modeToLeague(mode: PickemMode): LeagueKey {
  if (mode === "nfl") return LeagueKey.NFL;
  return LeagueKey.FBS;
}

function leagueToMode(league: LeagueKey): PickemMode {
  if (league === LeagueKey.NFL) return "nfl";
  return "college";
}

function derivePhaseFromWeek(week: number): PickemPhase {
  if (week >= 16) return "postseason";
  if (week >= 14) return "championship";
  return "regular";
}

function picksMapToArray(picks: Record<string, PickChoice>): SlateUserPick[] {
  const now = new Date().toISOString();
  return Object.entries(picks)
    .filter(([, pick]) => pick != null)
    .map(([matchupId, pick]) => ({ matchupId, pick, updatedAt: now }));
}

function gamesToMatchups(games: SlateGame[]) {
  return games.map((g) => ({
    matchupId: g.id,
    gameId: g.id,
    startDate: g.startDate,
    homeTeamId: (g.homeTeam ?? "home").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    awayTeamId: (g.awayTeam ?? "away").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    homeTeamName: g.homeTeam,
    awayTeamName: g.awayTeam,
    venue: g.venue,
    neutralSite: g.neutralSite,
    completed: g.completed,
    homePoints: g.homePoints,
    awayPoints: g.awayPoints,
  }));
}

function normalizeSlate(raw: Partial<PickemSlate>): PickemSlate | null {
  const id = raw.id ?? raw.slateId;
  if (!id) return null;

  const mode: PickemMode = raw.mode === "nfl" ? "nfl" : "college";
  const entryMode: PickemEntryMode =
    raw.entryMode === "manual" ? "manual" : "auto";
  const league = raw.league ?? modeToLeague(mode);
  const weekNum = typeof raw.week === "number" ? raw.week : Number(raw.weekOrRound ?? 1) || 1;
  const phase: PickemPhase =
    raw.phase === "postseason" || raw.phase === "championship" || raw.phase === "regular"
      ? raw.phase
      : derivePhaseFromWeek(weekNum);
  const games = Array.isArray(raw.games) ? raw.games : [];
  const picks = raw.picks ?? {};
  const suggestions = raw.suggestions ?? {};

  const createdAt = raw.createdAt ?? new Date().toISOString();
  const updatedAt = raw.updatedAt ?? createdAt;

  return {
    slateId: String(raw.slateId ?? id),
    name: String(raw.name ?? raw.slateName ?? "New Slate"),
    league,
    season: Number(raw.season ?? 2025),
    weekOrRound: String(raw.weekOrRound ?? weekNum),
    createdBy: String(raw.createdBy ?? "local-dev"),
    createdAt,
    updatedAt,
    locked: Boolean(raw.locked),
    matchups: Array.isArray(raw.matchups) ? raw.matchups : gamesToMatchups(games),
    userPicks: Array.isArray(raw.userPicks) ? raw.userPicks : picksMapToArray(picks),
    analysis: Array.isArray(raw.analysis) ? raw.analysis : [],

    id: String(id),
    slateName: String(raw.slateName ?? raw.name ?? "New Slate"),
    week: weekNum,
    mode: raw.mode ?? leagueToMode(league),
    entryMode,
    phase,
    picks,
    suggestions,
    games,
    record: raw.record ?? { wins: 0, losses: 0, pushes: 0, pending: 0 },
  };
}

function safeParse(raw: string | null): PickemSlate[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => normalizeSlate(x as Partial<PickemSlate>))
      .filter((x): x is PickemSlate => Boolean(x));
  } catch {
    return [];
  }
}

export function listSlates(): PickemSlate[] {
  if (!canUseStorage()) return [];
  const arr = safeParse(window.localStorage.getItem(KEY));
  return [...arr].sort((a, b) => {
    const da = new Date(a.updatedAt).getTime() || 0;
    const db = new Date(b.updatedAt).getTime() || 0;
    return db - da;
  });
}

export function getSlate(id: string): PickemSlate | null {
  if (!id) return null;
  return listSlates().find((s) => s.id === id || s.slateId === id) ?? null;
}

export function saveSlate(slate: PickemSlate) {
  if (!canUseStorage()) return;
  const normalized = normalizeSlate(slate);
  if (!normalized) return;
  const all = listSlates().filter((s) => s.id !== normalized.id && s.slateId !== normalized.slateId);
  all.unshift(normalized);
  window.localStorage.setItem(KEY, JSON.stringify(all));
}

export function upsertSlate(
  id: string,
  patch: Partial<PickemSlate>,
  createIfMissing?: Omit<PickemSlate, "id">,
) {
  if (!canUseStorage()) return null;
  const existing = getSlate(id);
  const now = new Date().toISOString();

  if (!existing && !createIfMissing) return null;

  const nextRaw: Partial<PickemSlate> = existing
    ? { ...existing, ...patch, updatedAt: now }
    : {
        id,
        ...(createIfMissing as Omit<PickemSlate, "id">),
        updatedAt: now,
      };

  const next = normalizeSlate(nextRaw);
  if (!next) return null;

  if (patch.games) next.matchups = gamesToMatchups(patch.games);
  if (patch.picks) next.userPicks = picksMapToArray(patch.picks);

  saveSlate(next);
  return next;
}

export function createSlate(input: {
  slateName: string;
  season: number;
  week?: number;
  weekOrRound?: string;
  mode?: PickemMode;
  entryMode?: PickemEntryMode;
  phase?: PickemPhase;
  league?: LeagueKey;
  createdBy?: string;
}) {
  const id = `slate_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const league = input.league ?? (input.mode ? modeToLeague(input.mode) : LeagueKey.FBS);
  const mode = input.mode ?? leagueToMode(league);
  const weekNum = input.week ?? (Number(input.weekOrRound ?? "1") || 1);
  const weekOrRound = input.weekOrRound ?? String(weekNum);

  const slate = normalizeSlate({
    id,
    slateId: id,
    name: input.slateName,
    slateName: input.slateName,
    league,
    mode,
    season: input.season,
    week: weekNum,
    weekOrRound,
    entryMode: input.entryMode ?? "auto",
    phase: input.phase ?? derivePhaseFromWeek(weekNum),
    createdBy: input.createdBy ?? "local-dev",
    createdAt: now,
    updatedAt: now,
    locked: false,
    picks: {},
    suggestions: {},
    games: [],
    record: { wins: 0, losses: 0, pushes: 0, pending: 0 },
    analysis: [],
    matchups: [],
    userPicks: [],
  });

  if (!slate) throw new Error("Failed to create slate");
  saveSlate(slate);
  return slate;
}

type WeekGame = {
  id?: number;
  startDate?: string | null;
  homeTeam?: string | null;
  awayTeam?: string | null;
  venue?: string | null;
  neutralSite?: boolean | null;
  completed?: boolean | null;
  homePoints?: number | null;
  awayPoints?: number | null;
};

function parseDate(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toSlateGame(g: WeekGame, idx: number): SlateGame {
  const hasScore = g.homePoints != null && g.awayPoints != null;
  return {
    id: String(g.id ?? idx),
    startDate: g.startDate ?? null,
    homeTeam: g.homeTeam ?? null,
    awayTeam: g.awayTeam ?? null,
    venue: g.venue ?? null,
    neutralSite: !!g.neutralSite,
    completed: Boolean(g.completed || hasScore),
    homePoints: g.homePoints ?? null,
    awayPoints: g.awayPoints ?? null,
  };
}

function gradeRecord(games: SlateGame[], picks: Record<string, PickChoice>): SlateRecord {
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let pending = 0;

  for (const g of games) {
    const pick = picks[g.id] ?? null;
    if (!pick) continue;

    const hasScore = g.homePoints != null && g.awayPoints != null;
    if (!hasScore) {
      pending += 1;
      continue;
    }

    const homePoints = g.homePoints!;
    const awayPoints = g.awayPoints!;

    if (homePoints === awayPoints) {
      pushes += 1;
      continue;
    }

    const winner: PickChoice = homePoints > awayPoints ? "home" : "away";
    if (winner === pick) wins += 1;
    else losses += 1;
  }

  return { wins, losses, pushes, pending };
}

function sameRecord(a: SlateRecord, b: SlateRecord) {
  return (
    a.wins === b.wins &&
    a.losses === b.losses &&
    a.pushes === b.pushes &&
    a.pending === b.pending
  );
}

function deriveSeasonType(phase: PickemPhase): "regular" | "postseason" {
  return phase === "postseason" ? "postseason" : "regular";
}

async function fetchWeekGames(
  season: number,
  week: number,
  seasonType: "regular" | "postseason",
): Promise<SlateGame[]> {
  const res = await fetch(
    `/api/cfbd/fbs/week-games?year=${encodeURIComponent(String(season))}&week=${encodeURIComponent(
      String(week),
    )}&seasonType=${seasonType}`,
    { cache: "no-store" },
  );
  const data = await res.json();
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error ?? `week-games failed (${res.status})`);
  }

  const rows = Array.isArray(data?.games) ? (data.games as WeekGame[]) : [];
  rows.sort((a, b) => {
    const da = parseDate(a.startDate)?.getTime() ?? Number.POSITIVE_INFINITY;
    const db = parseDate(b.startDate)?.getTime() ?? Number.POSITIVE_INFINITY;
    return da - db;
  });
  return rows.map((g, i) => toSlateGame(g, i));
}

export async function syncFbsSlatesFromApi(options?: { force?: boolean }) {
  if (!canUseStorage()) {
    return { checked: 0, updated: 0, errors: [] as string[], skipped: true };
  }

  const force = options?.force === true;
  const now = Date.now();
  if (!force) {
    const lastSyncMs = Number(window.localStorage.getItem(LAST_SYNC_KEY) ?? "0");
    if (Number.isFinite(lastSyncMs) && now - lastSyncMs < MIN_SYNC_GAP_MS) {
      return { checked: 0, updated: 0, errors: [] as string[], skipped: true };
    }
  }

  const slates = listSlates().filter(
    (s) => s.mode === "college" && (s.entryMode ?? "auto") === "auto",
  );
  if (slates.length === 0) {
    window.localStorage.setItem(LAST_SYNC_KEY, String(now));
    return { checked: 0, updated: 0, errors: [] as string[], skipped: false };
  }

  const groups = new Map<string, PickemSlate[]>();
  for (const s of slates) {
    const phase = s.phase ?? derivePhaseFromWeek(s.week);
    const seasonType = deriveSeasonType(phase);
    const key = `${s.season}:${s.week}:${phase}:${seasonType}`;
    const arr = groups.get(key) ?? [];
    arr.push(s);
    groups.set(key, arr);
  }

  let checked = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const [key, groupSlates] of groups.entries()) {
    const [seasonRaw, weekRaw, , seasonTypeRaw] = key.split(":");
    const season = Number(seasonRaw);
    const week = Number(weekRaw);
    const seasonType = seasonTypeRaw === "postseason" ? "postseason" : "regular";

    try {
      const latestGames = await fetchWeekGames(season, week, seasonType);

      for (const slate of groupSlates) {
        checked += 1;
        const nextRecord = gradeRecord(latestGames, slate.picks ?? {});
        const gamesChanged = JSON.stringify(slate.games ?? []) !== JSON.stringify(latestGames);
        const recordChanged = !sameRecord(
          slate.record ?? { wins: 0, losses: 0, pushes: 0, pending: 0 },
          nextRecord,
        );

        if (gamesChanged || recordChanged) {
          upsertSlate(slate.id, {
            games: latestGames,
            record: nextRecord,
          });
          updated += 1;
        }
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown sync error";
      errors.push(`${key}: ${message}`);
      checked += groupSlates.length;
    }
  }

  window.localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
  return { checked, updated, errors, skipped: false };
}

export { AUTO_SYNC_MS };

