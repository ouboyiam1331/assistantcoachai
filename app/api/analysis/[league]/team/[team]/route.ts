import { NextRequest, NextResponse } from "next/server";
import { LeagueKey } from "@/lib/leagues/config";
import { getSnapshot, setSnapshot, snapshotTtlMs } from "@/lib/snapshots/store";
import { allowPriorSeasonFallback } from "@/lib/cfbd/season";
import { GET as getFbsTeamMeta } from "@/app/api/cfbd/fbs/team-meta/[team]/route";
import { GET as getFbsSeasonStats } from "@/app/api/cfbd/fbs/season-stats/[team]/route";
import { GET as getFbsLeaders } from "@/app/api/cfbd/fbs/leaders/[team]/route";
import { GET as getFbsSchedule } from "@/app/api/cfbd/fbs/schedule/[team]/route";
import { GET as getFcsTeamMeta } from "@/app/api/cfbd/fcs/team-meta/[team]/route";
import { GET as getFcsSeasonStats } from "@/app/api/cfbd/fcs/season-stats/[team]/route";
import { GET as getFcsLeaders } from "@/app/api/cfbd/fcs/leaders/[team]/route";
import { GET as getFcsSchedule } from "@/app/api/cfbd/fcs/schedule/[team]/route";

type RouteParams = { team: string };
type RouteHandler = (
  req: NextRequest,
  ctx: { params: Promise<RouteParams> },
) => Promise<Response>;

function toLeagueKey(raw: string): LeagueKey | null {
  const value = raw.toUpperCase();
  return Object.values(LeagueKey).includes(value as LeagueKey)
    ? (value as LeagueKey)
    : null;
}

function teamPayloadSnapshotKey(args: {
  league: LeagueKey;
  team: string;
  statsYear: number;
  scheduleYear: number;
}) {
  return `team_page_payload:${args.league}:${args.team}:${args.statsYear}:${args.scheduleYear}`;
}

async function invokeRouteJson<T>(
  req: NextRequest,
  path: string,
  handler: RouteHandler,
  params: RouteParams,
): Promise<T> {
  const childReq = new NextRequest(new URL(path, req.url));
  const response = await handler(childReq, { params: Promise.resolve(params) });
  return (await response.json()) as T;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ league: string; team: string }> },
) {
  try {
    const { league: rawLeague, team } = await ctx.params;
    const league = toLeagueKey(rawLeague);

    if (!league || (league !== LeagueKey.FBS && league !== LeagueKey.FCS)) {
      return NextResponse.json(
        { ok: false, error: "Invalid or unsupported league" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(req.url);
    const statsYear = Number(searchParams.get("statsYear") ?? "2025");
    const scheduleYear = Number(searchParams.get("scheduleYear") ?? "2025");

    if (!Number.isFinite(statsYear) || !Number.isFinite(scheduleYear)) {
      return NextResponse.json(
        { ok: false, error: "Invalid year parameter" },
        { status: 400 },
      );
    }

    const cacheKey = teamPayloadSnapshotKey({
      league,
      team,
      statsYear,
      scheduleYear,
    });
    const cached = getSnapshot<unknown>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const handlers =
      league === LeagueKey.FBS
        ? {
            meta: getFbsTeamMeta,
            stats: getFbsSeasonStats,
            leaders: getFbsLeaders,
            schedule: getFbsSchedule,
          }
        : {
            meta: getFcsTeamMeta,
            stats: getFcsSeasonStats,
            leaders: getFcsLeaders,
            schedule: getFcsSchedule,
          };

    const [metaResult, statsResult, leadersResult, scheduleResult] = await Promise.allSettled([
      invokeRouteJson<Record<string, unknown>>(
        req,
        `/api/cfbd/${league.toLowerCase()}/team-meta/${encodeURIComponent(team)}?year=${encodeURIComponent(String(scheduleYear))}`,
        handlers.meta,
        { team },
      ),
      invokeRouteJson<Record<string, unknown>>(
        req,
        `/api/cfbd/${league.toLowerCase()}/season-stats/${encodeURIComponent(team)}?year=${encodeURIComponent(String(statsYear))}`,
        handlers.stats,
        { team },
      ),
      invokeRouteJson<Record<string, unknown>>(
        req,
        `/api/cfbd/${league.toLowerCase()}/leaders/${encodeURIComponent(team)}?year=${encodeURIComponent(String(statsYear))}`,
        handlers.leaders,
        { team },
      ),
      invokeRouteJson<Record<string, unknown>>(
        req,
        `/api/cfbd/${league.toLowerCase()}/schedule/${encodeURIComponent(team)}?year=${encodeURIComponent(String(scheduleYear))}`,
        handlers.schedule,
        { team },
      ),
    ]);

    let leadersPayload =
      leadersResult.status === "fulfilled" ? leadersResult.value : null;

    const leadersAvailableCount =
      typeof leadersPayload?.availableCount === "number"
        ? leadersPayload.availableCount
        : Array.isArray(leadersPayload?.leaders)
          ? leadersPayload.leaders.filter(
              (entry: Record<string, unknown>) => entry.player && entry.stat != null,
            ).length
          : 0;

    if (leadersAvailableCount === 0 && allowPriorSeasonFallback()) {
      try {
        leadersPayload = await invokeRouteJson<Record<string, unknown>>(
          req,
          `/api/cfbd/${league.toLowerCase()}/leaders/${encodeURIComponent(team)}?year=${encodeURIComponent(String(statsYear - 1))}`,
          handlers.leaders,
          { team },
        );
      } catch {
        // Keep the original leaders payload or null if fallback also fails.
      }
    }

    const payload = {
      ok: true,
      league,
      team,
      statsYear,
      scheduleYear,
      meta: metaResult.status === "fulfilled" ? (metaResult.value.meta ?? null) : null,
      metaError:
        metaResult.status === "fulfilled"
          ? metaResult.value.ok === false
            ? (metaResult.value.error as string | null) ?? "Meta fetch failed"
            : null
          : metaResult.reason instanceof Error
            ? metaResult.reason.message
            : "Meta fetch failed",
      seasonStats:
        statsResult.status === "fulfilled" ? (statsResult.value.stats ?? null) : null,
      seasonTotals:
        statsResult.status === "fulfilled" ? (statsResult.value.seasonTotals ?? null) : null,
      seasonStatsYear:
        statsResult.status === "fulfilled" &&
        typeof statsResult.value.usedYear === "number"
          ? statsResult.value.usedYear
          : statsYear,
      seasonStatsError:
        statsResult.status === "fulfilled"
          ? statsResult.value.ok === false
            ? (statsResult.value.error as string | null) ?? "Season stats failed"
            : null
          : statsResult.reason instanceof Error
            ? statsResult.reason.message
            : "Season stats failed",
      leaders:
        leadersPayload && Array.isArray(leadersPayload.leaders)
          ? leadersPayload.leaders
          : null,
      leadersYear:
        leadersPayload && typeof leadersPayload.year === "number"
          ? leadersPayload.year
          : statsYear,
      leadersError:
        leadersPayload
          ? leadersPayload.ok === false
            ? (leadersPayload.error as string | null) ?? "Leaders failed"
            : null
          : leadersResult.status === "rejected"
            ? leadersResult.reason instanceof Error
              ? leadersResult.reason.message
              : "Leaders failed"
            : null,
      schedule:
        scheduleResult.status === "fulfilled" && Array.isArray(scheduleResult.value.games)
          ? scheduleResult.value.games
          : [],
      scheduleSeasonYear:
        scheduleResult.status === "fulfilled" &&
        typeof scheduleResult.value.resolvedYear === "number"
          ? scheduleResult.value.resolvedYear
          : scheduleYear,
      scheduleError:
        scheduleResult.status === "fulfilled"
          ? scheduleResult.value.ok === false
            ? (scheduleResult.value.error as string | null) ?? "Schedule failed"
            : null
          : scheduleResult.reason instanceof Error
            ? scheduleResult.reason.message
            : "Schedule failed",
    };

    setSnapshot(cacheKey, payload, snapshotTtlMs.analysis);
    return NextResponse.json(payload);
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
