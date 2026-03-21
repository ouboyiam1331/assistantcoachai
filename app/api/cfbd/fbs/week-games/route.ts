import { NextResponse } from "next/server";
import { CfbdHttpError, cfbdGetJson, cfbdMockModeEnabled } from "@/lib/cfbd/http";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const yearRaw = searchParams.get("year") ?? "2025";
    const weekRaw = searchParams.get("week") ?? "";
    const seasonType = searchParams.get("seasonType") ?? "regular";

    const year = Number(yearRaw);
    const week = Number(weekRaw);

    if (!Number.isFinite(year) || year < 1900) {
      return NextResponse.json(
        { ok: false, error: "Invalid year parameter" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(week) || week < 1 || week > 25) {
      return NextResponse.json(
        { ok: false, error: "Invalid week parameter" },
        { status: 400 },
      );
    }
    if (!process.env.CFBD_API_KEY && !cfbdMockModeEnabled()) {
      return NextResponse.json(
        { ok: false, error: "CFBD_API_KEY not configured" },
        { status: 500 },
      );
    }
    let games: unknown[] = [];
    try {
      const rows = await cfbdGetJson<unknown>(
        "/games",
        { year, week, classification: "fbs", seasonType },
        {
          cacheTtlMs: 1000 * 60 * 60 * 8,
          dedupeMs: 5000,
          mockFactory: () => [],
        },
      );
      games = Array.isArray(rows) ? rows : [];
    } catch (err: unknown) {
      if (err instanceof CfbdHttpError) {
        return NextResponse.json(
          { ok: false, error: `CFBD request failed (${err.status})`, detail: err.detail, url: err.url },
          { status: err.status },
        );
      }
      return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "CFBD request failed" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      year,
      week,
      seasonType,
      count: games.length,
      games,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
