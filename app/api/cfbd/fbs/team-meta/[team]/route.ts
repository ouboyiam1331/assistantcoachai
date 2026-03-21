import { NextResponse, type NextRequest } from "next/server";
import { FBS_TEAMS } from "@/data/fbsTeams";
import { getTeamMeta } from "@/data/teamMeta";
import { CfbdHttpError, cfbdGetJson } from "@/lib/cfbd/http";
import { getDefaultCfbSeasonYear } from "@/lib/cfbd/season";
import { resolveCfbdTeamName } from "@/lib/cfbd/teamName";

type CfbdTeamRow = Record<string, unknown>;

function getTeamFromParamsOrPath(req: Request, paramsTeam?: string) {
  if (paramsTeam && String(paramsTeam).trim()) return String(paramsTeam).trim();

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.lastIndexOf("team-meta");
  const fromPath = idx >= 0 ? parts[idx + 1] : "";
  return fromPath ? decodeURIComponent(fromPath) : "";
}

function normalize(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function buildFallback(slug: string) {
  const team = FBS_TEAMS.find((t) => t.slug === slug) ?? null;
  const staticMeta = getTeamMeta(slug);
  if (!team && !staticMeta) return null;

  return {
    name: staticMeta?.name ?? team?.name ?? slug,
    slug: staticMeta?.slug ?? team?.slug ?? slug,
    abbreviation: staticMeta?.abbreviation ?? null,
    mascot: staticMeta?.mascot ?? null,
    conference: staticMeta?.conference ?? team?.conference ?? "Unknown Conference",
    division: staticMeta?.division ?? null,
    classification: staticMeta?.classification ?? "FBS",
    color: staticMeta?.color ?? null,
    alt_color: staticMeta?.alt_color ?? null,
    location: staticMeta?.location ?? null,
  };
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ team: string }> },
) {
  try {
    const { team } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const yearRaw =
      searchParams.get("year") ?? String(getDefaultCfbSeasonYear());
    const year = Number(yearRaw);

    const slug = getTeamFromParamsOrPath(req, team);
    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Missing team parameter" },
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
    } catch (err: unknown) {
      const warning =
        err instanceof CfbdHttpError ? `CFBD request failed (${err.status})` : "CFBD request failed";
      return NextResponse.json({
        ok: true,
        source: "fallback",
        year,
        meta: buildFallback(slug),
        warning,
      });
    }
    const list: CfbdTeamRow[] = Array.isArray(rows)
      ? (rows as CfbdTeamRow[])
      : [];

    const appTeam = FBS_TEAMS.find((t) => t.slug === slug) ?? null;
    const candidates = [
      resolveCfbdTeamName(slug),
      appTeam?.name ?? "",
      slug.replace(/-/g, " "),
    ]
      .map((s) => String(s).trim())
      .filter(Boolean);

    const candidateNorms = candidates.map((s) => normalize(s));
    const exactFound =
      list.find((r) => {
        const school = String(r.school ?? r.name ?? "");
        const n = normalize(school);
        return candidateNorms.includes(n);
      }) ?? null;

    const fuzzyFound =
      list.find((r) => {
        const school = String(r.school ?? r.name ?? "");
        const n = normalize(school);
        return candidateNorms.some((cn) => n.includes(cn));
      }) ?? null;

    const found = exactFound ?? fuzzyFound ?? null;

    if (!found) {
      return NextResponse.json({
        ok: true,
        source: "fallback",
        year,
        meta: buildFallback(slug),
      });
    }

    const meta = {
      name: found.school ?? found.name ?? appTeam?.name ?? slug,
      slug,
      abbreviation: found.abbreviation ?? null,
      mascot: found.mascot ?? null,
      conference: found.conference ?? appTeam?.conference ?? "Unknown Conference",
      division: found.division ?? null,
      classification: found.classification ?? "FBS",
      color: found.color ?? null,
      alt_color: found.alt_color ?? null,
      location: found.location
        ? {
            venue_id: (found.location as CfbdTeamRow).venue_id ?? null,
            name: (found.location as CfbdTeamRow).name ?? null,
            city: (found.location as CfbdTeamRow).city ?? null,
            state: (found.location as CfbdTeamRow).state ?? null,
            zip: (found.location as CfbdTeamRow).zip ?? null,
            country_code: (found.location as CfbdTeamRow).country_code ?? null,
            timezone: (found.location as CfbdTeamRow).timezone ?? null,
            latitude: (found.location as CfbdTeamRow).latitude ?? null,
            longitude: (found.location as CfbdTeamRow).longitude ?? null,
            elevation: (found.location as CfbdTeamRow).elevation ?? null,
            capacity: (found.location as CfbdTeamRow).capacity ?? null,
            year_constructed:
              (found.location as CfbdTeamRow).year_constructed ?? null,
            grass: (found.location as CfbdTeamRow).grass ?? null,
            dome: (found.location as CfbdTeamRow).dome ?? null,
          }
        : null,
    };

    return NextResponse.json({
      ok: true,
      source: "cfbd",
      year,
      meta,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
