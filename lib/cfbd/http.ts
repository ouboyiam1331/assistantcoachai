import { FBS_TEAMS } from "@/data/fbsTeams";

const CFBD_API_BASE = "https://api.collegefootballdata.com";

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

type RecentEntry = {
  expiresAt: number;
  value: unknown;
};

const responseCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();
const recentResults = new Map<string, RecentEntry>();
type CfbdUsage = {
  key: string;
  endpoint: string;
  team: string;
  requests: number;
  networkCalls: number;
  cacheHits: number;
  recentHits: number;
  inFlightHits: number;
  mockHits: number;
  errors: number;
  lastTs: string;
};
const usageByKey = new Map<string, CfbdUsage>();

function usageKey(endpoint: string, team: string) {
  return `${endpoint}::${team || "*"}`;
}

function touchUsage(endpoint: string, teamRaw: string | null | undefined) {
  const team = String(teamRaw ?? "").trim();
  const key = usageKey(endpoint, team);
  const prev = usageByKey.get(key);
  if (prev) {
    prev.requests += 1;
    prev.lastTs = new Date().toISOString();
    return prev;
  }
  const row: CfbdUsage = {
    key,
    endpoint,
    team,
    requests: 1,
    networkCalls: 0,
    cacheHits: 0,
    recentHits: 0,
    inFlightHits: 0,
    mockHits: 0,
    errors: 0,
    lastTs: new Date().toISOString(),
  };
  usageByKey.set(key, row);
  return row;
}

export function getCfbdUsageSnapshot() {
  const rows = Array.from(usageByKey.values()).sort((a, b) => b.requests - a.requests);
  const totals = rows.reduce(
    (acc, row) => {
      acc.requests += row.requests;
      acc.networkCalls += row.networkCalls;
      acc.cacheHits += row.cacheHits;
      acc.recentHits += row.recentHits;
      acc.inFlightHits += row.inFlightHits;
      acc.mockHits += row.mockHits;
      acc.errors += row.errors;
      return acc;
    },
    {
      requests: 0,
      networkCalls: 0,
      cacheHits: 0,
      recentHits: 0,
      inFlightHits: 0,
      mockHits: 0,
      errors: 0,
    },
  );
  return {
    generatedAt: new Date().toISOString(),
    totals,
    rows,
  };
}

export class CfbdHttpError extends Error {
  status: number;
  detail: string;
  url: string;

  constructor(status: number, detail: string, url: string) {
    super(`CFBD request failed (${status})`);
    this.status = status;
    this.detail = detail;
    this.url = url;
  }
}

export function cfbdMockModeEnabled() {
  const v = String(process.env.USE_MOCK_CFBD ?? "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

type MockQuery = Record<string, string | number | boolean | null | undefined>;

type MockTeam = {
  id: number;
  school: string;
  conference: string;
  abbreviation: string;
  mascot: string;
  classification: "fbs" | "fcs";
  color: string;
  alt_color: string;
  location: {
    name: string;
    city: string;
    state: string;
    timezone: string;
    latitude: number;
    longitude: number;
    capacity: number;
    year_constructed: number;
    grass: boolean;
    dome: boolean;
  };
};

const MOCK_FCS_TEAMS: MockTeam[] = [
  {
    id: 9011,
    school: "Montana",
    conference: "Big Sky",
    abbreviation: "MT",
    mascot: "Grizzlies",
    classification: "fcs",
    color: "#5A0029",
    alt_color: "#C99700",
    location: {
      name: "Washington-Grizzly Stadium",
      city: "Missoula",
      state: "MT",
      timezone: "America/Denver",
      latitude: 46.8622,
      longitude: -113.9834,
      capacity: 25217,
      year_constructed: 1986,
      grass: false,
      dome: false,
    },
  },
  {
    id: 9012,
    school: "North Dakota State",
    conference: "Missouri Valley",
    abbreviation: "NDSU",
    mascot: "Bison",
    classification: "fcs",
    color: "#0B5E3B",
    alt_color: "#F9C400",
    location: {
      name: "Fargodome",
      city: "Fargo",
      state: "ND",
      timezone: "America/Chicago",
      latitude: 46.9048,
      longitude: -96.7997,
      capacity: 19000,
      year_constructed: 1992,
      grass: false,
      dome: true,
    },
  },
  {
    id: 9013,
    school: "South Dakota State",
    conference: "Missouri Valley",
    abbreviation: "SDSU",
    mascot: "Jackrabbits",
    classification: "fcs",
    color: "#003DA5",
    alt_color: "#F1B82D",
    location: {
      name: "Dana J. Dykhouse Stadium",
      city: "Brookings",
      state: "SD",
      timezone: "America/Chicago",
      latitude: 44.3191,
      longitude: -96.7828,
      capacity: 19500,
      year_constructed: 2016,
      grass: false,
      dome: false,
    },
  },
  {
    id: 9014,
    school: "South Dakota",
    conference: "Missouri Valley",
    abbreviation: "USD",
    mascot: "Coyotes",
    classification: "fcs",
    color: "#AA0000",
    alt_color: "#666666",
    location: {
      name: "DakotaDome",
      city: "Vermillion",
      state: "SD",
      timezone: "America/Chicago",
      latitude: 42.7896,
      longitude: -96.9287,
      capacity: 10000,
      year_constructed: 1979,
      grass: false,
      dome: true,
    },
  },
  {
    id: 9015,
    school: "Idaho",
    conference: "Big Sky",
    abbreviation: "UI",
    mascot: "Vandals",
    classification: "fcs",
    color: "#B18E5F",
    alt_color: "#000000",
    location: {
      name: "Kibbie Dome",
      city: "Moscow",
      state: "ID",
      timezone: "America/Los_Angeles",
      latitude: 46.7304,
      longitude: -117.0175,
      capacity: 16000,
      year_constructed: 1971,
      grass: false,
      dome: true,
    },
  },
];

function normalize(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function hashNum(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

function pickFbsMeta(teamName: string): MockTeam {
  const slug =
    FBS_TEAMS.find((t) => normalize(t.name) === normalize(teamName))?.slug ??
    teamName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const team = FBS_TEAMS.find((t) => t.slug === slug);
  const base = hashNum(slug);
  return {
    id: 1000 + (base % 5000),
    school: team?.name ?? teamName,
    conference: team?.conference ?? "FBS",
    abbreviation:
      (team?.name ?? teamName)
        .split(" ")
        .slice(0, 2)
        .map((x) => x[0]?.toUpperCase() ?? "")
        .join("") || "FB",
    mascot: "Football",
    classification: "fbs",
    color: "#0B3D91",
    alt_color: "#C8102E",
    location: {
      name: `${team?.name ?? teamName} Stadium`,
      city: "College Town",
      state: "USA",
      timezone: "America/Chicago",
      latitude: 39.5,
      longitude: -98.35,
      capacity: 52000 + (base % 30000),
      year_constructed: 1950 + (base % 70),
      grass: base % 2 === 0,
      dome: false,
    },
  };
}

function resolveMockTeamByName(teamName: string) {
  const key = normalize(teamName);
  const fcs =
    MOCK_FCS_TEAMS.find((t) => normalize(t.school) === key) ??
    MOCK_FCS_TEAMS.find((t) => key.includes(normalize(t.school)));
  if (fcs) return fcs;
  return pickFbsMeta(teamName);
}

function makeGameId(team: string, idx: number) {
  return 800000 + (hashNum(`${team}:${idx}`) % 90000);
}

function buildMockGames(teamName: string, year: number) {
  const team = resolveMockTeamByName(teamName);
  const opps =
    team.classification === "fcs"
      ? ["Montana State", "UC Davis", "Idaho", "South Dakota State", "North Dakota State", "South Dakota", "Villanova", "Furman"]
      : ["Georgia", "LSU", "Tennessee", "Auburn", "Florida", "Ole Miss", "Texas", "Notre Dame"];
  return opps.map((opp, i) => {
    const week = i + 1;
    const home = i % 2 === 0 ? team.school : opp;
    const away = i % 2 === 0 ? opp : team.school;
    const homePoints = 20 + ((hashNum(`${team.school}:${opp}:h`) + i) % 25);
    const awayPoints = 17 + ((hashNum(`${team.school}:${opp}:a`) + i) % 24);
    return {
      id: makeGameId(team.school, i + 1),
      season: year,
      week,
      seasonType: week >= 14 ? "postseason" : "regular",
      startDate: new Date(Date.UTC(year, 8, 1 + i * 7, 19, 0, 0)).toISOString(),
      completed: true,
      neutralSite: false,
      conferenceGame: i > 1,
      venue: i % 2 === 0 ? team.location.name : `${opp} Stadium`,
      homeTeam: home,
      awayTeam: away,
      homePoints,
      awayPoints,
      teams: [
        {
          school: home,
          points: homePoints,
          stats: [
            { category: "total Yards", stat: String(320 + ((i * 17) % 140)) },
            { category: "passing Yards", stat: String(180 + ((i * 13) % 120)) },
            { category: "rushing Yards", stat: String(110 + ((i * 9) % 90)) },
            { category: "third Down Conv", stat: `${5 + (i % 6)}-${11 + (i % 5)}` },
            { category: "red zone", stat: `${2 + (i % 3)}-${3 + (i % 3)}` },
            { category: "turnovers", stat: String(i % 3) },
            { category: "penalties", stat: String(4 + (i % 5)) },
            { category: "penalty Yards", stat: String(35 + (i % 6) * 8) },
          ],
        },
        {
          school: away,
          points: awayPoints,
          stats: [
            { category: "total Yards", stat: String(300 + ((i * 11) % 150)) },
            { category: "passing Yards", stat: String(160 + ((i * 7) % 140)) },
            { category: "rushing Yards", stat: String(105 + ((i * 10) % 95)) },
            { category: "third Down Conv", stat: `${4 + (i % 5)}-${12 + (i % 4)}` },
            { category: "red zone", stat: `${1 + (i % 3)}-${3 + (i % 3)}` },
            { category: "turnovers", stat: String((i + 1) % 3) },
            { category: "penalties", stat: String(5 + (i % 4)) },
            { category: "penalty Yards", stat: String(42 + (i % 6) * 7) },
          ],
        },
      ],
    };
  });
}

function buildMockStatsSeason(teamName: string, year: number) {
  const games = buildMockGames(teamName, year);
  const penalties = games.length * 5;
  const penaltyYards = games.length * 48;
  return [
    { statName: "Penalties", statValue: penalties },
    { statName: "Penalty Yards", statValue: penaltyYards },
    { statName: "Red Zone", statValue: "34-41" },
    { statName: "Fourth Downs", statValue: 19 },
    { statName: "Fourth Down Conversions", statValue: 12 },
    { statName: "Kick Return Yards", statValue: 420 },
    { statName: "Punt Return Yards", statValue: 165 },
    { statName: "Kick Return Yards Opponent", statValue: 355 },
    { statName: "Punt Return Yards Opponent", statValue: 128 },
    { statName: "Kick Return TDs", statValue: 1 },
    { statName: "Punt Return TDs", statValue: 1 },
  ];
}

function buildMockLeaders(teamName: string) {
  const base = hashNum(teamName);
  const player = (label: string, off: number) => `${teamName} ${label} ${String.fromCharCode(65 + ((base + off) % 26))}.`;
  return [
    { category: "Passing", statType: "Passing Yards", player: player("QB", 1), team: teamName, stat: 3150 },
    { category: "Rushing", statType: "Rushing Yards", player: player("RB", 2), team: teamName, stat: 1120 },
    { category: "Receiving", statType: "Receiving Yards", player: player("WR", 3), team: teamName, stat: 980 },
    { category: "Defense", statType: "Sacks", player: player("EDGE", 4), team: teamName, stat: 11 },
    { category: "Defense", statType: "Interceptions", player: player("DB", 5), team: teamName, stat: 5 },
    { category: "Fumbles", statType: "Fumble Recoveries", player: player("LB", 6), team: teamName, stat: 3 },
    { category: "Kicking", statType: "Field Goals Made", player: player("K", 7), team: teamName, stat: 18 },
    { category: "Punting", statType: "Punt Average", player: player("P", 8), team: teamName, stat: 43.7 },
  ];
}

function readQueryTeam(query: MockQuery) {
  return String(query.team ?? "").trim();
}

function readQueryYear(query: MockQuery) {
  const y = Number(query.year ?? 2025);
  return Number.isFinite(y) ? y : 2025;
}

function buildMockResponse(path: string, query: MockQuery): unknown {
  const teamName = readQueryTeam(query);
  const year = readQueryYear(query);

  if (path === "/teams/fbs") {
    return FBS_TEAMS.map((t, i) => ({
      id: 100 + i,
      school: t.name,
      conference: t.conference,
      classification: "fbs",
      abbreviation: t.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 4)
        .toUpperCase(),
      mascot: "Football",
      color: "#0B3D91",
      alt_color: "#C8102E",
      location: pickFbsMeta(t.name).location,
    }));
  }

  if (path === "/teams" && String(query.classification ?? "").toLowerCase() === "fcs") {
    return MOCK_FCS_TEAMS;
  }

  if (path === "/games") {
    const id = Number(query.id);
    if (Number.isFinite(id)) {
      const all = teamName ? buildMockGames(teamName, year) : buildMockGames("Alabama", year);
      return [all.find((g) => g.id === id) ?? all[0]];
    }
    return buildMockGames(teamName || "Alabama", year);
  }

  if (path === "/games/teams") {
    return buildMockGames(teamName || "Alabama", year).map((g) => ({
      id: g.id,
      season: g.season,
      week: g.week,
      teams: g.teams,
    }));
  }

  if (path === "/stats/season") {
    return buildMockStatsSeason(teamName || "Alabama", year);
  }

  if (path === "/stats/player/season") {
    return buildMockLeaders(teamName || "Alabama");
  }

  return [];
}

function buildUrl(path: string, query: Record<string, string | number | boolean | null | undefined>) {
  const u = new URL(`${CFBD_API_BASE}${path}`);
  for (const [k, v] of Object.entries(query)) {
    if (v === null || v === undefined) continue;
    u.searchParams.set(k, String(v));
  }
  return u.toString();
}

export async function cfbdGetJson<T>(
  path: string,
  query: Record<string, string | number | boolean | null | undefined>,
  opts: {
    cacheTtlMs: number;
    team?: string | null;
    dedupeMs?: number;
    mockFactory?: () => T;
  },
): Promise<T> {
  const dedupeMs = opts.dedupeMs ?? 5000;
  const url = buildUrl(path, query);
  const key = url;
  const now = Date.now();
  const usage = touchUsage(path, opts.team);

  if (cfbdMockModeEnabled()) {
    usage.mockHits += 1;
    console.info(`[CFBD] mock ts=${new Date().toISOString()} endpoint=${path} team=${opts.team ?? ""}`);
    const external = opts.mockFactory ? opts.mockFactory() : null;
    if (Array.isArray(external) && external.length > 0) {
      return external as T;
    }
    if (external && !Array.isArray(external) && typeof external === "object") {
      return external as T;
    }
    return buildMockResponse(path, query) as T;
  }

  const cached = responseCache.get(key);
  if (cached && cached.expiresAt > now) {
    usage.cacheHits += 1;
    return cached.value as T;
  }

  const recent = recentResults.get(key);
  if (recent && recent.expiresAt > now) {
    usage.recentHits += 1;
    return recent.value as T;
  }

  const pending = inFlight.get(key);
  if (pending) {
    usage.inFlightHits += 1;
    return (await pending) as T;
  }

  const apiKey = process.env.CFBD_API_KEY;
  if (!apiKey) {
    throw new Error("CFBD_API_KEY not configured");
  }

  const reqPromise = (async () => {
    usage.networkCalls += 1;
    console.info(
      `[CFBD] request ts=${new Date().toISOString()} endpoint=${path} team=${opts.team ?? ""}`,
    );
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });

    if (!res.ok) {
      usage.errors += 1;
      const detail = (await res.text()).slice(0, 1000);
      throw new CfbdHttpError(res.status, detail, url);
    }

    const value: unknown = await res.json();
    const nowDone = Date.now();
    responseCache.set(key, { value, expiresAt: nowDone + opts.cacheTtlMs });
    recentResults.set(key, { value, expiresAt: nowDone + dedupeMs });
    return value;
  })();

  inFlight.set(key, reqPromise);
  try {
    return (await reqPromise) as T;
  } finally {
    inFlight.delete(key);
  }
}
