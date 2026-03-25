// Centralized slug/name -> CFBD team name resolver
// CFBD expects official team/school names (e.g., "Miami", not necessarily "Miami (FL)")
import { FBS_TEAMS } from "@/data/fbsTeams";

const CFBD_TEAM_ALIASES: Record<string, string> = {
  // IMPORTANT: CFBD uses "Miami" for the ACC Miami (Florida)
  "miami-fl": "Miami",

  // The Ohio one typically carries the tag
  "miami-oh": "Miami (OH)",

  // Abbreviations CFBD uses uppercase
  ucf: "UCF",
  utsa: "UTSA",
  ucla: "UCLA",
  usc: "USC",
  lsu: "LSU",
  smu: "SMU",
  tcu: "TCU",
  byu: "BYU",
  umass: "Massachusetts",
  massachusetts: "Massachusetts",

  // Common hyphen slugs
  "ohio-state": "Ohio State",
  "michigan-state": "Michigan State",
  cal: "California",
  pitt: "Pittsburgh",
  fiu: "Florida International",
  "louisiana-monroe": "UL Monroe",
  "san-jose-state": "San José State",
  hawaii: "Hawai'i",
};

const FBS_TEAM_BY_SLUG = new Map(
  FBS_TEAMS.map((team) => [team.slug.toLowerCase(), team.name]),
);

const FBS_TEAM_BY_NAME = new Map(
  FBS_TEAMS.map((team) => [team.name.toLowerCase(), team.name]),
);

export function resolveCfbdTeamName(teamSlugOrName: string) {
  const raw = String(teamSlugOrName || "").trim();
  if (!raw) return "";

  const key = raw.toLowerCase();

  if (CFBD_TEAM_ALIASES[key]) return CFBD_TEAM_ALIASES[key];

  const fromSlug = FBS_TEAM_BY_SLUG.get(key);
  if (fromSlug) return fromSlug;

  const fromName = FBS_TEAM_BY_NAME.get(key);
  if (fromName) return fromName;

  // If caller already passed something like "Miami (OH)", keep it
  if (raw.includes("(") && raw.includes(")")) return raw;

  // Slug -> Title Case guess
  if (raw.includes("-")) {
    return raw
      .split("-")
      .filter(Boolean)
      .map((w) => w[0]!.toUpperCase() + w.slice(1))
      .join(" ");
  }

  return raw;
}
