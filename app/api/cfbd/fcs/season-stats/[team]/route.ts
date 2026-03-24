import { NextResponse, type NextRequest } from "next/server";
import { CfbdHttpError, cfbdGetJson, cfbdMockModeEnabled } from "@/lib/cfbd/http";
import { findFcsTeamBySlug, resolveTeamFromParamsOrPath } from "@/lib/cfbd/fcs";
import { getStatsSeasonYear } from "@/lib/cfbd/season";

type TeamGameStat = {
  category?: unknown;
  label?: unknown;
  stat?: unknown;
  value?: unknown;
};

type TeamGameSide = {
  school?: unknown;
  team?: unknown;
  name?: unknown;
  points?: unknown;
  stats?: unknown;
};

function safeNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(String(v).trim().replace(/,/g, "").replace(/%$/, ""));
  return Number.isFinite(n) ? n : null;
}

function avg(sum: number, games: number) {
  return games > 0 ? sum / games : 0;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function norm(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function parseMadeAttempt(value: unknown): [number, number] | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  const m = s.match(/(\d+)\s*[-/]\s*(\d+)/);
  if (!m) return null;
  const made = Number(m[1]);
  const att = Number(m[2]);
  if (!Number.isFinite(made) || !Number.isFinite(att) || att <= 0) return null;
  return [made, att];
}

async function fetchSeasonExtras(teamSent: string, year: number, games: number) {
  let data: unknown = null;
  try {
    data = await cfbdGetJson<unknown>(
      "/stats/season",
      { year, team: teamSent },
      { cacheTtlMs: 1000 * 60 * 60 * 24, team: teamSent, mockFactory: () => [] },
    );
  } catch (err: unknown) {
    if (err instanceof CfbdHttpError) {
      return {
        ok: false as const,
        error: `CFBD season extras failed (${err.status})`,
        detail: err.detail.slice(0, 800),
        url: err.url,
      };
    }
    return {
      ok: false as const,
      error: "CFBD season extras failed",
      detail: err instanceof Error ? err.message : "Unknown error",
      url: "",
    };
  }

  const arr: Record<string, unknown>[] = Array.isArray(data)
    ? (data as Record<string, unknown>[])
    : [];

  const items = arr
    .map((x) => {
      const rawValue = x?.statValue ?? x?.value ?? x?.statValueString ?? x?.stat ?? null;
      const rawName = String(x?.statName ?? x?.name ?? x?.category ?? x?.label ?? x?.stat ?? "");
      const name = rawName.toLowerCase().replace(/[^a-z0-9]/g, "");
      const val = safeNum(rawValue);
      return { rawName, rawValue, name, val };
    })
    .filter((x) => x.name);

  const extrasByName: Record<string, number> = {};
  for (const it of items) {
    if (it.val == null) continue;
    const key = String(it.rawName || it.name || "").trim();
    if (!key) continue;
    extrasByName[key] = it.val;
  }

  const findItem = (...keys: string[]) => {
    for (const k of keys) {
      const kk = k.toLowerCase().replace(/[^a-z0-9]/g, "");
      const hit = items.find((it) => it.name === kk || it.name.includes(kk));
      if (hit) return hit;
    }
    return null;
  };

  const get = (...keys: string[]) => {
    const hit = findItem(...keys);
    return hit?.val ?? null;
  };

  const getMadeAtt = (...keys: string[]) => {
    for (const k of keys) {
      const kk = k.toLowerCase().replace(/[^a-z0-9]/g, "");
      const hits = items.filter((it) => it.name === kk || it.name.includes(kk));
      for (const hit of hits) {
        const pairFromValue = parseMadeAttempt(hit.rawValue);
        if (pairFromValue) return pairFromValue;
        const pairFromName = parseMadeAttempt(hit.rawName);
        if (pairFromName) return pairFromName;
        const s = String(hit.rawValue ?? "");
        const m = s.match(/(\d+(?:\.\d+)?)\s+of\s+(\d+(?:\.\d+)?)/i);
        if (m) {
          const made = Number(m[1]);
          const att = Number(m[2]);
          if (Number.isFinite(made) && Number.isFinite(att) && att > 0) {
            return [made, att] as [number, number];
          }
        }
      }
    }
    return null;
  };

  const penaltiesPerGameDirect =
    get("penaltiespergame", "penaltiespg", "penaltiesgame") ?? null;
  const penaltiesTotal =
    get("penalties", "totalpenalties", "offensivepenalties") ?? null;
  const penaltiesPerGame =
    penaltiesPerGameDirect != null
      ? penaltiesPerGameDirect
      : penaltiesTotal != null && games > 0
        ? penaltiesTotal / games
        : null;

  const penaltyYardsPerGameDirect =
    get("penaltyyardspergame", "penaltyydspergame", "penaltyyardspg") ?? null;
  const penaltyYardsTotal =
    get("penaltyyards", "penaltyyds", "totalpenaltyyards") ?? null;
  const penaltyYardsPerGame =
    penaltyYardsPerGameDirect != null
      ? penaltyYardsPerGameDirect
      : penaltyYardsTotal != null && games > 0
        ? penaltyYardsTotal / games
        : null;

  const redZonePctDirect =
    get("redzonepct", "redzonepercentage", "redzoneefficiency") ?? null;
  const rzMade = get("redzonemade", "redzonescores", "redzonescoring", "redzonesuccesses");
  const rzAtt = get("redzoneattempts", "redzoneatt", "redzonetrips");
  const rzTds = get("redzonetd", "redzonetds", "redzonetouchdowns");
  const rzFgs = get("redzonefg", "redzonefgs", "redzonefieldgoals");
  const rzPair = getMadeAtt("redzone", "redzonescoring", "redzoneefficiency");
  const rzMadeFromParts = rzTds != null || rzFgs != null ? (rzTds ?? 0) + (rzFgs ?? 0) : null;

  const redZonePctFromDirect =
    redZonePctDirect == null ? null : redZonePctDirect <= 1 ? redZonePctDirect * 100 : redZonePctDirect;
  const redZonePct =
    redZonePctFromDirect != null
      ? redZonePctFromDirect
      : rzMade != null && rzAtt != null && rzAtt > 0
        ? (rzMade / rzAtt) * 100
        : rzMadeFromParts != null && rzAtt != null && rzAtt > 0
          ? (rzMadeFromParts / rzAtt) * 100
          : rzPair != null
            ? (rzPair[0] / rzPair[1]) * 100
            : null;

  return {
    ok: true as const,
    penaltiesPerGame: penaltiesPerGame != null ? round1(penaltiesPerGame) : null,
    penaltyYardsPerGame: penaltyYardsPerGame != null ? round1(penaltyYardsPerGame) : null,
    redZonePct: redZonePct != null ? round1(redZonePct) : null,
    extrasByName,
  };
}

function aggregate(rows: unknown[], teamNameForMatch: string) {
  let games = 0;
  let ptsFor = 0;
  let ptsAgainst = 0;
  let ydsFor = 0;
  let ydsAgainst = 0;
  let passFor = 0;
  let rushFor = 0;
  let thirdMade = 0;
  let thirdAtt = 0;
  let redZoneMade = 0;
  let redZoneAtt = 0;
  let penalties = 0;
  let penaltyYds = 0;
  let giveaways = 0;
  let takeaways = 0;

  const tq = norm(teamNameForMatch);

  for (const g of rows) {
    const teamsRaw = (g as { teams?: unknown })?.teams;
    const teams = Array.isArray(teamsRaw) ? teamsRaw : null;
    if (!teams || teams.length < 2) continue;

    const a = teams[0] as TeamGameSide;
    const b = teams[1] as TeamGameSide;

    const aName = norm(String(a?.school ?? a?.team ?? a?.name ?? ""));
    const bName = norm(String(b?.school ?? b?.team ?? b?.name ?? ""));
    const t = aName.includes(tq) || tq.includes(aName) ? a : bName.includes(tq) || tq.includes(bName) ? b : a;
    const o = t === a ? b : a;

    const tPts = safeNum(t?.points);
    const oPts = safeNum(o?.points);
    if (tPts == null || oPts == null) continue;

    games += 1;
    ptsFor += tPts;
    ptsAgainst += oPts;

    const tStats: TeamGameStat[] = Array.isArray(t?.stats) ? (t.stats as TeamGameStat[]) : [];
    const oStats: TeamGameStat[] = Array.isArray(o?.stats) ? (o.stats as TeamGameStat[]) : [];

    function statVal(statsArr: TeamGameStat[], keyContains: string) {
      const hit = statsArr.find((s) =>
        String(s?.category ?? s?.label ?? "")
          .toLowerCase()
          .includes(keyContains),
      );
      return safeNum(hit?.stat ?? hit?.value);
    }

    const tTotal = statVal(tStats, "total");
    const oTotal = statVal(oStats, "total");
    if (tTotal != null) ydsFor += tTotal;
    if (oTotal != null) ydsAgainst += oTotal;

    const tPass = statVal(tStats, "passing");
    const tRush = statVal(tStats, "rushing");
    if (tPass != null) passFor += tPass;
    if (tRush != null) rushFor += tRush;

    const tThird = tStats.find((s) =>
      String(s?.category ?? "")
        .toLowerCase()
        .includes("third"),
    );
    const thirdPair = parseMadeAttempt(tThird?.stat);
    if (thirdPair) {
      thirdMade += thirdPair[0];
      thirdAtt += thirdPair[1];
    }

    const tRz = tStats.find((s) =>
      String(s?.category ?? "")
        .toLowerCase()
        .includes("red zone"),
    );
    const rzPair = parseMadeAttempt(tRz?.stat);
    if (rzPair) {
      redZoneMade += rzPair[0];
      redZoneAtt += rzPair[1];
    }

    const tPen = statVal(tStats, "penalt");
    const tPenY = statVal(tStats, "penalty yards") ?? statVal(tStats, "penalty yds");
    if (tPen != null) penalties += tPen;
    if (tPenY != null) penaltyYds += tPenY;

    const tTo = statVal(tStats, "turnovers");
    const oTo = statVal(oStats, "turnovers");
    if (tTo != null) giveaways += tTo;
    if (oTo != null) takeaways += oTo;
  }

  const thirdPct = thirdAtt > 0 ? (thirdMade / thirdAtt) * 100 : null;
  const redZonePct = redZoneAtt > 0 ? (redZoneMade / redZoneAtt) * 100 : null;
  const toMarginPerGame = games > 0 ? (takeaways - giveaways) / games : null;

  return {
    games,
    pointsPerGame: games ? round1(avg(ptsFor, games)) : null,
    pointsAllowedPerGame: games ? round1(avg(ptsAgainst, games)) : null,
    yardsPerGame: ydsFor > 0 && games ? round1(avg(ydsFor, games)) : null,
    passYardsPerGame: passFor > 0 && games ? round1(avg(passFor, games)) : null,
    rushYardsPerGame: rushFor > 0 && games ? round1(avg(rushFor, games)) : null,
    yardsAllowedPerGame: ydsAgainst > 0 && games ? round1(avg(ydsAgainst, games)) : null,
    thirdDownPct: thirdPct != null ? round1(thirdPct) : null,
    redZonePct: redZonePct != null ? round1(redZonePct) : null,
    penaltiesPerGame: penalties > 0 && games ? round1(avg(penalties, games)) : null,
    penaltyYardsPerGame: penaltyYds > 0 && games ? round1(avg(penaltyYds, games)) : null,
    turnoverMarginPerGame: toMarginPerGame != null ? round1(toMarginPerGame) : null,
  };
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ team: string }> },
) {
  try {
    const { team } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const teamSlug = resolveTeamFromParamsOrPath(req, "season-stats", team);
    const yearRaw =
      searchParams.get("year") ?? String(getStatsSeasonYear());
    const year = Number(yearRaw);
    const seasonType = searchParams.get("seasonType") ?? "both";

    if (!teamSlug) {
      return NextResponse.json(
        { ok: false, error: "Missing team parameter" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(year) || year < 1900) {
      return NextResponse.json(
        { ok: false, error: "Invalid year parameter" },
        { status: 400 },
      );
    }
    const apiKey = process.env.CFBD_API_KEY ?? "";
    if (!apiKey && !cfbdMockModeEnabled()) {
      return NextResponse.json(
        { ok: false, error: "CFBD_API_KEY not configured" },
        { status: 500 },
      );
    }

    const teamFound = await findFcsTeamBySlug(teamSlug, year, apiKey);
    if (!teamFound) {
      return NextResponse.json({
        ok: true,
        team: teamSlug,
        teamSent: null,
        year,
        usedYear: year,
        seasonType,
        stats: aggregate([], teamSlug),
        seasonTotals: null,
        extrasOk: false,
        extrasError: { error: "FCS team not found for slug" },
        warning: "FCS team not found for slug",
      });
    }

    const yearsToTry = [year, year - 1];
    let usedYear = year;
    let rows: unknown[] = [];
    const cfbdErrors: { year: number; status: number; detail: string }[] = [];

    for (const y of yearsToTry) {
      try {
        const data = await cfbdGetJson<unknown>(
          "/games/teams",
          { year: y, team: teamFound.school, seasonType },
          {
            cacheTtlMs: 1000 * 60 * 60 * 18,
            team: teamFound.school,
            mockFactory: () => [],
          },
        );
        const arr = Array.isArray(data) ? data : [];
        if (arr.length > 0) {
          rows = arr;
          usedYear = y;
          break;
        }
      } catch (err: unknown) {
        if (err instanceof CfbdHttpError) {
          cfbdErrors.push({ year: y, status: err.status, detail: err.detail.slice(0, 400) });
        } else {
          cfbdErrors.push({ year: y, status: 500, detail: err instanceof Error ? err.message : "CFBD error" });
        }
        continue;
      }
    }

    const stats = aggregate(rows, teamFound.school);
    const extras = await fetchSeasonExtras(teamFound.school, usedYear, stats.games ?? 0);
    if (extras.ok) {
      if (extras.redZonePct != null) stats.redZonePct = extras.redZonePct;
      if (extras.penaltiesPerGame != null) stats.penaltiesPerGame = extras.penaltiesPerGame;
      if (extras.penaltyYardsPerGame != null) {
        stats.penaltyYardsPerGame = extras.penaltyYardsPerGame;
      }
    }

    return NextResponse.json({
      ok: true,
      team: teamSlug,
      teamSent: teamFound.school,
      year,
      usedYear,
      seasonType,
      stats,
      seasonTotals: extras.ok ? extras.extrasByName : null,
      extrasOk: extras.ok,
      extrasError: extras.ok ? null : extras,
      cfbdErrors: cfbdErrors.length ? cfbdErrors : undefined,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
