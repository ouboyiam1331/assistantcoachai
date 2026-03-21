import { FBS_TEAMS } from "@/data/fbsTeams";
import { cfbdGetJson } from "@/lib/cfbd/http";

export type FcsTeamSummary = {
  id: number | null;
  school: string;
  conference: string | null;
  classification: string | null;
  abbreviation: string | null;
  slug: string;
};

function normalizeKey(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function slugifySchool(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

const STATIC_FBS_NAME_KEYS = new Set(FBS_TEAMS.map((t) => normalizeKey(t.name)));
const STATIC_FBS_SLUG_KEYS = new Set(FBS_TEAMS.map((t) => normalizeKey(t.slug)));
const STATIC_FBS_CONFERENCE_KEYS = new Set(
  FBS_TEAMS.map((t) => normalizeKey(t.conference)),
);
const FBS_CONFERENCE_ALIASES = new Set(
  [
    "Conference USA",
    "CUSA",
    "Sun Belt",
    "Sunbelt",
    "Mid-American",
    "Mid American",
    "MAC",
    "Mountain West",
  ].map((c) => normalizeKey(c)),
);

type FbsReference = {
  nameKeys: Set<string>;
  slugKeys: Set<string>;
  conferenceKeys: Set<string>;
};

const fbsRefCache = new Map<number, FbsReference>();

function buildStaticFbsReference(): FbsReference {
  return {
    nameKeys: new Set(STATIC_FBS_NAME_KEYS),
    slugKeys: new Set(STATIC_FBS_SLUG_KEYS),
    conferenceKeys: new Set(STATIC_FBS_CONFERENCE_KEYS),
  };
}

async function getFbsReference(year: number, apiKey: string): Promise<FbsReference> {
  const cached = fbsRefCache.get(year);
  if (cached) return cached;

  void apiKey;
  let rows: unknown = null;
  try {
    rows = await cfbdGetJson<unknown>(
      "/teams/fbs",
      { year },
      { cacheTtlMs: 1000 * 60 * 60 * 24 * 7, mockFactory: () => [] },
    );
  } catch {
    const fallback = buildStaticFbsReference();
    fbsRefCache.set(year, fallback);
    return fallback;
  }
  const list = Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];

  const ref = buildStaticFbsReference();
  for (const row of list) {
    const school = String(row.school ?? row.name ?? "").trim();
    const conference = String(row.conference ?? "").trim();
    if (school) {
      ref.nameKeys.add(normalizeKey(school));
      ref.slugKeys.add(normalizeKey(slugifySchool(school)));
    }
    if (conference) {
      ref.conferenceKeys.add(normalizeKey(conference));
    }
  }

  fbsRefCache.set(year, ref);
  return ref;
}

export function resolveTeamFromParamsOrPath(
  req: Request,
  segment: string,
  paramsTeam?: string,
) {
  if (paramsTeam && String(paramsTeam).trim()) return String(paramsTeam).trim();
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.lastIndexOf(segment);
  const fromPath = idx >= 0 ? parts[idx + 1] : "";
  return fromPath ? decodeURIComponent(fromPath) : "";
}

export async function fetchFcsTeams(
  year: number,
  apiKey: string,
): Promise<FcsTeamSummary[]> {
  const fbsRef = await getFbsReference(year, apiKey);
  void apiKey;
  const rows = await cfbdGetJson<unknown>(
    "/teams",
    { year, classification: "fcs" },
    { cacheTtlMs: 1000 * 60 * 60 * 24 * 7, mockFactory: () => [] },
  );
  const list = Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];

  const seen = new Set<string>();
  return list
    .map((r) => {
      const school = String(r.school ?? r.name ?? "").trim();
      if (!school) return null;

      const base = slugifySchool(school);
      const schoolKey = normalizeKey(school);
      const baseKey = normalizeKey(base);
      const conference = r.conference ? String(r.conference).trim() : "";
      const conferenceKey = normalizeKey(conference);
      const classificationRaw = String(r.classification ?? "")
        .trim()
        .toLowerCase();
      if (classificationRaw && classificationRaw !== "fcs") {
        return null;
      }
      if (
        fbsRef.nameKeys.has(schoolKey) ||
        fbsRef.slugKeys.has(baseKey) ||
        fbsRef.conferenceKeys.has(conferenceKey) ||
        FBS_CONFERENCE_ALIASES.has(conferenceKey)
      ) {
        return null;
      }
      const idNum =
        typeof r.id === "number"
          ? r.id
          : Number.isFinite(Number(r.id))
            ? Number(r.id)
            : null;
      const slug = idNum != null ? `${base}-${idNum}` : base;
      if (!slug) return null;

      if (seen.has(slug)) return null;
      seen.add(slug);

      return {
        id: idNum,
        school,
        conference: conference || null,
        classification: r.classification ? String(r.classification) : null,
        abbreviation: r.abbreviation ? String(r.abbreviation) : null,
        slug,
      } as FcsTeamSummary;
    })
    .filter((x): x is FcsTeamSummary => Boolean(x))
    .sort((a, b) => a.school.localeCompare(b.school));
}

export async function findFcsTeamBySlug(
  slug: string,
  year: number,
  apiKey: string,
) {
  const teams = await fetchFcsTeams(year, apiKey);
  const exact = teams.find((t) => t.slug === slug);
  if (exact) return exact;

  const key = normalizeKey(slug.replace(/-\d+$/, "").replace(/-/g, " "));
  return teams.find((t) => normalizeKey(t.school) === key) ?? null;
}
