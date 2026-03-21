import { NextResponse, type NextRequest } from "next/server";
import { analyzeMatchupSeasonOnly } from "@/lib/tgem/v10";
import { LeagueKey } from "@/lib/leagues/config";
import { TGEM_MODEL_VERSION } from "@/lib/model/version";
import type { MatchupAnalysis } from "@/lib/contracts/matchupAnalysis";
import { cfbdMockModeEnabled } from "@/lib/cfbd/http";
import { setSnapshot, snapshotTtlMs } from "@/lib/snapshots/store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const team = searchParams.get("team") ?? "";
    const opponent = searchParams.get("opponent") ?? "";
    const yearRaw = searchParams.get("year") ?? "";
    const venueRaw = (searchParams.get("venue") ?? "").toLowerCase();
    const phaseRaw = (searchParams.get("phase") ?? "").toLowerCase();
    const seasonType = searchParams.get("seasonType") ?? undefined;
    const weekRaw = searchParams.get("week");
    const gameId = searchParams.get("gameId");
    const leagueRaw = (searchParams.get("league") ?? "FBS").toUpperCase();
    const league = Object.values(LeagueKey).includes(leagueRaw as LeagueKey)
      ? (leagueRaw as LeagueKey)
      : LeagueKey.FBS;

    if (!team) {
      return NextResponse.json(
        { ok: false, error: "Missing team parameter" },
        { status: 400 },
      );
    }
    if (!opponent) {
      return NextResponse.json(
        { ok: false, error: "Missing opponent parameter" },
        { status: 400 },
      );
    }

    const year = Number(yearRaw);
    if (!Number.isFinite(year) || year < 1900) {
      return NextResponse.json(
        { ok: false, error: "Invalid year parameter" },
        { status: 400 },
      );
    }

    const venue =
      venueRaw === "home" || venueRaw === "away" || venueRaw === "neutral"
        ? (venueRaw as "home" | "away" | "neutral")
        : undefined;
    const phase =
      phaseRaw === "regular" ||
      phaseRaw === "championship" ||
      phaseRaw === "postseason" ||
      phaseRaw === "bowl" ||
      phaseRaw === "cfp"
        ? (phaseRaw as "regular" | "championship" | "postseason" | "bowl" | "cfp")
        : undefined;
    const week =
      weekRaw != null && weekRaw !== "" && Number.isFinite(Number(weekRaw))
        ? Number(weekRaw)
        : undefined;

    const result = await analyzeMatchupSeasonOnly({
      team,
      opponent,
      year,
      venue,
      phase,
      seasonType,
      week,
    });

    const hasTeamStats = !!result.statsSnapshot?.team;
    const hasOpponentStats = !!result.statsSnapshot?.opponent;
    const dataQuality: MatchupAnalysis["dataQuality"] = cfbdMockModeEnabled()
      ? "MOCK"
      : hasTeamStats && hasOpponentStats
        ? "OK"
        : hasTeamStats || hasOpponentStats
          ? "PARTIAL"
          : "MISSING";

    const analysis: MatchupAnalysis = {
      league,
      season: year,
      week: week ?? null,
      gameId: gameId ?? null,
      homeTeam: team,
      awayTeam: opponent,
      neutralSite: venue === "neutral",
      lean: result.lean ?? "PASS",
      confidence: typeof result.confidence === "number" ? result.confidence : null,
      reasons: (result.reasons ?? []).map((text) => ({
        tag:
          /missing|unavailable|failed|error/i.test(text) ? "data" :
          /risk|volatility|turnover/i.test(text) ? "risk" :
          /venue|phase|postseason|bowl|cfp/i.test(text) ? "context" : "model",
        text,
      })),
      keyFactors: [
        {
          label: "Season Stats Edge",
          delta: typeof result.factors?.seasonStatsEdge === "number" ? result.factors.seasonStatsEdge : null,
          impact:
            typeof result.factors?.seasonStatsEdge !== "number"
              ? "neutral"
              : result.factors.seasonStatsEdge > 0
                ? "positive"
                : result.factors.seasonStatsEdge < 0
                  ? "negative"
                  : "neutral",
        },
        {
          label: "Venue",
          delta: typeof result.factors?.venue === "number" ? result.factors.venue : null,
          impact:
            typeof result.factors?.venue !== "number"
              ? "neutral"
              : result.factors.venue > 0
                ? "positive"
                : result.factors.venue < 0
                  ? "negative"
                  : "neutral",
        },
        {
          label: "Rating Delta",
          delta: typeof result.ratings?.delta === "number" ? result.ratings.delta : null,
          impact:
            typeof result.ratings?.delta !== "number"
              ? "neutral"
              : result.ratings.delta > 0
                ? "positive"
                : result.ratings.delta < 0
                  ? "negative"
                  : "neutral",
        },
      ],
      dataQuality,
      generatedAt: new Date().toISOString(),
      modelVersion: TGEM_MODEL_VERSION,
    };
    setSnapshot(
      `analysis_snapshot:${league}:${year}:${team}:${opponent}:${gameId ?? week ?? "na"}`,
      analysis,
      snapshotTtlMs.analysis,
    );

    return NextResponse.json({
      ok: true,
      modelVersion: TGEM_MODEL_VERSION,
      year,
      team,
      opponent,
      analysis,
      ...result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
