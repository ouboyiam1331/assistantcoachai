import { NextResponse, type NextRequest } from "next/server";
import { cfbdMockModeEnabled } from "@/lib/cfbd/http";
import { fetchFcsTeams } from "@/lib/cfbd/fcs";

const MOCK_FCS_TEAMS = [
  { id: null, school: "North Dakota State", conference: "Missouri Valley Football Conference", classification: "fcs", abbreviation: "NDSU", slug: "north-dakota-state" },
  { id: null, school: "South Dakota State", conference: "Missouri Valley Football Conference", classification: "fcs", abbreviation: "SDSU", slug: "south-dakota-state" },
  { id: null, school: "Montana", conference: "Big Sky", classification: "fcs", abbreviation: "MONT", slug: "montana" },
  { id: null, school: "Montana State", conference: "Big Sky", classification: "fcs", abbreviation: "MTST", slug: "montana-state" },
  { id: null, school: "Sacramento State", conference: "Big Sky", classification: "fcs", abbreviation: "SAC", slug: "sacramento-state" },
  { id: null, school: "Idaho", conference: "Big Sky", classification: "fcs", abbreviation: "IDHO", slug: "idaho" },
  { id: null, school: "Villanova", conference: "CAA", classification: "fcs", abbreviation: "NOVA", slug: "villanova" },
  { id: null, school: "Richmond", conference: "CAA", classification: "fcs", abbreviation: "RICH", slug: "richmond" },
  { id: null, school: "Delaware State", conference: "MEAC", classification: "fcs", abbreviation: "DSU", slug: "delaware-state" },
  { id: null, school: "Jackson State", conference: "SWAC", classification: "fcs", abbreviation: "JSU", slug: "jackson-state" },
  { id: null, school: "South Dakota", conference: "Missouri Valley Football Conference", classification: "fcs", abbreviation: "USD", slug: "south-dakota" },
  { id: null, school: "Princeton", conference: "Ivy League", classification: "fcs", abbreviation: "PRIN", slug: "princeton" },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const yearRaw = searchParams.get("year") ?? "2025";
    const year = Number(yearRaw);

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

    const teams = await fetchFcsTeams(year, apiKey);
    const shouldUseMockFallback = cfbdMockModeEnabled() && teams.length === 0;
    return NextResponse.json({
      ok: true,
      year,
      count: shouldUseMockFallback ? MOCK_FCS_TEAMS.length : teams.length,
      teams: shouldUseMockFallback ? MOCK_FCS_TEAMS : teams,
      source: shouldUseMockFallback ? "mock-fallback" : "cfbd",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
