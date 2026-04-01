import { NextRequest, NextResponse } from "next/server";
import { refreshHomepageSummaryFromWeeklySlate } from "@/lib/homepage/summary";

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = req.headers.get("authorization") ?? "";
  return authHeader === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const refreshed = await refreshHomepageSummaryFromWeeklySlate();
    if (!refreshed) {
      return NextResponse.json({
        ok: true,
        refreshed: false,
        reason: "No active weekly college football slate is available yet.",
      });
    }

    return NextResponse.json({
      ok: true,
      refreshed: true,
      refreshKey: refreshed.refreshKey,
      seasonYear: refreshed.seasonYear,
      week: refreshed.week,
      seasonType: refreshed.seasonType,
      analyzedGames: refreshed.analyzedGames,
      cacheHit: refreshed.cacheHit,
      insights: refreshed.summary.insights.map((insight) => insight.title),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Homepage prewarm failed",
      },
      { status: 500 },
    );
  }
}
