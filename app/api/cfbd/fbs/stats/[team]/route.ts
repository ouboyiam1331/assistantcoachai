// app/api/cfbd/fbs/stats/[team]/route.ts
import { NextResponse } from "next/server";
import { FBS_TEAMS } from "@/data/fbsTeams";
import { getTeamMeta } from "@/data/teamMeta";

function slugToTeamName(slug: string) {
  const fromList = FBS_TEAMS.find((t) => t.slug === slug)?.name;
  const fromMeta = getTeamMeta(slug)?.name;
  return fromList ?? fromMeta ?? slug;
}

export async function GET(
  req: Request,
  { params }: { params: { team: string } }
) {
  try {
    const slug = params?.team;
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year") ?? "2025";

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Missing team slug in route params" },
        { status: 400 }
      );
    }

    const teamName = slugToTeamName(slug);

    const apiKey = process.env.CFBD_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "Missing CFBD_API_KEY env var" },
        { status: 500 }
      );
    }

    // CFBD endpoint (season stats). This commonly returns an array of stat objects.
    // If your existing schedule route uses a different base URL, match that.
    const url = new URL("https://api.collegefootballdata.com/stats/season");
    url.searchParams.set("year", String(year));
    url.searchParams.set("team", teamName);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      // helps avoid weird caching while developing
      cache: "no-store",
    });

    const text = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `CFBD stats request failed (${res.status})`,
          details: text.slice(0, 500),
        },
        { status: res.status }
      );
    }

    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "CFBD stats response was not valid JSON",
          details: text.slice(0, 200),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      teamSlug: slug,
      teamName,
      year: Number(year),
      raw: json,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
