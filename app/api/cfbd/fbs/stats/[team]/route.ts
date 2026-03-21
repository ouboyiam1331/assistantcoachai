import { NextResponse, type NextRequest } from "next/server";
import { CfbdHttpError, cfbdGetJson, cfbdMockModeEnabled } from "@/lib/cfbd/http";
import { resolveCfbdTeamName } from "@/lib/cfbd/teamName";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ team: string }> },
) {
  try {
    const { team: slug } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year") ?? "2025";

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Missing team slug in route params" },
        { status: 400 },
      );
    }

    if (!process.env.CFBD_API_KEY && !cfbdMockModeEnabled()) {
      return NextResponse.json(
        { ok: false, error: "Missing CFBD_API_KEY env var" },
        { status: 500 },
      );
    }

    const teamName = resolveCfbdTeamName(slug);

    let json: unknown = null;
    try {
      json = await cfbdGetJson<unknown>(
        "/stats/season",
        { year: String(year), team: teamName },
        { cacheTtlMs: 1000 * 60 * 60 * 24, team: teamName, mockFactory: () => [] },
      );
    } catch (err: unknown) {
      if (err instanceof CfbdHttpError) {
        return NextResponse.json(
          {
            ok: false,
            error: `CFBD stats request failed (${err.status})`,
            details: err.detail.slice(0, 500),
            url: err.url,
          },
          { status: err.status },
        );
      }
      return NextResponse.json(
        {
          ok: false,
          error: err instanceof Error ? err.message : "CFBD stats request failed",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      teamSlug: slug,
      teamName,
      year: Number(year),
      raw: json,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
