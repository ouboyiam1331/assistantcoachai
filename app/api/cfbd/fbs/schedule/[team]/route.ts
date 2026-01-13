// app/api/cfbd/fbs/schedule/[team]/route.ts
import { NextResponse } from "next/server";

type CFBDScheduleGame = {
  id?: number;
  week?: number;
  season?: number;
  seasonType?: string; // "regular" | "postseason" | etc
  startDate?: string;
  startTimeTBD?: boolean;
  neutralSite?: boolean;
  conferenceGame?: boolean;

  homeTeam?: string;
  awayTeam?: string;
  homePoints?: number | null;
  awayPoints?: number | null;

  venue?: string | null;
};

function getAuthHeader() {
  const key = process.env.CFBD_API_KEY;
  if (!key) return null;
  return { Authorization: `Bearer ${key}` };
}

async function fetchGamesFromCFBD(url: string) {
  const auth = getAuthHeader();
  if (!auth) {
    return {
      ok: false,
      error: "Missing CFBD_API_KEY env var",
      url,
      games: [] as CFBDScheduleGame[],
    };
  }

  const res = await fetch(url, {
    headers: {
      ...auth,
      Accept: "application/json",
    },
    // avoid caching during dev
    cache: "no-store",
  });

  const text = await res.text();

  // CFBD should return JSON; if it returns HTML, we'll show it as an error
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    return {
      ok: false,
      error: `Non-JSON response from CFBD (${res.status})`,
      url,
      raw: text.slice(0, 500),
      games: [] as CFBDScheduleGame[],
    };
  }

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      `CFBD request failed (${res.status})`;
    return { ok: false, error: msg, url, games: [] as CFBDScheduleGame[] };
  }

  return { ok: true, url, games: Array.isArray(data) ? data : [] };
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ team: string }> | { team: string } }
) {
  try {
    // Next can pass params sync or async depending on version/build
    const params =
      ctx.params instanceof Promise ? await ctx.params : ctx.params;

    const teamSlug = params?.team;

    if (!teamSlug) {
      return NextResponse.json(
        { ok: false, error: "Missing team slug in route params" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const yearStr = searchParams.get("year") || "";
    const requestedYear = yearStr || String(new Date().getFullYear());

    // CFBD "team" expects the team name used by CFBD. In your app you're passing slug.
    // We try a few variants:
    // 1) team=teamSlug (your slug)
    // 2) team=teamSlug with hyphens -> spaces and title-ish preserved
    // 3) also try previous year if current year has no schedule published yet
    const attempts: Array<{ year: string; seasonType?: string; teamSent: string }> =
      [];

    const teamSent1 = teamSlug;
    const teamSent2 = teamSlug.replace(/-/g, " ");

    const yearsToTry = [requestedYear, String(Number(requestedYear) - 1)];
    const seasonTypesToTry: Array<string | undefined> = [
      undefined, // default
      "regular",
      "both",
    ];

    let finalGames: CFBDScheduleGame[] = [];
    let resolvedYear: string | null = null;
    let resolvedTeamSent: string | null = null;
    let usedUrl: string | null = null;

    for (const year of yearsToTry) {
      for (const seasonType of seasonTypesToTry) {
        for (const teamSent of [teamSent1, teamSent2]) {
          const base = "https://api.collegefootballdata.com/games";
          const qs = new URLSearchParams();
          qs.set("year", year);
          qs.set("team", teamSent);
          if (seasonType) qs.set("seasonType", seasonType);

          const url = `${base}?${qs.toString()}`;
          const result = await fetchGamesFromCFBD(url);

          attempts.push({ year, seasonType, teamSent });

          if (result.ok && result.games.length > 0) {
            finalGames = result.games;
            resolvedYear = year;
            resolvedTeamSent = teamSent;
            usedUrl = url;
            break;
          }

          // keep last url for debugging
          usedUrl = url;
        }
        if (finalGames.length) break;
      }
      if (finalGames.length) break;
    }

    // Sort by week then date (nice for table)
    finalGames.sort((a, b) => {
      const wa = a.week ?? 999;
      const wb = b.week ?? 999;
      if (wa !== wb) return wa - wb;
      const da = a.startDate ? Date.parse(a.startDate) : 0;
      const db = b.startDate ? Date.parse(b.startDate) : 0;
      return da - db;
    });

    return NextResponse.json({
      ok: true,
      requestedYear,
      resolvedYear,
      teamSlug,
      teamSent: resolvedTeamSent,
      url: usedUrl,
      count: finalGames.length,
      attempts,
      games: finalGames,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
