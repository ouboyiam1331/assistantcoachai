import { NextRequest, NextResponse } from "next/server";
import { analyzeMatchupSeasonOnly } from "@/lib/tgem/v10";
import { getSnapshot, setSnapshot, snapshotTtlMs } from "@/lib/snapshots/store";
import { resolvePickemTeamIdentity } from "@/lib/pickem/teamSlug";

type PickemPhase = "regular" | "championship" | "postseason";

type BatchGameInput = {
  id: string;
  homeTeam?: string | null;
  awayTeam?: string | null;
  neutralSite?: boolean;
};

function batchSnapshotKey(args: {
  season: number;
  week: number;
  phase: PickemPhase;
  homeToken: string;
  awayToken: string;
  neutralSite: boolean;
}) {
  return `pickem_tgem_batch:${args.season}:${args.week}:${args.phase}:${args.homeToken}:${args.awayToken}:${args.neutralSite ? "neutral" : "home"}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      season?: number;
      week?: number;
      phase?: PickemPhase;
      games?: BatchGameInput[];
    };

    const season = Number(body?.season);
    const week = Number(body?.week);
    const phase = body?.phase ?? "regular";
    const games = Array.isArray(body?.games) ? body.games : [];

    if (!Number.isFinite(season) || season < 1900) {
      return NextResponse.json(
        { ok: false, error: "Invalid season" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(week) || week < 1) {
      return NextResponse.json(
        { ok: false, error: "Invalid week" },
        { status: 400 },
      );
    }
    if (!games.length) {
      return NextResponse.json(
        { ok: false, error: "Missing games" },
        { status: 400 },
      );
    }

    const results = await Promise.all(
      games.map(async (game) => {
        const home = resolvePickemTeamIdentity(game.homeTeam);
        const away = resolvePickemTeamIdentity(game.awayTeam);

        if (!home.token || !away.token) {
          return {
            gameId: game.id,
            ok: false,
            error: `Team mapping is incomplete for ${game.awayTeam ?? "TBD"} @ ${game.homeTeam ?? "TBD"}.`,
          };
        }

        const venue = game.neutralSite ? "neutral" : "home";
        const cacheKey = batchSnapshotKey({
          season,
          week,
          phase,
          homeToken: home.token,
          awayToken: away.token,
          neutralSite: Boolean(game.neutralSite),
        });
        const cached = getSnapshot<unknown>(cacheKey);
        if (cached) {
          return cached;
        }

        try {
          const data = await analyzeMatchupSeasonOnly({
            team: home.token,
            opponent: away.token,
            year: season,
            venue,
            phase,
            week,
            seasonType: phase === "postseason" ? "postseason" : "regular",
          });

          const payload = {
            gameId: game.id,
            ok: true,
            homeTeam: game.homeTeam ?? null,
            awayTeam: game.awayTeam ?? null,
            homeToken: home.token,
            awayToken: away.token,
            homeIsFbs: home.isFbs,
            awayIsFbs: away.isFbs,
            lean: data.lean ?? null,
            confidence:
              typeof data.confidence === "number" ? data.confidence : null,
            reasons: data.reasons ?? [],
          };
          setSnapshot(cacheKey, payload, snapshotTtlMs.analysis);
          return payload;
        } catch (error: unknown) {
          return {
            gameId: game.id,
            ok: false,
            error: error instanceof Error ? error.message : "TGEM batch analysis failed",
          };
        }
      }),
    );

    return NextResponse.json({ ok: true, results });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unexpected server error" },
      { status: 500 },
    );
  }
}
