// scripts/generateTeamMeta.mjs
// Generates data/teamMeta.ts keyed by OUR app slugs from data/fbsTeams.ts
// Requires: CFBD_API_KEY, CFBD_YEAR (optional, default 2025)

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

const API_BASE = "https://api.collegefootballdata.com";
const YEAR = Number(process.env.CFBD_YEAR || 2025);

function requireApiKey() {
  const key = process.env.CFBD_API_KEY;
  if (!key || key.trim().length < 10) {
    console.error("\n❌ CFBD_API_KEY not found.");
    console.error('Set it like:  $env:CFBD_API_KEY="YOUR_KEY"\n');
    process.exit(1);
  }
  return key.trim();
}

async function fetchJson(url, apiKey) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed ${res.status} ${res.statusText}\n${text}`);
  }
  return res.json();
}

function normalizeName(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[’']/g, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Some schools differ between CFBD and how people type them.
// This is NOT guessing—this is a deterministic mapping layer.
const NAME_ALIASES = {
  // app display -> CFBD name
  "Miami (FL)": "Miami",
  Pitt: "Pittsburgh",
  "Texas A&M": "Texas A&M",
  "San José State": "San Jose State",
  "UMass": "Massachusetts",
  "App State": "Appalachian State",
  USC: "Southern California",
  "Ole Miss": "Mississippi",
  LSU: "Louisiana State",
};

function tsEscape(str) {
  return String(str ?? "").replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
}

async function loadFbsTeams() {
  // Import your TS module at runtime (works in Node when using file URL)
  const fbsTeamsPath = path.join(process.cwd(), "data", "fbsTeams.ts");
  const mod = await import(pathToFileURL(fbsTeamsPath).href);
  // Support either named or default export patterns
  const list = mod.FBS_TEAMS ?? mod.default ?? [];
  if (!Array.isArray(list) || list.length < 100) {
    throw new Error("Could not load FBS_TEAMS from data/fbsTeams.ts");
  }
  return list;
}

async function main() {
  const apiKey = requireApiKey();
  const fbsTeams = await loadFbsTeams();

  console.log(`📥 Fetching CFBD FBS teams for year ${YEAR}...`);
  const cfbdTeams = await fetchJson(`${API_BASE}/teams/fbs?year=${YEAR}`, apiKey);

  // Build lookup by normalized name
  const cfbdByName = new Map();
  for (const t of cfbdTeams) {
    const school = t.school ?? t.name ?? "";
    if (!school) continue;
    cfbdByName.set(normalizeName(school), t);
  }

  // Build TEAM_META keyed by OUR slugs
  const TEAM_META = {};
  let matched = 0;
  const missing = [];

  for (const t of fbsTeams) {
    const appSlug = t.slug;
    const appName = t.name;

    const cfbdName = NAME_ALIASES[appName] ?? appName;
    const key = normalizeName(cfbdName);
    const cfbd = cfbdByName.get(key);

    if (!cfbd) {
      missing.push({ appName, appSlug, wanted: cfbdName });
      continue;
    }

    matched++;

    TEAM_META[appSlug] = {
      name: cfbd.school ?? cfbd.name ?? appName,
      slug: appSlug, // OUR slug
      abbreviation: cfbd.abbreviation ?? null,
      mascot: cfbd.mascot ?? null,
      conference: cfbd.conference ?? t.conference ?? "Unknown Conference",
      division: cfbd.division ?? null,
      classification: cfbd.classification ?? "FBS",
      color: cfbd.color ?? null,
      alt_color: cfbd.alt_color ?? null,
      logos: Array.isArray(cfbd.logos) ? cfbd.logos : [],
      location: cfbd.location
        ? {
            venue_id: cfbd.location.venue_id ?? null,
            name: cfbd.location.name ?? null,
            city: cfbd.location.city ?? null,
            state: cfbd.location.state ?? null,
            zip: cfbd.location.zip ?? null,
            country_code: cfbd.location.country_code ?? null,
            timezone: cfbd.location.timezone ?? null,
            latitude: cfbd.location.latitude ?? null,
            longitude: cfbd.location.longitude ?? null,
            elevation: cfbd.location.elevation ?? null,
            capacity: cfbd.location.capacity ?? null,
            year_constructed: cfbd.location.year_constructed ?? null,
            grass: cfbd.location.grass ?? null,
            dome: cfbd.location.dome ?? null,
          }
        : null,
    };
  }

  console.log(`✅ Matched ${matched}/${fbsTeams.length} teams to CFBD data.`);

  if (missing.length) {
    console.log("\n⚠️ Missing CFBD matches for these teams:");
    for (const m of missing.slice(0, 30)) {
      console.log(`- ${m.appName} (${m.appSlug}) wanted: "${m.wanted}"`);
    }
    if (missing.length > 30) console.log(`...and ${missing.length - 30} more`);
    console.log("\nFix by adding entries to NAME_ALIASES at top of this file.\n");
  }

  const outPath = path.join(process.cwd(), "data", "teamMeta.ts");

  const file = `// AUTO-GENERATED by scripts/generateTeamMeta.mjs
// Year: ${YEAR}
// Keyed by OUR app slugs from data/fbsTeams.ts
// Do not edit by hand — rerun the generator.

export type TeamLocation = {
  venue_id: number | null;
  name: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country_code: string | null;
  timezone: string | null;
  latitude: number | null;
  longitude: number | null;
  elevation: number | null;
  capacity: number | null;
  year_constructed: number | null;
  grass: boolean | null;
  dome: boolean | null;
};

export type TeamMeta = {
  name: string;
  slug: string;
  abbreviation: string | null;
  mascot: string | null;
  conference: string;
  division: string | null;
  classification: string;
  color: string | null;
  alt_color: string | null;
  logos: string[];
  location: TeamLocation | null;
};

export const TEAM_META: Record<string, TeamMeta> = ${JSON.stringify(TEAM_META, null, 2)} as const;

export function getTeamMeta(slug: string): TeamMeta | null {
  return TEAM_META[slug] ?? null;
}
`;

  fs.writeFileSync(outPath, file, "utf8");
  console.log(`📝 Wrote ${Object.keys(TEAM_META).length} teams to ${outPath}`);
}

main().catch((err) => {
  console.error("\n❌ Script failed:");
  console.error(err?.stack || err);
  process.exit(1);
});
