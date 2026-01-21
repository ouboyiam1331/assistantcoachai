import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { team: string } }
) {
  const { team } = params;
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year") ?? "2024";

  const apiKey = process.env.CFBD_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "Missing CFBD_API_KEY env var" },
      { status: 500 }
    );
  }

  const url = `https://api.collegefootballdata.com/games?year=${year}&team=${encodeURIComponent(
    team
  )}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: `CFBD error ${res.status}` },
      { status: res.status }
    );
  }

  const data = await res.json();

  return NextResponse.json({
    ok: true,
    team,
    year,
    games: data,
  });
}
