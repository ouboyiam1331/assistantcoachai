import { NextResponse, type NextRequest } from "next/server";
import { CfbdHttpError, cfbdGetJson } from "@/lib/cfbd/http";
import { getDefaultCfbSeasonYear } from "@/lib/cfbd/season";
import { resolveCfbdTeamName } from "@/lib/cfbd/teamName";

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

type AggregatedSeasonStats = {
  games: number;
  pointsPerGame: number | null;
  pointsAllowedPerGame: number | null;
  yardsPerGame: number | null;
  passYardsPerGame: number | null;
  rushYardsPerGame: number | null;
  yardsAllowedPerGame: number | null;
  thirdDownPct: number | null;
  redZonePct: number | null;
  penaltiesPerGame: number | null;
  penaltyYardsPerGame: number | null;
  turnoverMarginPerGame: number | null;
};

function getTeamFromParamsOrPath(req: Request, paramsTeam?: string) {
  if (paramsTeam && String(paramsTeam).trim()) return String(paramsTeam).trim();

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.lastIndexOf("season-stats");
  const fromPath = idx >= 0 ? parts[idx + 1] : "";
  return fromPath ? decodeURIComponent(fromPath) : "";
}

function safeNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const cleaned = String(v)
    .trim()
    .replace(/,/g, "")
    .replace(/%$/, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
function avg(sum: number, games: number) {
  return games > 0 ? sum / games : 0;
}
function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function parseMadeAttempt(value: unknown): [number, number] | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  const dash = s.match(/^(\d+(?:\.\d+)?)\s*[-/]\s*(\d+(?:\.\d+)?)$/);
  if (dash) {
    const made = Number(dash[1]);
    const att = Number(dash[2]);
    if (Number.isFinite(made) && Number.isFinite(att) && att > 0) {
      return [made, att];
    }
  }
  const of = s.match(/(\d+(?:\.\d+)?)\s+of\s+(\d+(?:\.\d+)?)/i);
  if (of) {
    const made = Number(of[1]);
    const att = Number(of[2]);
    if (Number.isFinite(made) && Number.isFinite(att) && att > 0) {
      return [made, att];
    }
  }
  return null;
}

/**
 * Pull penalties + red zone from CFBD /stats/season (best-effort).
 * You can enable debug by calling:
 * /api/cfbd/fbs/season-stats/{team}?year=2025&debugExtras=1
 */
async function fetchSeasonExtras(
  teamSent: string,
  year: number,
  debug: boolean,
  games: number,
) {
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

  // Build a searchable list of (name -> value)
  const items = arr
    .map((x: Record<string, unknown>) => {
      const rawValue =
        x?.statValue ?? x?.value ?? x?.statValueString ?? x?.stat ?? null;
      const rawName = String(
        x?.statName ?? x?.name ?? x?.category ?? x?.label ?? x?.stat ?? "",
      );
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

  const parseMadeAtt = (v: unknown): [number, number] | null => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    const m = s.match(/^(\d+(?:\.\d+)?)\s*[-/]\s*(\d+(?:\.\d+)?)$/);
    if (!m) return null;
    const made = Number(m[1]);
    const att = Number(m[2]);
    if (!Number.isFinite(made) || !Number.isFinite(att) || att <= 0) {
      return null;
    }
    return [made, att];
  };

  const getMadeAtt = (...keys: string[]) => {
    for (const k of keys) {
      const kk = k.toLowerCase().replace(/[^a-z0-9]/g, "");
      const hits = items.filter((it) => it.name === kk || it.name.includes(kk));
      for (const hit of hits) {
        const pairFromValue = parseMadeAtt(hit.rawValue);
        if (pairFromValue) return pairFromValue;

        const pairFromName = parseMadeAtt(hit.rawName);
        if (pairFromName) return pairFromName;

        // Some feeds use strings like "34 of 40"
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

  const rzMade = get(
    "redzonemade",
    "redzonescores",
    "redzonescoring",
    "redzonesuccesses",
  );
  const rzAtt = get("redzoneattempts", "redzoneatt", "redzonetrips");
  const rzTds = get("redzonetd", "redzonetds", "redzonetouchdowns");
  const rzFgs = get("redzonefg", "redzonefgs", "redzonefieldgoals");
  const rzPair = getMadeAtt("redzone", "redzonescoring", "redzoneefficiency");
  const rzMadeFromParts =
    rzTds != null || rzFgs != null ? (rzTds ?? 0) + (rzFgs ?? 0) : null;

  const redZonePctFromDirect =
    redZonePctDirect == null
      ? null
      : redZonePctDirect <= 1
        ? redZonePctDirect * 100
        : redZonePctDirect;

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
    penaltiesPerGame:
      penaltiesPerGame != null ? round1(penaltiesPerGame) : null,
    penaltyYardsPerGame:
      penaltyYardsPerGame != null ? round1(penaltyYardsPerGame) : null,
    redZonePct: redZonePct != null ? round1(redZonePct) : null,
    extrasByName,
    debugExtrasNames: debug
      ? items
          .filter((x) => x.rawValue != null)
          .slice(0, 60)
          .map((x) => ({ name: x.rawName, value: x.rawValue }))
      : undefined,
  };
}

function aggregate(rows: unknown[], teamNameForMatch: string): AggregatedSeasonStats {
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
  let redZonePctSum = 0;
  let redZonePctCount = 0;

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

    let t: TeamGameSide | null = null;
    let o: TeamGameSide | null = null;

    if (aName.includes(tq) || tq.includes(aName)) {
      t = a;
      o = b;
    } else if (bName.includes(tq) || tq.includes(bName)) {
      t = b;
      o = a;
    } else {
      // fallback (should be rare)
      t = a;
      o = b;
    }

    const tPts = safeNum(t?.points);
    const oPts = safeNum(o?.points);
    if (tPts == null || oPts == null) continue;

    games += 1;
    ptsFor += tPts;
    ptsAgainst += oPts;

    const tStats: TeamGameStat[] = Array.isArray(t?.stats)
      ? (t.stats as TeamGameStat[])
      : [];
    const oStats: TeamGameStat[] = Array.isArray(o?.stats)
      ? (o.stats as TeamGameStat[])
      : [];

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

    if (
      tThird?.stat &&
      typeof tThird.stat === "string" &&
      tThird.stat.includes("-")
    ) {
      const [m, a2] = tThird.stat.split("-").map((x: string) => Number(x));
      if (Number.isFinite(m) && Number.isFinite(a2)) {
        thirdMade += m;
        thirdAtt += a2;
      }
    }

    const tRedZone = tStats.find((s) => {
      const label = String(s?.category ?? s?.label ?? "").toLowerCase();
      return label.includes("red zone") || label.includes("redzone");
    });
    const rzPair = parseMadeAttempt(tRedZone?.stat ?? tRedZone?.value);
    if (rzPair) {
      redZoneMade += rzPair[0];
      redZoneAtt += rzPair[1];
    } else {
      const rawPct = safeNum(tRedZone?.stat ?? tRedZone?.value);
      if (rawPct != null) {
        const pct = rawPct <= 1 ? rawPct * 100 : rawPct;
        redZonePctSum += pct;
        redZonePctCount += 1;
      }
    }

    const tTo = statVal(tStats, "turnovers");
    const oTo = statVal(oStats, "turnovers");
    if (tTo != null) giveaways += tTo;
    if (oTo != null) takeaways += oTo;
  }

  const thirdPct = thirdAtt > 0 ? (thirdMade / thirdAtt) * 100 : null;
  const redZonePct =
    redZoneAtt > 0
      ? (redZoneMade / redZoneAtt) * 100
      : redZonePctCount > 0
        ? redZonePctSum / redZonePctCount
        : null;
  const toMarginPerGame = games > 0 ? (takeaways - giveaways) / games : null;

  return {
    games,
    pointsPerGame: games ? round1(avg(ptsFor, games)) : null,
    pointsAllowedPerGame: games ? round1(avg(ptsAgainst, games)) : null,

    yardsPerGame: ydsFor > 0 && games ? round1(avg(ydsFor, games)) : null,
    passYardsPerGame: passFor > 0 && games ? round1(avg(passFor, games)) : null,
    rushYardsPerGame: rushFor > 0 && games ? round1(avg(rushFor, games)) : null,

    yardsAllowedPerGame:
      ydsAgainst > 0 && games ? round1(avg(ydsAgainst, games)) : null,

    thirdDownPct: thirdPct != null ? round1(thirdPct) : null,

    redZonePct: redZonePct != null ? round1(redZonePct) : null,
    penaltiesPerGame: null,
    penaltyYardsPerGame: null,

    turnoverMarginPerGame:
      toMarginPerGame != null ? round1(toMarginPerGame) : null,
  };
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ team: string }> },
) {
  try {
    const { team } = await ctx.params;
    const { searchParams } = new URL(req.url);

    const teamSlug = getTeamFromParamsOrPath(req, team);
    const yearRaw =
      searchParams.get("year") ?? String(getDefaultCfbSeasonYear());
    const seasonType = searchParams.get("seasonType") ?? "both";
    const debugExtras = searchParams.get("debugExtras") === "1";

    if (!teamSlug) {
      return NextResponse.json(
        { ok: false, error: "Missing team parameter" },
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

    const teamSent = resolveCfbdTeamName(teamSlug);
    const yearsToTry = [year, year - 1];

    let usedYear = year;
    let rows: unknown[] = [];
    const cfbdErrors: { year: number; status: number; detail: string }[] = [];

    for (const y of yearsToTry) {
      let data: unknown = null;
      try {
        data = await cfbdGetJson<unknown>(
          "/games/teams",
          { year: y, team: teamSent, seasonType },
          {
            cacheTtlMs: 1000 * 60 * 60 * 18,
            team: teamSent,
            mockFactory: () => [],
          },
        );
      } catch (err: unknown) {
        if (err instanceof CfbdHttpError) {
          cfbdErrors.push({ year: y, status: err.status, detail: err.detail.slice(0, 400) });
        } else {
          cfbdErrors.push({ year: y, status: 500, detail: err instanceof Error ? err.message : "CFBD error" });
        }
        continue;
      }

      const arr = Array.isArray(data) ? data : [];
      if (arr.length > 0) {
        usedYear = y;
        rows = arr;
        break;
      }
    }

    const stats = aggregate(rows, teamSent);

    const extras = await fetchSeasonExtras(
      teamSent,
      usedYear,
      debugExtras,
      stats.games ?? 0,
    );
    if (extras.ok) {
      if (extras.redZonePct != null) stats.redZonePct = extras.redZonePct;
      if (extras.penaltiesPerGame != null) {
        stats.penaltiesPerGame = extras.penaltiesPerGame;
      }
      if (extras.penaltyYardsPerGame != null) {
        stats.penaltyYardsPerGame = extras.penaltyYardsPerGame;
      }
    }

    return NextResponse.json({
      ok: true,
      team: teamSlug,
      teamSent,
      year,
      usedYear,
      seasonType,
      stats,
      seasonTotals: extras.ok ? extras.extrasByName : null,
      extrasOk: extras.ok,
      extrasError: extras.ok ? null : extras,
      debugExtrasNames: extras.ok ? extras.debugExtrasNames : undefined,
      cfbdErrors: cfbdErrors.length ? cfbdErrors : undefined,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
