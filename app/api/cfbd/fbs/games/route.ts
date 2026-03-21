import { NextResponse } from "next/server";
import { CfbdHttpError, cfbdGetJson, cfbdMockModeEnabled } from "@/lib/cfbd/http";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year") ?? "2024";
  const team = searchParams.get("team") ?? "";

  if (!team) {
    return NextResponse.json(
      { ok: false, error: "Missing team query parameter" },
      { status: 400 },
    );
  }

  if (!process.env.CFBD_API_KEY && !cfbdMockModeEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Missing CFBD_API_KEY env var" },
      { status: 500 }
    );
  }
  let data: unknown = null;
  try {
    data = await cfbdGetJson<unknown>(
      "/games",
      { year, team },
      { cacheTtlMs: 1000 * 60 * 60 * 12, team, mockFactory: () => [] },
    );
  } catch (err: unknown) {
    if (err instanceof CfbdHttpError) {
      return NextResponse.json(
        { ok: false, error: `CFBD error ${err.status}` },
        { status: err.status }
      );
    }
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "CFBD error" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    team,
    year,
    games: data,
  });
}
