import { NextResponse, type NextRequest } from "next/server";
import { CfbdHttpError, cfbdGetJson } from "@/lib/cfbd/http";
import { getScheduleSeasonYear } from "@/lib/cfbd/season";
import { resolveCfbdTeamName } from "@/lib/cfbd/teamName";

type ScheduleAttempt = {
  year: string;
  seasonType: string;
  teamSent: string;
};

function getTeamFromParamsOrPath(req: Request, paramsTeam?: string) {
  if (paramsTeam && String(paramsTeam).trim()) return String(paramsTeam).trim();

  // Fallback: parse from URL path if Next gives params as {}
  // Example: /api/cfbd/fbs/schedule/miami-fl?year=2025
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.lastIndexOf("schedule");
  const fromPath = idx >= 0 ? parts[idx + 1] : "";
  return fromPath ? decodeURIComponent(fromPath) : "";
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ team: string }> },
) {
  try {
    const { team } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const requestedYear =
      searchParams.get("year") ?? String(getScheduleSeasonYear());

    const teamSlug = getTeamFromParamsOrPath(req, team);

    if (!teamSlug) {
      return NextResponse.json(
        { ok: false, error: "Missing team parameter" },
        { status: 400 },
      );
    }

    const yearNum = Number(requestedYear);
    const yearsToTry = [yearNum, yearNum - 1];

    const teamSent = resolveCfbdTeamName(teamSlug);

    const attempts: ScheduleAttempt[] = [];
    const cfbdErrors: { year: number; status: number; detail: string }[] = [];
    let games: unknown[] = [];
    let resolvedYear: number | null = null;
    let finalUrl: string | null = null;

    for (const y of yearsToTry) {
      const seasonType = "both"; // include postseason
      attempts.push({ year: String(y), seasonType, teamSent });

      try {
        const data = await cfbdGetJson<unknown>(
          "/games",
          { year: y, team: teamSent, seasonType },
          {
            cacheTtlMs: 1000 * 60 * 60 * 12,
            team: teamSent,
            mockFactory: () => [],
          },
        );
        const arr = Array.isArray(data) ? data : [];
        finalUrl = `/games?year=${y}&team=${encodeURIComponent(teamSent)}&seasonType=${seasonType}`;
        if (arr.length > 0) {
          games = arr;
          resolvedYear = y;
          break;
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

    return NextResponse.json({
      ok: true,
      requestedYear,
      resolvedYear,
      teamSlug,
      teamSent,
      url: finalUrl,
      count: games.length,
      attempts,
      games,
      cfbdErrors: cfbdErrors.length ? cfbdErrors : undefined,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
