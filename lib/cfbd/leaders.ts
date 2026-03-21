import { cfbdGetJson } from "@/lib/cfbd/http";

export type LeaderKey =
  | "passing"
  | "rushing"
  | "receiving"
  | "sacks"
  | "interceptions"
  | "fumbleRecoveries"
  | "fieldGoals"
  | "punts";

export type LeaderEntry = {
  key: LeaderKey;
  label: string;
  player: string | null;
  stat: number | null;
  statLabel: string | null;
};

type LeaderConfig = {
  key: LeaderKey;
  label: string;
  categoryHints: string[];
  preferredStatHints: string[];
};

const LEADER_CONFIGS: LeaderConfig[] = [
  { key: "passing", label: "Passing", categoryHints: ["passing", "pass"], preferredStatHints: ["yd", "yard", "pass"] },
  { key: "rushing", label: "Rushing", categoryHints: ["rushing", "rush"], preferredStatHints: ["yd", "yard", "rush"] },
  { key: "receiving", label: "Receiving", categoryHints: ["receiving", "receive"], preferredStatHints: ["yd", "yard", "rec"] },
  { key: "sacks", label: "Sacks", categoryHints: ["sack"], preferredStatHints: ["sack"] },
  { key: "interceptions", label: "Interceptions", categoryHints: ["interception", "defense"], preferredStatHints: ["int", "interception"] },
  { key: "fumbleRecoveries", label: "Fumbles", categoryHints: ["fumble"], preferredStatHints: ["recover"] },
  { key: "fieldGoals", label: "Field Goals", categoryHints: ["field", "kick"], preferredStatHints: ["fg", "field goal", "made"] },
  { key: "punts", label: "Punts", categoryHints: ["punt"], preferredStatHints: ["avg", "yard", "punt"] },
];

function normalize(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getString(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function getNumber(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function prettyStatLabel(s: string) {
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

function teamMatches(rowTeam: string, requestedTeam: string) {
  if (!rowTeam) return true;
  const a = normalize(rowTeam);
  const b = normalize(requestedTeam);
  if (!a || !b) return true;
  return a === b || a.includes(b) || b.includes(a);
}

function detectLeaderConfig(row: Record<string, unknown>): LeaderConfig | null {
  const category = normalize(getString(row, ["category", "statCategory", "group", "statGroup"]));
  const statType = normalize(getString(row, ["statType", "statName", "type", "name"]));
  const combined = `${category} ${statType}`.trim();

  const byCategory = LEADER_CONFIGS.find((cfg) =>
    cfg.categoryHints.some((h) => category.includes(normalize(h))),
  );
  if (byCategory) return byCategory;

  const byCombined = LEADER_CONFIGS.find((cfg) =>
    cfg.categoryHints.some((h) => combined.includes(normalize(h))),
  );
  return byCombined ?? null;
}

export async function fetchTeamPlayerSeasonRows(
  year: number,
  teamName: string,
  apiKey: string,
): Promise<Record<string, unknown>[]> {
  void apiKey;
  const rows = await cfbdGetJson<unknown>(
    "/stats/player/season",
    { year, team: teamName },
    {
      cacheTtlMs: 1000 * 60 * 60 * 12,
      team: teamName,
      mockFactory: () => [],
    },
  );
  return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
}

export function extractLeaders(
  rows: Record<string, unknown>[],
  requestedTeam: string,
): LeaderEntry[] {
  const leadersByKey = new Map<LeaderKey, { player: string; stat: number; statLabel: string; score: number }>();

  for (const row of rows) {
    const cfg = detectLeaderConfig(row);
    if (!cfg) continue;

    const player = getString(row, ["player", "athlete", "name", "statAthlete"]);
    if (!player) continue;

    const rowTeam = getString(row, ["team", "teamName", "school"]);
    if (!teamMatches(rowTeam, requestedTeam)) continue;

    const stat = getNumber(row, ["stat", "statValue", "value", "amount", "yards"]);
    if (stat == null) continue;

    const statType = getString(row, ["statType", "statName", "type", "name"]);
    const statTypeNorm = normalize(statType);
    const preferred = cfg.preferredStatHints.some((h) => statTypeNorm.includes(normalize(h)));
    const score = stat + (preferred ? 1000000 : 0);
    const statLabel = statType ? prettyStatLabel(statType) : "Stat";

    const current = leadersByKey.get(cfg.key);
    if (!current || score > current.score) {
      leadersByKey.set(cfg.key, { player, stat, statLabel, score });
    }
  }

  return LEADER_CONFIGS.map((cfg) => {
    const found = leadersByKey.get(cfg.key);
    return {
      key: cfg.key,
      label: cfg.label,
      player: found?.player ?? null,
      stat: found?.stat ?? null,
      statLabel: found?.statLabel ?? null,
    } satisfies LeaderEntry;
  });
}
