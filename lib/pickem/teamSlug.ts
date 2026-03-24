import { FBS_TEAMS } from "@/data/fbsTeams";

function normalizeTeamKey(input: string) {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

const EXPLICIT_ALIASES: Record<string, string> = {
  miami: "miami-fl",
  miamioh: "miami-oh",
  massachusetts: "umass",
  california: "cal",
  pittsburgh: "pitt",
  floridainternational: "fiu",
  ulmonroe: "louisiana-monroe",
  louisianamonroe: "louisiana-monroe",
  louisianalafayette: "louisiana",
  ullafayette: "louisiana",
  appalachianstate: "app-state",
  southernmethodist: "smu",
  brighamyoung: "byu",
  southerncalifornia: "usc",
  nevadalasvegas: "unlv",
  texaselpaso: "utep",
  texassanantonio: "utsa",
  alabamabirmingham: "uab",
  connecticut: "uconn",
  southernmississippi: "southern-miss",
  middletennesseestate: "middle-tennessee",
  texasam: "texas-am",
  texasaandm: "texas-am",
};

// Non-FBS canonical names for CFBD calls (used in FBS vs FCS matchups on Pick'em slates).
const NON_FBS_NAME_ALIASES: Record<string, string> = {
  "bethune-cookman": "Bethune-Cookman",
  bethunecookman: "Bethune-Cookman",
  idaho: "Idaho",
  "long-island-university": "LIU",
  longislanduniversity: "LIU",
  liu: "LIU",
  youngstownstate: "Youngstown State",
  furman: "Furman",
  "austin-peay": "Austin Peay",
  austinpeay: "Austin Peay",
  abilenechristian: "Abilene Christian",
  nicholls: "Nicholls",
  morganstate: "Morgan State",
  newhampshire: "New Hampshire",
  vmi: "VMI",
  virginiamilitaryinstitute: "VMI",
  howard: "Howard",
  southdakotastate: "South Dakota State",
  portlandstate: "Portland State",
  idahostate: "Idaho State",
  "the-citadel": "The Citadel",
  thecitadel: "The Citadel",
  towson: "Towson",
  rhodeisland: "Rhode Island",
  "ut-rio-grande-valley": "UT Rio Grande Valley",
  utriograndevalley: "UT Rio Grande Valley",
  bryant: "Bryant",
};

const TEAM_NAME_TO_SLUG = new Map<string, string>();

for (const team of FBS_TEAMS) {
  TEAM_NAME_TO_SLUG.set(normalizeTeamKey(team.name), team.slug);
  TEAM_NAME_TO_SLUG.set(normalizeTeamKey(team.slug), team.slug);
}

for (const [alias, slug] of Object.entries(EXPLICIT_ALIASES)) {
  TEAM_NAME_TO_SLUG.set(normalizeTeamKey(alias), slug);
}

export function findFbsSlugByTeamName(teamNameRaw: string | null | undefined) {
  if (!teamNameRaw) return "";
  const directKey = normalizeTeamKey(teamNameRaw);
  const direct = TEAM_NAME_TO_SLUG.get(directKey);
  if (direct) return direct;

  for (const [key, slug] of TEAM_NAME_TO_SLUG.entries()) {
    if (directKey.includes(key) || key.includes(directKey)) return slug;
  }

  return "";
}

export type PickemTeamIdentity = {
  token: string;
  isFbs: boolean;
};

export function resolvePickemTeamIdentity(teamNameRaw: string | null | undefined): PickemTeamIdentity {
  const raw = String(teamNameRaw ?? "").trim();
  if (!raw) return { token: "", isFbs: false };

  const fbsSlug = findFbsSlugByTeamName(raw);
  if (fbsSlug) return { token: fbsSlug, isFbs: true };

  const key = normalizeTeamKey(raw);
  const nonFbs = NON_FBS_NAME_ALIASES[key];
  if (nonFbs) return { token: nonFbs, isFbs: false };

  // Fallback: pass cleaned display-like name through to API resolver.
  const fallback = raw.replace(/\s+/g, " ").trim();
  return { token: fallback, isFbs: false };
}
