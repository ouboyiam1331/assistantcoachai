import { NextResponse, type NextRequest } from "next/server";
import { FBS_TEAMS } from "@/data/fbsTeams";
import { cfbdMockModeEnabled } from "@/lib/cfbd/http";
import { fetchTeamPlayerSeasonRows, extractLeaders } from "@/lib/cfbd/leaders";
import { getStatsSeasonYear } from "@/lib/cfbd/season";
import { resolveCfbdTeamName } from "@/lib/cfbd/teamName";

function getTeamFromParamsOrPath(req: Request, paramsTeam?: string) {
  if (paramsTeam && String(paramsTeam).trim()) return String(paramsTeam).trim();
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.lastIndexOf("leaders");
  const fromPath = idx >= 0 ? parts[idx + 1] : "";
  return fromPath ? decodeURIComponent(fromPath) : "";
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ team: string }> },
) {
  try {
    const apiKey = process.env.CFBD_API_KEY ?? "";
    if (!apiKey && !cfbdMockModeEnabled()) {
      return NextResponse.json(
        { ok: false, error: "CFBD_API_KEY not configured" },
        { status: 500 },
      );
    }

    const { team } = await ctx.params;
    const slug = getTeamFromParamsOrPath(req, team);
    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Missing team parameter" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(req.url);
    const yearRaw =
      searchParams.get("year") ?? String(getStatsSeasonYear());
    const year = Number(yearRaw);
    if (!Number.isFinite(year) || year < 1900) {
      return NextResponse.json(
        { ok: false, error: "Invalid year parameter" },
        { status: 400 },
      );
    }

    const fromList = FBS_TEAMS.find((t) => t.slug === slug)?.name ?? "";
    const teamName = resolveCfbdTeamName(slug || fromList);

    let rows: Record<string, unknown>[] = [];
    let warning: string | null = null;
    try {
      rows = await fetchTeamPlayerSeasonRows(year, teamName, apiKey);
    } catch (err: unknown) {
      warning = err instanceof Error ? err.message : "CFBD player season stats failed";
    }
    const leaders = extractLeaders(rows, teamName);
    const availableCount = leaders.filter((l) => l.player && l.stat != null).length;

    return NextResponse.json({
      ok: true,
      year,
      teamSlug: slug,
      teamName,
      leaders,
      availableCount,
      warning,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
