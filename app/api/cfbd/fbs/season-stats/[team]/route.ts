// app/api/cfbd/fbs/season-stats/[team]/route.ts
import { NextResponse } from "next/server";

function normalizeTeamName(s: string) {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function isSameTeam(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  const na = normalizeTeamName(a);
  const nb = normalizeTeamName(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

function toNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseMadeAttempt(val: any): { made: number; att: number } | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  // common formats: "5-12", "5/12"
  const m = s.match(/^(\d+)\s*[-/]\s*(\d+)$/);
  if (!m) return null;
  const made = Number(m[1]);
  const att = Number(m[2]);
  if (!Number.isFinite(made) || !Number.isFinite(att) || att <= 0) return null;
  return { made, att };
}

function pickTeamFromTeams(teams: any[], teamParam: string) {
  const found = teams.find((t) => isSameTeam(t?.school, teamParam));
  if (found) return found;

  // fallback: some responses might use "team" instead of "school"
  const found2 = teams.find((t) => isSameTeam(t?.team, teamParam));
  return found2 ?? null;
}

function getStatValue(teamObj: any, wanted: string): any {
  // CFBD /games/teams commonly returns team.stats = [{ category, stat, value }]
  const stats: any[] = Array.isArray(teamObj?.stats) ? teamObj.stats : [];
  const match = stats.find((s) => String(s?.stat).toLowerCase() === wanted.toLowerCase());
  return match?.value ?? null;
}

function getFirstMatchingStat(teamObj: any, wantedList: string[]): any {
  for (const w of wantedList) {
    const v = getStatValue(teamObj, w);
    if (v !== null && v !== undefined && String(v).trim() !== "") return v;
  }
  return null;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ team: string }> }
) {
  try {
    const { team } = await ctx.params;
    if (!team) {
      return NextResponse.json({ ok: false, error: "Missing team param" }, { status: 400 });
    }

    const url = new URL(req.url);
    const year = Number(url.searchParams.get("year") || "2025");
    const seasonType = url.searchParams.get("seasonType") || "both"; // regular | postseason | both

    const apiKey = process.env.CFBD_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "Missing CFBD_API_KEY" }, { status: 500 });
    }

    const endpoint =
      `https://api.collegefootballdata.com/games/teams?year=${encodeURIComponent(String(year))}` +
      `&team=${encodeURIComponent(team)}` +
      `&seasonType=${encodeURIComponent(seasonType)}`;

    const r = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const data = await r.json();

    if (!r.ok) {
      return NextResponse.json(
        { ok: false, error: data?.message || data?.error || `CFBD error (${r.status})` },
        { status: 502 }
      );
    }

    const gamesArr: any[] = Array.isArray(data) ? data : [];
    // Each game element usually looks like: { id, season, week, teams: [{school, points, stats: [...]}, ...] }
    // We only use games with points present (final or at least scored)
    let gamesPlayed = 0;

    let pointsFor = 0;
    let pointsAgainst = 0;

    let totalYardsFor = 0;
    let passYardsFor = 0;
    let rushYardsFor = 0;

    let totalYardsAgainst = 0;

    let thirdMade = 0;
    let thirdAtt = 0;

    let rzMade = 0;
    let rzAtt = 0;

    let penalties = 0;
    let penaltyYards = 0;

    let turnovers = 0;
    let oppTurnovers = 0;

    for (const g of gamesArr) {
      const teams = Array.isArray(g?.teams) ? g.teams : [];
      if (teams.length < 2) continue;

      const me = pickTeamFromTeams(teams, team);
      if (!me) continue;

      const opp = teams.find((t) => t !== me) ?? null;
      if (!opp) continue;

      const myPts = toNum(me?.points);
      const oppPts = toNum(opp?.points);

      // if no score yet, skip (not final / no stats worth averaging)
      if (myPts === null || oppPts === null) continue;

      gamesPlayed += 1;
      pointsFor += myPts;
      pointsAgainst += oppPts;

      // Yards (try several common stat labels)
      const myTotalYards = toNum(getFirstMatchingStat(me, ["totalYards", "total yards"])) ?? 0;
      const myPassYards = toNum(getFirstMatchingStat(me, ["netPassingYards", "net passing yards", "passingYards"])) ?? 0;
      const myRushYards = toNum(getFirstMatchingStat(me, ["rushingYards", "rushing yards"])) ?? 0;

      const oppTotalYards = toNum(getFirstMatchingStat(opp, ["totalYards", "total yards"])) ?? 0;

      totalYardsFor += myTotalYards;
      passYardsFor += myPassYards;
      rushYardsFor += myRushYards;

      totalYardsAgainst += oppTotalYards;

      // 3rd down efficiency often "thirdDownEff" or "3rdDownEff" or "thirdDownConversions"
      const thirdVal =
        getFirstMatchingStat(me, ["thirdDownEff", "3rdDownEff", "third down efficiency"]) ??
        getFirstMatchingStat(me, ["thirdDownConversions"]); // sometimes a number only (less useful)

      const thirdParsed = parseMadeAttempt(thirdVal);
      if (thirdParsed) {
        thirdMade += thirdParsed.made;
        thirdAtt += thirdParsed.att;
      }

      // Red zone efficiency often "redZoneEff" or "red zone efficiency"
      const rzVal =
        getFirstMatchingStat(me, ["redZoneEff", "red zone efficiency"]) ??
        getFirstMatchingStat(me, ["redZoneConversions"]);

      const rzParsed = parseMadeAttempt(rzVal);
      if (rzParsed) {
        rzMade += rzParsed.made;
        rzAtt += rzParsed.att;
      }

      // Penalties often "penalties" as "8-60" or separate "penalties" and "penaltyYards"
      const penVal = getFirstMatchingStat(me, ["penalties", "penalty", "penalties-yards"]);
      const penParsed = parseMadeAttempt(penVal); // works for "8-60"
      if (penParsed) {
        penalties += penParsed.made;
        penaltyYards += penParsed.att;
      } else {
        const penCount = toNum(penVal);
        if (penCount !== null) penalties += penCount;
        const penYds = toNum(getFirstMatchingStat(me, ["penaltyYards", "penalty yards"]));
        if (penYds !== null) penaltyYards += penYds;
      }

      // Turnovers often "turnovers"
      const toVal = toNum(getFirstMatchingStat(me, ["turnovers"])) ?? 0;
      const oppToVal = toNum(getFirstMatchingStat(opp, ["turnovers"])) ?? 0;
      turnovers += toVal;
      oppTurnovers += oppToVal;
    }

    // If no games found in this year, we still return ok:true but stats will be null-ish
    const ppg = gamesPlayed ? pointsFor / gamesPlayed : null;
    const papg = gamesPlayed ? pointsAgainst / gamesPlayed : null;

    const ypg = gamesPlayed ? totalYardsFor / gamesPlayed : null;
    const passYpg = gamesPlayed ? passYardsFor / gamesPlayed : null;
    const rushYpg = gamesPlayed ? rushYardsFor / gamesPlayed : null;

    const ypgAllowed = gamesPlayed ? totalYardsAgainst / gamesPlayed : null;

    const thirdPct = thirdAtt ? (thirdMade / thirdAtt) * 100 : null;
    const rzPct = rzAtt ? (rzMade / rzAtt) * 100 : null;

    const penPg = gamesPlayed ? penalties / gamesPlayed : null;
    const penYdsPg = gamesPlayed ? penaltyYards / gamesPlayed : null;

    const toMarginPg = gamesPlayed ? (oppTurnovers - turnovers) / gamesPlayed : null;

    return NextResponse.json({
      ok: true,
      team,
      year,
      seasonType,
      stats: {
        games: gamesPlayed,

        pointsPerGame: ppg,
        pointsAllowedPerGame: papg,

        yardsPerGame: ypg,
        passYardsPerGame: passYpg,
        rushYardsPerGame: rushYpg,

        yardsAllowedPerGame: ypgAllowed,

        thirdDownPct: thirdPct,
        redZonePct: rzPct,

        penaltiesPerGame: penPg,
        penaltyYardsPerGame: penYdsPg,

        turnoverMarginPerGame: toMarginPg,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

