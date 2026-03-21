import { NextResponse, type NextRequest } from "next/server";
import { LeagueKey } from "@/lib/leagues/config";
import { getDataProvider } from "@/lib/providers";

function toLeagueKey(raw: string): LeagueKey | null {
  const value = raw.toUpperCase();
  return Object.values(LeagueKey).includes(value as LeagueKey)
    ? (value as LeagueKey)
    : null;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ league: string }> },
) {
  try {
    const { league: rawLeague } = await ctx.params;
    const league = toLeagueKey(rawLeague);
    if (!league) {
      return NextResponse.json(
        { ok: false, error: "Invalid league" },
        { status: 400 },
      );
    }
    const yearRaw = new URL(req.url).searchParams.get("year") ?? "2025";
    const year = Number(yearRaw);
    const provider = getDataProvider();
    const teams = await provider.searchTeams(league, year);
    return NextResponse.json({ ok: true, league, year, teams });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

