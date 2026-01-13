// app/api/tgem/v10/matchup/route.ts
import { NextResponse } from "next/server";
import { analyzeMatchupSeasonOnly } from "@/lib/tgem/v10/analyzeMatchup";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const team = searchParams.get("team");
    const opponent = searchParams.get("opponent");

    const matchupYear = Number(searchParams.get("year") ?? "2025");
    const statsYear = Number(searchParams.get("statsYear") ?? String(matchupYear));

    const neutral = (searchParams.get("neutral") ?? "").toLowerCase() === "true";
    const teamIsHomeParam = searchParams.get("teamIsHome");
    const teamIsHome =
      teamIsHomeParam == null ? undefined : teamIsHomeParam.toLowerCase() === "true";

    if (!team) {
      return NextResponse.json({ ok: false, error: "Missing team parameter" }, { status: 400 });
    }
    if (!opponent) {
      return NextResponse.json({ ok: false, error: "Missing opponent parameter" }, { status: 400 });
    }

    const analysis = await analyzeMatchupSeasonOnly({
      team,
      opponent,
      matchupYear,
      statsYear,
      isNeutralSite: neutral,
      teamIsHome,
    });

    return NextResponse.json(analysis, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown TGEM error" },
      { status: 500 }
    );
  }
}
