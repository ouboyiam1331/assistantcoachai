import { NextResponse } from "next/server";
import { getTeamMeta } from "@/data/teamMeta";
import { FBS_TEAMS } from "@/data/fbsTeams";

function toTeamNameFromSlug(slug: string) {
  // 1) try FBS list (your canonical names)
  const fromList = FBS_TEAMS.find((t: any) => t.slug === slug)?.name;
  if (fromList) return fromList;

  // 2) try teamMeta name
  const meta = getTeamMeta(slug);
  if (meta?.name) return meta.name;

  // 3) fallback: slug -> title case
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function pickNumber(obj: any, keys: string[]) {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

/**
 * CFBD season stats response formats vary by endpoint/version.
 * This normalizer tries multiple likely field names.
 */
function normalizeSeasonStats(raw: any) {
  // CFBD sometimes returns an object, sometimes an array (use first row)
  const row = Array.isArray(raw) ? raw[0] : raw;

  // Common “season team stats” shapes seen in the wild
  const games = pickNumber(row, ["games", "g", "totalGames"]);
  const pointsForPerGame = pickNumber(row, ["pointsPerGame", "ppg", "points_per_game"]);
  const pointsAgainstPerGame = pickNumber(row, ["oppPointsPerGame", "opponentPointsPerGame", "papg", "opp_ppg"]);

  const totalYardsPerGame = pickNumber(row, ["totalYardsPerGame", "yardsPerGame", "ypg"]);
  const passYardsPerGame = pickNumber(row, ["passYardsPerGame", "passingYardsPerGame", "pass_ypg"]);
  const rushYardsPerGame = pickNumber(row, ["rushYardsPerGame", "rushingYardsPerGame", "rush_ypg"]);

  const thirdDownPct = pickNumber(row, ["thirdDownPct", "thirdDownConvPct", "third_down_pct"]);
  const redZonePct = pickNumber(row, ["redZonePct", "redZoneConvPct", "red_zone_pct"]);

  const penaltyYardsPerGame = pickNumber(row, [
    "penaltyYardsPerGame",
    "penaltyYardsPg",
    "penalty_ypg",
    "penYardsPerGame",
  ]);

  const turnoversLost = pickNumber(row, ["turnoversLost", "turnovers", "turnovers_lost"]);

  return {
    games,
    pointsForPerGame,
    pointsAgainstPerGame,
    totalYardsPerGame,
    passYardsPerGame,
    rushYardsPerGame,
    thirdDownPct,
    redZonePct,
    penaltyYardsPerGame,
    turnoversLost,
  };
}

export async function GET(
  req: Request,
  context: { params: Promise<{ team: string }> }
) {
  const { team } = await context.params;
  const url = new URL(req.url);

  const yearParam = url.searchParams.get("year");
  const year = yearParam ? Number(yearParam) : 2025;

  const apiKey = process.env.CFBD_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "Missing CFBD_API_KEY env var" },
      { status: 500 }
    );
  }

  const teamName = toTeamNameFromSlug(team);

  async function fetchYear(y: number) {
    // CFBD “season stats” endpoint (team + year)
    // If your CFBD plan/endpoint differs, this is the ONLY line you’d change.
    const endpoint = `https://api.collegefootballdata.com/stats/season?year=${encodeURIComponent(
      String(y)
    )}&team=${encodeURIComponent(teamName)}`;

    const res = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      // avoid caching during dev
      cache: "no-store",
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    return { res, data, endpoint };
  }

  // Try requested year, then fallback to previous year if empty
  const first = await fetchYear(year);

  const firstArray = Array.isArray(first.data) ? first.data : [];
  const firstHasRows = first.res.ok && firstArray.length > 0;

  if (firstHasRows) {
    return NextResponse.json({
      ok: true,
      yearUsed: year,
      team: teamName,
      stats: normalizeSeasonStats(first.data),
    });
  }

  const fallbackYear = year - 1;
  const second = await fetchYear(fallbackYear);

  const secondArray = Array.isArray(second.data) ? second.data : [];
  const secondHasRows = second.res.ok && secondArray.length > 0;

  if (secondHasRows) {
    return NextResponse.json({
      ok: true,
      yearUsed: fallbackYear,
      team: teamName,
      stats: normalizeSeasonStats(second.data),
    });
  }

  // If both fail, return debug info (helps you diagnose key/endpoint issues)
  return NextResponse.json(
    {
      ok: false,
      error: "No season stats returned for requested year or fallback year.",
      requestedYear: year,
      fallbackYear,
      team: teamName,
    },
    { status: 404 }
  );
}
