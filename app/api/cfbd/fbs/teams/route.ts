import { NextResponse, type NextRequest } from "next/server";
import { FBS_TEAMS } from "@/data/fbsTeams";
import { cfbdGetJson } from "@/lib/cfbd/http";
import { resolveCfbdTeamName } from "@/lib/cfbd/teamName";

type FbsTeamSummary = {
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

function normalizeStrict(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function staticFallback(year: number) {
  const teams = [...FBS_TEAMS]
    .map((t) => ({
      id: null,
      school: t.name,
      conference: t.conference,
      classification: "fbs",
      abbreviation: null,
      slug: t.slug,
    }))
    .sort((a, b) => a.school.localeCompare(b.school));

  return NextResponse.json({
    ok: true,
    year,
    source: "fallback",
    count: teams.length,
    teams,
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const yearRaw = searchParams.get("year") ?? "2025";
    const year = Number(yearRaw);

    if (!Number.isFinite(year) || year < 1900) {
      return NextResponse.json(
        { ok: false, error: "Invalid year parameter" },
        { status: 400 },
      );
    }

    let rows: unknown = null;
    try {
      rows = await cfbdGetJson<unknown>(
        "/teams/fbs",
        { year },
        { cacheTtlMs: 1000 * 60 * 60 * 24 * 7, mockFactory: () => [] },
      );
    } catch {
      return staticFallback(year);
    }
    const list = Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
    const cfbdRows = list.map((r) => {
      const school = String(r.school ?? r.name ?? "").trim();
      const conference = r.conference ? String(r.conference) : null;
      const classification = r.classification ? String(r.classification) : null;
      const abbreviation = r.abbreviation ? String(r.abbreviation) : null;
      const idNum =
        typeof r.id === "number"
          ? r.id
          : Number.isFinite(Number(r.id))
            ? Number(r.id)
            : null;
      return { school, conference, classification, abbreviation, id: idNum };
    });

    const teams: FbsTeamSummary[] = FBS_TEAMS.map((t) => {
      const preferredCfbdName = resolveCfbdTeamName(t.slug);
      const nameKey = normalizeStrict(t.name);
      const preferredKey = normalizeStrict(preferredCfbdName);
      const row =
        cfbdRows.find((x) => normalizeStrict(x.school) === preferredKey) ??
        cfbdRows.find((x) => normalizeStrict(x.school) === nameKey) ??
        cfbdRows.find((x) => normalizeKey(x.school) === normalizeKey(preferredCfbdName)) ??
        null;

      return {
        id: row?.id ?? null,
        school: t.name,
        conference: t.conference,
        classification: "fbs",
        abbreviation: row?.abbreviation ?? null,
        slug: t.slug,
      };
    }).sort((a, b) => a.school.localeCompare(b.school));

    if (teams.length === 0) {
      return staticFallback(year);
    }

    return NextResponse.json({
      ok: true,
      year,
      source: "cfbd",
      count: teams.length,
      teams,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
