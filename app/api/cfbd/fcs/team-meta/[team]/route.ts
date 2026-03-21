import { NextResponse, type NextRequest } from "next/server";
import { CfbdHttpError, cfbdGetJson, cfbdMockModeEnabled } from "@/lib/cfbd/http";
import { getDefaultCfbSeasonYear } from "@/lib/cfbd/season";
import {
  findFcsTeamBySlug,
  resolveTeamFromParamsOrPath,
  type FcsTeamSummary,
} from "@/lib/cfbd/fcs";

function fallbackNameFromSlug(slug: string) {
  return slug
    .replace(/-\d+$/, "")
    .split("-")
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

function fallbackColor(slug: string) {
  const h = Array.from(slug).reduce((a, c) => a + c.charCodeAt(0), 0);
  return h % 2 === 0 ? "#0B3D91" : "#5A0029";
}

function buildFcsFallbackMeta(slug: string, found?: FcsTeamSummary | null) {
  const name = found?.school ?? (fallbackNameFromSlug(slug) || slug);
  return {
    name,
    slug: found?.slug ?? slug,
    abbreviation: found?.abbreviation ?? null,
    mascot: null,
    conference: found?.conference ?? "FCS",
    division: null,
    classification: found?.classification ?? "fcs",
    color: fallbackColor(slug),
    alt_color: "#C8102E",
    location: {
      venue_id: null,
      name: `${name} Stadium`,
      city: "Unknown",
      state: null,
      zip: null,
      country_code: "US",
      timezone: null,
      latitude: null,
      longitude: null,
      elevation: null,
      capacity: null,
      year_constructed: null,
      grass: null,
      dome: null,
    },
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

    const slug = resolveTeamFromParamsOrPath(req, "team-meta", team);
    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Missing team parameter" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(year) || year < 1900) {
      return NextResponse.json(
        { ok: false, error: "Invalid year parameter" },
        { status: 400 },
      );
    }
    const apiKey = process.env.CFBD_API_KEY ?? "";
    if (!apiKey && !cfbdMockModeEnabled()) {
      return NextResponse.json({
        ok: true,
        source: "fallback",
        year,
        team: null,
        meta: buildFcsFallbackMeta(slug),
        warning: "CFBD_API_KEY not configured",
      });
    }

    const found = await findFcsTeamBySlug(slug, year, apiKey);
    if (!found) {
      return NextResponse.json({
        ok: true,
        source: "fallback",
        year,
        team: null,
        meta: buildFcsFallbackMeta(slug),
        warning: "FCS team not found for slug",
      });
    }

    // Pull full FCS teams payload to get location/colors/etc
    let rows: unknown = null;
    try {
      rows = await cfbdGetJson<unknown>(
        "/teams",
        { year, classification: "fcs" },
        { cacheTtlMs: 1000 * 60 * 60 * 24 * 7, mockFactory: () => [] },
      );
    } catch (err: unknown) {
      const warning = err instanceof CfbdHttpError ? `CFBD request failed (${err.status})` : "CFBD request failed";
      return NextResponse.json({
        ok: true,
        source: "fallback",
        year,
        team: found as FcsTeamSummary,
        meta: buildFcsFallbackMeta(slug, found),
        warning,
      });
    }
    const list = Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
    const byId =
      found.id != null
        ? list.find((r) => Number(r.id) === found.id)
        : null;
    const row = byId ?? null;

    const location =
      row && row.location && typeof row.location === "object"
        ? (row.location as Record<string, unknown>)
        : null;

    const meta = {
      name: String((row?.school as string) ?? found.school),
      slug: found.slug,
      abbreviation: (row?.abbreviation as string) ?? found.abbreviation,
      mascot: (row?.mascot as string) ?? null,
      conference: (row?.conference as string) ?? found.conference ?? "FCS",
      division: (row?.division as string) ?? null,
      classification: (row?.classification as string) ?? "fcs",
      color: (row?.color as string) ?? null,
      alt_color: (row?.alt_color as string) ?? null,
      location: location
        ? {
            venue_id: location.venue_id ?? null,
            name: location.name ?? null,
            city: location.city ?? null,
            state: location.state ?? null,
            zip: location.zip ?? null,
            country_code: location.country_code ?? null,
            timezone: location.timezone ?? null,
            latitude: location.latitude ?? null,
            longitude: location.longitude ?? null,
            elevation: location.elevation ?? null,
            capacity: location.capacity ?? null,
            year_constructed: location.year_constructed ?? null,
            grass: location.grass ?? null,
            dome: location.dome ?? null,
          }
        : null,
    };

    return NextResponse.json({
      ok: true,
      source: "cfbd",
      year,
      team: found as FcsTeamSummary,
      meta,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
