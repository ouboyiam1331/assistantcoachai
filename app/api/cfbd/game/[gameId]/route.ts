import { NextResponse } from "next/server";

const CFBD_API = "https://api.collegefootballdata.com";
const API_KEY = process.env.CFBD_API_KEY;

export async function GET(
  _req: Request,
  { params }: { params: { gameId: string } }
) {
  try {
    const gameId = params?.gameId;

    if (!gameId) {
      return NextResponse.json(
        { ok: false, error: "Missing gameId parameter" },
        { status: 400 }
      );
    }

    if (!API_KEY) {
      return NextResponse.json(
        { ok: false, error: "CFBD_API_KEY not configured" },
        { status: 500 }
      );
    }

    const res = await fetch(`${CFBD_API}/games?id=${gameId}`, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        {
          ok: false,
          error: `CFBD request failed (${res.status})`,
          detail: text,
        },
        { status: res.status }
      );
    }

    const games = await res.json();

    if (!Array.isArray(games) || games.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Game not found" },
        { status: 404 }
      );
    }

    // CFBD returns an array even for a single ID
    return NextResponse.json(games[0]);
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Unexpected server error",
      },
      { status: 500 }
    );
  }
}
