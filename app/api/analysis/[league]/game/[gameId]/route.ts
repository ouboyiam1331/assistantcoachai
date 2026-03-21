import { NextResponse } from "next/server";
import { LeagueKey } from "@/lib/leagues/config";
import { getDataProvider } from "@/lib/providers";

function toLeagueKey(raw: string): LeagueKey | null {
  const value = raw.toUpperCase();
  return Object.values(LeagueKey).includes(value as LeagueKey)
    ? (value as LeagueKey)
    : null;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ league: string; gameId: string }> },
) {
  try {
    const { league: rawLeague, gameId } = await ctx.params;
    const league = toLeagueKey(rawLeague);
    if (!league) {
      return NextResponse.json(
        { ok: false, error: "Invalid league" },
        { status: 400 },
      );
    }
    const provider = getDataProvider();
    const game = await provider.getGame(league, gameId);
    const matchupInputs = await provider.getMatchupInputs(league, gameId);
    return NextResponse.json({ ok: true, league, gameId, game, matchupInputs });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

