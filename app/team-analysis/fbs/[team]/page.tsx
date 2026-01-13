"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { FBS_TEAMS } from "@/data/fbsTeams";
import { getTeamMeta } from "@/data/teamMeta";

type ScheduleGame = {
  id?: number;
  season?: number;
  week?: number | null;
  seasonType?: string | null;
  startDate?: string | null;

  neutralSite?: boolean | null;
  conferenceGame?: boolean | null;
  completed?: boolean | null;

  venue?: string | null;

  homeTeam?: string | null;
  awayTeam?: string | null;

  homePoints?: number | null;
  awayPoints?: number | null;
};

type SeasonStats = {
  games?: number | null;

  // Offense
  pointsPerGame?: number | null;
  yardsPerGame?: number | null;
  passYardsPerGame?: number | null;
  rushYardsPerGame?: number | null;

  // Defense
  pointsAllowedPerGame?: number | null;
  yardsAllowedPerGame?: number | null;

  // Situational
  thirdDownPct?: number | null; // 0-100
  redZonePct?: number | null;   // 0-100

  // Discipline / ball security
  penaltiesPerGame?: number | null;
  penaltyYardsPerGame?: number | null;
  turnoverMarginPerGame?: number | null;
};

function classifySubdivision(conference: string) {
  const powerConfs = new Set(["SEC", "Big Ten", "Big 12", "ACC"]);
  if (powerConfs.has(conference)) return "FBS – Power Conference";
  if (conference === "Independents") return "FBS – Independent";
  if (conference === "Unknown Conference") return "Unknown";
  return "FBS – Group of Five";
}

function fmt(n: number | null | undefined) {
  if (n === null || n === undefined) return "N/A";
  try {
    return n.toLocaleString();
  } catch {
    return String(n);
  }
}

function fmtBool(b: boolean | null | undefined) {
  if (b === null || b === undefined) return "N/A";
  return b ? "Yes" : "No";
}

function safeStr(s: string | null | undefined) {
  return s && String(s).trim().length ? String(s) : "N/A";
}

function parseDate(s: string | null | undefined) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateTime(startDate: string | null | undefined) {
  const d = parseDate(startDate);
  if (!d) return "TBD";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtNum(n: number | null | undefined, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return "N/A";
  return n.toFixed(digits);
}

function fmtPct(n: number | null | undefined, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return "N/A";
  return `${n.toFixed(digits)}%`;
}

// Tries to normalize whatever the API returns into our SeasonStats shape.
// This keeps us safe even if CFBD fields change or the API returns a slightly different format.
function normalizeSeasonStats(payload: any): SeasonStats | null {
  const src = payload?.stats ?? payload?.data ?? payload ?? null;
  if (!src) return null;

  // Some endpoints return arrays (one row). Handle that.
  const row = Array.isArray(src) ? src[0] : src;

  // If nothing meaningful exists, bail.
  if (!row || typeof row !== "object") return null;

  // Try multiple likely keys. We keep this defensive.
  const games = row.games ?? row.gp ?? row.totalGames ?? null;

  const pointsPerGame =
    row.pointsPerGame ??
    row.offense?.pointsPerGame ??
    row.offense?.ppg ??
    row.ppg ??
    null;

  const yardsPerGame =
    row.yardsPerGame ??
    row.offense?.yardsPerGame ??
    row.offense?.ypg ??
    row.ypg ??
    null;

  const passYardsPerGame =
    row.passYardsPerGame ??
    row.offense?.passYardsPerGame ??
    row.offense?.passYpg ??
    row.passYpg ??
    null;

  const rushYardsPerGame =
    row.rushYardsPerGame ??
    row.offense?.rushYardsPerGame ??
    row.offense?.rushYpg ??
    row.rushYpg ??
    null;

  const pointsAllowedPerGame =
    row.pointsAllowedPerGame ??
    row.defense?.pointsAllowedPerGame ??
    row.defense?.ppgAllowed ??
    row.ppgAllowed ??
    null;

  const yardsAllowedPerGame =
    row.yardsAllowedPerGame ??
    row.defense?.yardsAllowedPerGame ??
    row.defense?.ypgAllowed ??
    row.ypgAllowed ??
    null;

  const thirdDownPct =
    row.thirdDownPct ??
    row.situational?.thirdDownPct ??
    row.thirdDownConversionPct ??
    null;

  const redZonePct =
    row.redZonePct ??
    row.situational?.redZonePct ??
    row.redZoneScoringPct ??
    null;

  const penaltiesPerGame =
    row.penaltiesPerGame ??
    row.discipline?.penaltiesPerGame ??
    null;

  const penaltyYardsPerGame =
    row.penaltyYardsPerGame ??
    row.discipline?.penaltyYardsPerGame ??
    null;

  const turnoverMarginPerGame =
    row.turnoverMarginPerGame ??
    row.ballSecurity?.turnoverMarginPerGame ??
    null;

  return {
    games: games ?? null,
    pointsPerGame: pointsPerGame ?? null,
    yardsPerGame: yardsPerGame ?? null,
    passYardsPerGame: passYardsPerGame ?? null,
    rushYardsPerGame: rushYardsPerGame ?? null,
    pointsAllowedPerGame: pointsAllowedPerGame ?? null,
    yardsAllowedPerGame: yardsAllowedPerGame ?? null,
    thirdDownPct: thirdDownPct ?? null,
    redZonePct: redZonePct ?? null,
    penaltiesPerGame: penaltiesPerGame ?? null,
    penaltyYardsPerGame: penaltyYardsPerGame ?? null,
    turnoverMarginPerGame: turnoverMarginPerGame ?? null,
  };
}

function normalizeTeamName(s: string) {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, "") // remove (FL), (OH), etc
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "") // strip spaces/punctuation
    .trim();
}

function isSameTeam(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  const na = normalizeTeamName(a);
  const nb = normalizeTeamName(b);
  if (!na || !nb) return false;

  // exact match or one contains the other (helps "Miami" vs "Miami (FL)" etc)
  return na === nb || na.includes(nb) || nb.includes(na);
}

export default function FbsTeamPage() {
  const params = useParams<{ team: string }>();
  const slug = params?.team ?? "";

  const team = useMemo(() => {
    return FBS_TEAMS.find((t) => t.slug === slug) ?? null;
  }, [slug]);

  const meta = useMemo(() => {
    return slug ? getTeamMeta(slug) : null;
  }, [slug]);

  const teamName = team?.name ?? meta?.name ?? "Unknown Team";
  const conference = team?.conference ?? meta?.conference ?? "Unknown Conference";
  const subdivision = classifySubdivision(conference);

  // helper: map opponent team name -> slug (for matchup links)
  function nameToSlug(teamNameRaw: string | null | undefined) {
    if (!teamNameRaw) return null;
    const tn = teamNameRaw.toLowerCase();

    const exact = FBS_TEAMS.find((t) => t.name.toLowerCase() === tn);
    if (exact) return exact.slug;

    const loose = FBS_TEAMS.find((t) => tn.includes(t.name.toLowerCase()));
    if (loose) return loose.slug;

    return null;
  }

  // --- SCHEDULE
  const [schedule, setSchedule] = useState<ScheduleGame[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const year = 2025;

  // --- SEASON STATS (CFBD)
  const [seasonStats, setSeasonStats] = useState<SeasonStats | null>(null);
  const [seasonStatsYear, setSeasonStatsYear] = useState<number>(year);
  const [seasonStatsLoading, setSeasonStatsLoading] = useState(false);
  const [seasonStatsError, setSeasonStatsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchFor(y: number) {
      const res = await fetch(`/api/cfbd/fbs/season-stats/${slug}?year=${y}`);
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || `Season stats failed (${res.status})`);
      }
      const normalized = normalizeSeasonStats(data);
      return { normalized, raw: data };
    }

    async function load() {
      if (!slug) return;

      setSeasonStatsLoading(true);
      setSeasonStatsError(null);

      try {
        // Try current year first
        let y = year;
        let out = await fetchFor(y);

        // If 2025 has no stats yet, fallback to 2024 automatically
        if (!out.normalized || out.normalized.games == null) {
          y = year - 1;
          out = await fetchFor(y);
        }

        if (!cancelled) {
          setSeasonStatsYear(y);
          setSeasonStats(out.normalized);
        }
      } catch (e: any) {
        if (!cancelled) setSeasonStatsError(e?.message ?? "Unknown error");
      } finally {
        if (!cancelled) setSeasonStatsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!slug) return;

      setScheduleLoading(true);
      setScheduleError(null);

      try {
        const res = await fetch(`/api/cfbd/fbs/schedule/${slug}?year=${year}`);
        const data = await res.json();

        if (!res.ok || data?.ok === false) {
          const msg =
            data?.error ||
            data?.message ||
            `Schedule request failed (${res.status})`;
          throw new Error(msg);
        }

        const games: ScheduleGame[] = Array.isArray(data?.games)
          ? data.games
          : Array.isArray(data)
          ? data
          : [];

        // sort by date first, then week
        games.sort((a, b) => {
          const da = parseDate(a.startDate)?.getTime() ?? Number.POSITIVE_INFINITY;
          const db = parseDate(b.startDate)?.getTime() ?? Number.POSITIVE_INFINITY;
          if (da !== db) return da - db;

          const wa = a.week ?? Number.POSITIVE_INFINITY;
          const wb = b.week ?? Number.POSITIVE_INFINITY;
          return wa - wb;
        });

        if (!cancelled) setSchedule(games);
      } catch (e: any) {
        if (!cancelled) setScheduleError(e?.message ?? "Unknown error");
      } finally {
        if (!cancelled) setScheduleLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const location = meta?.location ?? null;

  const initials =
    teamName && teamName !== "Unknown Team"
      ? teamName
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((w) => w[0]!.toUpperCase())
          .join("")
      : "N/A";

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 20 }}>
      <div style={{ marginBottom: 14 }}>
        <Link href="/team-analysis/fbs" style={{ textDecoration: "none" }}>
          ← Back to FBS Teams
        </Link>
      </div>

      {/* Header */}
      <section style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 12,
            background: "#f4f4f4",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            flexShrink: 0,
            fontWeight: 700,
            color: "#555",
          }}
          title={teamName}
        >
          {initials}
        </div>

        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>{teamName}</h1>
          <div style={{ marginTop: 6, color: "#444" }}>
            <strong>Conference:</strong> {conference}{" "}
            <span style={{ color: "#999" }}>|</span>{" "}
            <strong>Subdivision:</strong> {subdivision}
          </div>
        </div>
      </section>

      <hr style={{ margin: "18px 0" }} />

      {/* Metadata */}
      <h2 style={{ margin: "0 0 10px 0", fontSize: 18 }}>Team Metadata</h2>

      <div
        style={{
          border: "1px solid #e6e6e6",
          borderRadius: 12,
          padding: 14,
          marginBottom: 16,
          background: "#fff",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <div>
            <strong>Abbreviation:</strong> {safeStr(meta?.abbreviation)}
          </div>
          <div>
            <strong>Mascot:</strong> {safeStr(meta?.mascot)}
          </div>
          <div>
            <strong>School Colors:</strong> {safeStr(meta?.color)}
          </div>
          <div>
            <strong>Timezone:</strong> {safeStr(location?.timezone)}
          </div>
        </div>
      </div>

      {/* Stadium / Location */}
      <h2 style={{ margin: "0 0 10px 0", fontSize: 18 }}>Stadium / Location</h2>
      <div
        style={{
          border: "1px solid #e6e6e6",
          borderRadius: 12,
          padding: 14,
          marginBottom: 18,
          background: "#fff",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <div>
            <strong>Stadium:</strong> {safeStr(location?.name)}
          </div>
          <div>
            <strong>City/State:</strong>{" "}
            {safeStr(location?.city)}
            {location?.state ? `, ${location.state}` : ""}
          </div>

          <div>
            <strong>Capacity:</strong> {fmt(location?.capacity ?? null)}
          </div>
          <div>
            <strong>Year Built:</strong> {fmt(location?.year_constructed ?? null)}
          </div>

          <div>
            <strong>Latitude:</strong>{" "}
            {location?.latitude === null || location?.latitude === undefined
              ? "N/A"
              : String(location.latitude)}
          </div>
          <div>
            <strong>Longitude:</strong>{" "}
            {location?.longitude === null || location?.longitude === undefined
              ? "N/A"
              : String(location.longitude)}
          </div>

          <div>
            <strong>Grass:</strong> {fmtBool(location?.grass ?? null)}
          </div>
          <div>
            <strong>Dome:</strong> {fmtBool(location?.dome ?? null)}
          </div>
        </div>
      </div>

    {/* TGEM v10 — Team Analysis (scaffold) */}
    <div
      style={{
        marginTop: 16,
        marginBottom: 16,
        border: "1px solid #e5e5e5",
        borderRadius: 12,
        padding: 12,
        background: "#fafafa",
      }}
    >
      <h2 style={{ margin: "0 0 10px 0", fontSize: 18 }}>
        TGEM v10 — Team Analysis (Scaffold)
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <strong>Overall:</strong> Placeholder (coming soon)
        </div>
        <div>
          <strong>Confidence:</strong> — / 100
        </div>

        <div>
          <strong>Offense:</strong> Placeholder
        </div>
        <div>
          <strong>Defense:</strong> Placeholder
        </div>

        <div>
          <strong>Discipline:</strong> Placeholder
        </div>
        <div>
          <strong>Special Teams:</strong> Placeholder
        </div>
      </div>
    </div>
    {/* Season Stats (Placeholder) */}
    {/* Season Stats (CFBD) */}
<section
  style={{
    marginTop: 14,
    padding: 12,
    border: "1px solid #ddd",
    borderRadius: 10,
    background: "#fff",
  }}
>
  <div style={{ fontWeight: 800, marginBottom: 8, color: "#111" }}>
    Season Stats ({seasonStatsYear})
  </div>

  {seasonStatsLoading ? (
    <div style={{ color: "#333" }}>Loading season stats…</div>
  ) : seasonStatsError ? (
    <div style={{ color: "#b00020" }}>Season stats error: {seasonStatsError}</div>
  ) : !seasonStats ? (
    <div style={{ color: "#333" }}>No season stats available.</div>
  ) : (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, color: "#111" }}>
      <div>
        <strong>Games:</strong> {seasonStats.games ?? "N/A"}
      </div>

      <div />

      <div>
        <strong>Offense PPG:</strong> {fmtNum(seasonStats.pointsPerGame)}
      </div>
      <div>
        <strong>Defense PPG Allowed:</strong> {fmtNum(seasonStats.pointsAllowedPerGame)}
      </div>

      <div>
        <strong>Offense YPG:</strong> {fmtNum(seasonStats.yardsPerGame)}
      </div>
      <div>
        <strong>Defense YPG Allowed:</strong> {fmtNum(seasonStats.yardsAllowedPerGame)}
      </div>

      <div>
        <strong>Pass YPG:</strong> {fmtNum(seasonStats.passYardsPerGame)}
      </div>
      <div>
        <strong>Rush YPG:</strong> {fmtNum(seasonStats.rushYardsPerGame)}
      </div>

      <div>
        <strong>3rd Down:</strong> {fmtPct(seasonStats.thirdDownPct)}
      </div>
      <div>
        <strong>Red Zone:</strong> {fmtPct(seasonStats.redZonePct)}
      </div>

      <div>
        <strong>Penalties / Game:</strong> {fmtNum(seasonStats.penaltiesPerGame)}
      </div>
      <div>
        <strong>Penalty Yds / Game:</strong> {fmtNum(seasonStats.penaltyYardsPerGame)}
      </div>

      <div>
        <strong>Turnover Margin / Game:</strong> {fmtNum(seasonStats.turnoverMarginPerGame)}
      </div>
    </div>
  )}

  <div style={{ marginTop: 10, color: "#333", fontSize: 13 }}>
    Note: If the current season isn’t available yet, AssistantCoachAI automatically falls back to the previous season.
  </div>
</section>

      {/* Schedule */}
      <h2 style={{ margin: "0 0 10px 0", fontSize: 18 }}>
        Schedule ({year})
      </h2>

      {scheduleLoading ? (
        <div style={{ color: "#666" }}>Loading schedule…</div>
      ) : scheduleError ? (
        <div style={{ color: "#b00020" }}>Schedule error: {scheduleError}</div>
      ) : schedule.length === 0 ? (
        <div style={{ color: "#666" }}>No games returned for {year}.</div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>
                  Week
                </th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>
                  Date
                </th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>
                  Matchup
                </th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>
                  Venue
                </th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>
                  Result
                </th>
              </tr>
            </thead>

            <tbody>
              {schedule.map((g, idx) => {
                const week = g.week ?? "—";
                const dateStr = formatDateTime(g.startDate);

                const matchupText =
                  g.homeTeam && g.awayTeam ? `${g.awayTeam} @ ${g.homeTeam}` : "TBD";

                const opponentName =
                  g.homeTeam?.toLowerCase() === teamName.toLowerCase()
                    ? g.awayTeam
                    : g.homeTeam;

                const opponentSlug = nameToSlug(opponentName);

                // IMPORTANT: this matches your folder: app/team-analysis/fbs/[team]/matchup/[gameId]/page.tsx
                const matchupHref =
                  g.id != null
                    ? `/team-analysis/fbs/${slug}/matchup/${encodeURIComponent(String(g.id))}${
                        opponentSlug ? `?opponent=${encodeURIComponent(opponentSlug)}` : ""
                      }`
                    : opponentSlug
                    ? `/team-analysis/fbs/${slug}/matchup?opponent=${encodeURIComponent(
                        opponentSlug
                      )}`
                    : null;

                const venue = safeStr(g.venue);

                const hasScore =
                  g.homePoints != null && g.awayPoints != null;

                let result = g.completed ? "Final" : "TBD";

                if (hasScore) {
                  // keep the same score display format you already use: away - home
                  const scoreText = `${g.awayPoints} - ${g.homePoints}`;

                  const teamIsHome = isSameTeam(teamName, g.homeTeam);
                  const teamIsAway = isSameTeam(teamName, g.awayTeam);

                  // Determine W/L/T from the page team's perspective
                  let tag: "W" | "L" | "T" | "" = "";

                  if (g.homePoints === g.awayPoints) {
                    tag = "T";
                  } else if (teamIsHome) {
                    tag = g.homePoints > g.awayPoints ? "W" : "L";
                  } else if (teamIsAway) {
                    tag = g.awayPoints > g.homePoints ? "W" : "L";
                  } else {
                    // fallback (shouldn't happen often)
                    tag = "";
                  }

                  result = tag ? `${tag} ${scoreText}` : scoreText;
                }


                return (
                  <tr key={String(g.id ?? idx)}>
                    <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                      {week}
                    </td>

                    <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                      {dateStr}
                    </td>

                    <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                      {matchupHref ? (
                        <Link href={matchupHref} style={{ textDecoration: "underline" }}>
                          {matchupText}
                        </Link>
                      ) : (
                        matchupText
                      )}
                    </td>

                    <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                      {venue}
                    </td>

                    <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                      {result}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
