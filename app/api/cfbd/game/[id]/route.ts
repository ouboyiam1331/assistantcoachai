import { NextResponse, type NextRequest } from "next/server";
import { CfbdHttpError, cfbdGetJson, cfbdMockModeEnabled } from "@/lib/cfbd/http";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params; // ✅ THIS was the missing piece
    const gameId = id;

    if (!gameId) {
      return NextResponse.json(
        { ok: false, error: "Missing gameId parameter" },
        { status: 400 },
      );
    }

    if (!process.env.CFBD_API_KEY && !cfbdMockModeEnabled()) {
      return NextResponse.json(
        { ok: false, error: "CFBD_API_KEY not configured" },
        { status: 500 },
      );
    }

    let games: unknown = null;
    try {
      games = await cfbdGetJson<unknown>(
        "/games",
        { id: gameId },
        { cacheTtlMs: 1000 * 60 * 60 * 8, mockFactory: () => [] },
      );
    } catch (err: unknown) {
      if (err instanceof CfbdHttpError) {
        return NextResponse.json(
          { ok: false, error: `CFBD request failed (${err.status})`, detail: err.detail },
          { status: err.status },
        );
      }
      return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "CFBD request failed" }, { status: 500 });
    }

    if (!Array.isArray(games) || games.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Game not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, game: games[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
