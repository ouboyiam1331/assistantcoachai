import { NextResponse, type NextRequest } from "next/server";
import { CfbdHttpError, cfbdGetJson, cfbdMockModeEnabled } from "@/lib/cfbd/http";
import { findFcsTeamBySlug, resolveTeamFromParamsOrPath } from "@/lib/cfbd/fcs";
import { getScheduleSeasonYear } from "@/lib/cfbd/season";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ team: string }> },
) {
  try {
    const { team } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const requestedYear =
      searchParams.get("year") ?? String(getScheduleSeasonYear());
    const yearNum = Number(requestedYear);

    if (!Number.isFinite(yearNum) || yearNum < 1900) {
      return NextResponse.json(
        { ok: false, error: "Invalid year parameter" },
        { status: 400 },
      );
    }

    const teamSlug = resolveTeamFromParamsOrPath(req, "schedule", team);
    if (!teamSlug) {
      return NextResponse.json(
        { ok: false, error: "Missing team parameter" },
        { status: 400 },
      );
    }
    const apiKey = process.env.CFBD_API_KEY ?? "";
    if (!apiKey && !cfbdMockModeEnabled()) {
      return NextResponse.json(
        { ok: false, error: "CFBD_API_KEY not configured" },
        { status: 500 },
      );
    }

    const teamFound = await findFcsTeamBySlug(teamSlug, yearNum, apiKey);
    if (!teamFound) {
      return NextResponse.json({
        ok: true,
        requestedYear,
        resolvedYear: null,
        teamSlug,
        teamSent: null,
        url: null,
        count: 0,
        games: [],
        warning: "FCS team not found for slug",
      });
    }

    const yearsToTry = [yearNum, yearNum - 1];
    let games: unknown[] = [];
    const cfbdErrors: { year: number; status: number; detail: string }[] = [];
    let resolvedYear: number | null = null;
    let finalUrl: string | null = null;
    let bestPartial: { games: unknown[]; year: number; url: string } | null = null;

    for (const y of yearsToTry) {
      const seasonType = "both";
      try {
        const data = await cfbdGetJson<unknown>(
          "/games",
          { year: y, team: teamFound.school, classification: "fcs", seasonType },
          {
            cacheTtlMs: 1000 * 60 * 60 * 12,
            team: teamFound.school,
            mockFactory: () => [],
          },
        );
        const arr = Array.isArray(data) ? data : [];
        const attemptUrl = `/games?year=${y}&team=${encodeURIComponent(teamFound.school)}&classification=fcs&seasonType=${seasonType}`;
        finalUrl = attemptUrl;
        if (arr.length >= 8 || y < yearNum) {
          games = arr;
          resolvedYear = y;
          break;
        }
        if (arr.length > 0 && (!bestPartial || arr.length > bestPartial.games.length)) {
          bestPartial = { games: arr, year: y, url: attemptUrl };
        }
      } catch (err: unknown) {
        if (err instanceof CfbdHttpError) {
          cfbdErrors.push({ year: y, status: err.status, detail: err.detail.slice(0, 400) });
        } else {
          cfbdErrors.push({ year: y, status: 500, detail: err instanceof Error ? err.message : "CFBD error" });
        }
        continue;
      }
    }

    if (games.length === 0 && bestPartial) {
      games = bestPartial.games;
      resolvedYear = bestPartial.year;
      finalUrl = bestPartial.url;
    }

    return NextResponse.json({
      ok: true,
      requestedYear,
      resolvedYear,
      teamSlug,
      teamSent: teamFound.school,
      url: finalUrl,
      count: games.length,
      games,
      cfbdErrors: cfbdErrors.length ? cfbdErrors : undefined,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
