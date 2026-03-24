"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { FBS_TEAMS } from "@/data/fbsTeams";
import {
  AUTO_SYNC_MS,
  getSlate,
  syncFbsSlatesFromApi,
  upsertSlate,
  type GameSuggestion,
  type PickChoice,
  type PickemPhase,
  type PickemSlate,
  type SlateGame,
  type SlateRecord,
} from "@/lib/pickem/storage";
import { resolvePickemTeamIdentity } from "@/lib/pickem/teamSlug";

const AUTO_PICK_CONFIDENCE_MIN = 60;

const FBS_CONFERENCE_BY_SLUG = new Map(
  FBS_TEAMS.map((t) => [t.slug, t.conference]),
);

function conferenceTier(conference?: string | null) {
  const c = String(conference ?? "");
  if (c === "SEC" || c === "Big Ten") return 3;
  if (c === "ACC" || c === "Big 12") return 2;
  return 1;
}

type WeekGame = {
  id?: number;
  startDate?: string | null;
  homeTeam?: string | null;
  awayTeam?: string | null;
  venue?: string | null;
  neutralSite?: boolean | null;
  completed?: boolean | null;
  homePoints?: number | null;
  awayPoints?: number | null;
};

function parseDate(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDate(s?: string | null) {
  const d = parseDate(s);
  if (!d) return "TBD";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toSlateGame(g: WeekGame, idx: number): SlateGame {
  const hasScore = g.homePoints != null && g.awayPoints != null;
  return {
    id: String(g.id ?? idx),
    startDate: g.startDate ?? null,
    homeTeam: g.homeTeam ?? null,
    awayTeam: g.awayTeam ?? null,
    venue: g.venue ?? null,
    neutralSite: !!g.neutralSite,
    completed: Boolean(g.completed || hasScore),
    homePoints: g.homePoints ?? null,
    awayPoints: g.awayPoints ?? null,
  };
}

function gradeRecord(games: SlateGame[], picks: Record<string, PickChoice>): SlateRecord {
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let pending = 0;

  for (const g of games) {
    const pick = picks[g.id] ?? null;
    if (!pick) continue;

    const hasScore = g.homePoints != null && g.awayPoints != null;
    if (!hasScore) {
      pending += 1;
      continue;
    }
    const homePoints = g.homePoints!;
    const awayPoints = g.awayPoints!;

    if (homePoints === awayPoints) {
      pushes += 1;
      continue;
    }

    const winner: PickChoice = homePoints > awayPoints ? "home" : "away";
    if (winner === pick) wins += 1;
    else losses += 1;
  }

  return { wins, losses, pushes, pending };
}

function derivePickemPhase(week: number): "regular" | "championship" | "postseason" {
  if (week >= 16) return "postseason";
  if (week >= 14) return "championship";
  return "regular";
}

function phaseToLabel(phase: PickemPhase) {
  if (phase === "postseason") return "Bowl / CFP / Postseason";
  if (phase === "championship") return "Championship";
  return "Regular Season";
}

function buildCoachLeanSynopsis(
  suggestion: GameSuggestion | null,
  game: SlateGame,
  phase: "regular" | "championship" | "postseason",
) {
  if (!suggestion) return "";
  const away = game.awayTeam ?? "Away";
  const home = game.homeTeam ?? "Home";
  const leaning = suggestion.pick === "home" ? home : away;
  const pressureSide = suggestion.pick === "home" ? away : home;
  const confidence =
    typeof suggestion.confidence === "number"
      ? `${Math.round(suggestion.confidence)}`
      : "N/A";
  const isDataStatusReason = (reason: string) => {
    const r = reason.toLowerCase();
    return (
      r.includes("season stats loaded") ||
      r.includes("yearused") ||
      r.includes("missing") ||
      r.includes("fallback") ||
      r.includes("phase weights") ||
      r.includes("module coverage") ||
      r.includes("feature coverage")
    );
  };
  const meaningful = suggestion.reasons.filter((r) => {
    const text = String(r).trim();
    return text.length > 0 && !isDataStatusReason(text);
  });
  const topReasonA = meaningful[0] ?? "cleaner execution profile";
  const topReasonB = meaningful[1] ?? "better down-to-down consistency";
  const swingFactor =
    meaningful.find((r) => /turnover|availability|injury|volatility|penalt|red zone/i.test(r)) ??
    "turnover control and red-zone execution";
  const phaseLabel =
    phase === "postseason" ? "postseason" : phase === "championship" ? "championship-week" : "regular-season";
  const confidenceNum = typeof suggestion.confidence === "number" ? suggestion.confidence : null;
  const confidenceTier =
    confidenceNum == null ? "unknown" : confidenceNum >= 70 ? "high" : confidenceNum >= 56 ? "medium" : "low";

  if (confidenceTier === "high") {
    return `Coach read: TGEM leans ${leaning} (confidence ${confidence}) in this ${phaseLabel} lens with strong conviction. The edge is built on ${topReasonA} and ${topReasonB}. The swing factor is ${swingFactor}. ${pressureSide} needs early-down wins plus clean ball security to flip this.`;
  }
  if (confidenceTier === "medium") {
    return `Coach read: TGEM leans ${leaning} (confidence ${confidence}) in this ${phaseLabel} lens, but this is still a playable fight. The edge comes from ${topReasonA} with support from ${topReasonB}. Swing factor: ${swingFactor}. ${pressureSide} can turn it with cleaner situational execution.`;
  }
  return `Coach read: this projects as a tight game in the ${phaseLabel} lens (confidence ${confidence}). TGEM gives a slight lean to ${leaning}, driven by ${topReasonA}, but the margin is thin and volatility is real. Biggest swing point: ${swingFactor}. ${pressureSide} can absolutely take this with a clean first half and turnover edge.`;
}

function summarizeTgemReasonsFromApi(data: unknown, lean: "HOME" | "AWAY" | string | null) {
  const payload = (data ?? {}) as Record<string, unknown>;
  const analysis = (payload.analysis ?? {}) as Record<string, unknown>;
  const taggedReasonsRaw = Array.isArray(analysis.reasons) ? analysis.reasons : [];
  const keyFactorsRaw = Array.isArray(analysis.keyFactors) ? analysis.keyFactors : [];
  const fallbackReasonsRaw = Array.isArray(payload.reasons) ? payload.reasons : [];

  const taggedReasons = taggedReasonsRaw
    .map((r) => {
      const row = (r ?? {}) as Record<string, unknown>;
      return String(row.text ?? "").trim();
    })
    .filter((r) => r.length > 0);

  const factorLines = keyFactorsRaw
    .map((f) => {
      const row = (f ?? {}) as Record<string, unknown>;
      const label = String(row.label ?? "").trim();
      const delta = typeof row.delta === "number" ? row.delta : null;
      if (!label) return "";
      if (delta == null) return `${label} is neutral`;
      const side = delta > 0 ? "home side" : delta < 0 ? "away side" : "even";
      return `${label} favors ${side} (${delta > 0 ? "+" : ""}${delta.toFixed(1)})`;
    })
    .filter((x) => x.length > 0);

  const fallbackReasons = fallbackReasonsRaw
    .map((r) => String(r ?? "").trim())
    .filter((r) => r.length > 0);

  const merged = [...factorLines, ...taggedReasons, ...fallbackReasons];
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const reason of merged) {
    const key = reason.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(reason);
  }

  if (unique.length > 0) return unique.slice(0, 8);
  return [
    lean === "AWAY"
      ? "Overall matchup profile favors the away side"
      : "Overall matchup profile favors the home side",
  ];
}

function PickemSlatePageInner() {
  const search = useSearchParams();
  const slateId = search.get("id") ?? "";

  const [slate, setSlate] = useState<PickemSlate | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [games, setGames] = useState<SlateGame[]>([]);
  const [picks, setPicks] = useState<Record<string, PickChoice>>({});
  const [suggestions, setSuggestions] = useState<Record<string, GameSuggestion>>({});
  const [gameNotes, setGameNotes] = useState<Record<string, string>>({});
  const [locked, setLocked] = useState(false);
  const [record, setRecord] = useState<SlateRecord>({ wins: 0, losses: 0, pushes: 0, pending: 0 });
  const [manualAwayTeam, setManualAwayTeam] = useState("");
  const [manualHomeTeam, setManualHomeTeam] = useState("");
  const [manualStartDate, setManualStartDate] = useState("");
  const [manualVenue, setManualVenue] = useState("");
  const [manualNeutralSite, setManualNeutralSite] = useState(false);
  const hasSlate = Boolean(slate?.id);
  const slateMode = slate?.mode;
  const slateEntryMode = slate?.entryMode ?? "auto";
  const slatePhase: PickemPhase =
    slate?.phase ?? derivePickemPhase(slate?.week ?? 1);

  useEffect(() => {
    if (!slateId) {
      setError("Missing slate id. Create a slate first.");
      return;
    }

    const s = getSlate(slateId);
    if (!s) {
      setError("Slate not found. Create a new one from Pick'em hub.");
      return;
    }

    setSlate(s);
    setGames(s.games ?? []);
    setPicks(s.picks ?? {});
    setSuggestions(s.suggestions ?? {});
    setGameNotes({});
    setLocked(Boolean(s.locked));
    setRecord(s.record ?? { wins: 0, losses: 0, pushes: 0, pending: 0 });
  }, [slateId]);

  async function refreshGames(options?: { silent?: boolean }) {
    if (!slate) return;
    if (slate.mode !== "college") {
      setError("Only college football slate mode is wired right now.");
      return;
    }
    if ((slate.entryMode ?? "auto") !== "auto") {
      return;
    }

    if (!options?.silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const phase: PickemPhase = slate.phase ?? derivePickemPhase(slate.week);
      const seasonType = phase === "postseason" ? "postseason" : "regular";
      const res = await fetch(
        `/api/cfbd/fbs/week-games?year=${slate.season}&week=${slate.week}&seasonType=${seasonType}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error ?? `Games request failed (${res.status})`);
      }

      const rows = Array.isArray(data?.games) ? (data.games as WeekGame[]) : [];
      rows.sort((a, b) => {
        const da = parseDate(a.startDate)?.getTime() ?? Number.POSITIVE_INFINITY;
        const db = parseDate(b.startDate)?.getTime() ?? Number.POSITIVE_INFINITY;
        return da - db;
      });

      const normalized = rows.map((g, i) => toSlateGame(g, i));
      setGames(normalized);

      const nextRecord = gradeRecord(normalized, picks);
      setRecord(nextRecord);

      upsertSlate(slate.id, {
        games: normalized,
        record: nextRecord,
      });
    } catch (e: unknown) {
      if (!options?.silent) {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    if (!slate) return;
    if ((slate.entryMode ?? "auto") !== "auto") return;
    if (games.length > 0) return;
    refreshGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slate?.id]);

  useEffect(() => {
    if (!slateId) return;
    if (!hasSlate) return;
    if (slateMode !== "college" || slateEntryMode !== "auto") return;

    let cancelled = false;

    const runAutoSync = async () => {
      await syncFbsSlatesFromApi();
      if (cancelled) return;

      const latest = getSlate(slateId);
      if (!latest) return;

      setSlate(latest);
      setGames(latest.games ?? []);
      setPicks(latest.picks ?? {});
      setSuggestions(latest.suggestions ?? {});
      setGameNotes({});
      setLocked(Boolean(latest.locked));
      setRecord(latest.record ?? { wins: 0, losses: 0, pushes: 0, pending: 0 });
    };

    const onFocus = () => {
      void runAutoSync();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void runAutoSync();
      }
    };

    void runAutoSync();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void runAutoSync();
      }
    }, AUTO_SYNC_MS);

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [slateId, hasSlate, slate?.id, slateMode, slateEntryMode]);

  useEffect(() => {
    if (!slate) return;
    upsertSlate(slate.id, {
      picks,
      suggestions,
      locked,
      games,
      record,
    });
  }, [slate, picks, suggestions, locked, games, record]);

  const pickedCount = useMemo(
    () => Object.values(picks).filter((v) => v != null).length,
    [picks],
  );

  function setPick(gameId: string, pick: PickChoice) {
    if (locked) return;
    setPicks((prev) => ({ ...prev, [gameId]: pick }));
  }

  async function runTgemForGame(g: SlateGame) {
    if (!slate) return;

    const homeTeam = resolvePickemTeamIdentity(g.homeTeam);
    const awayTeam = resolvePickemTeamIdentity(g.awayTeam);
    if (!homeTeam.token || !awayTeam.token) {
      const message = `TGEM synopsis unavailable: team mapping is incomplete for ${g.awayTeam ?? "TBD"} @ ${g.homeTeam ?? "TBD"}.`;
      setError(`Could not map team slug for ${g.awayTeam ?? "TBD"} @ ${g.homeTeam ?? "TBD"}.`);
      setGameNotes((prev) => ({ ...prev, [g.id]: message }));
      return;
    }

    const venue = g.neutralSite ? "neutral" : "home";
    const phase: PickemPhase = slate.phase ?? derivePickemPhase(slate.week);
    const seasonType = phase === "postseason" ? "postseason" : "regular";

    const res = await fetch(
      `/api/tgem/v11/matchup?team=${encodeURIComponent(homeTeam.token)}&opponent=${encodeURIComponent(
        awayTeam.token,
      )}&year=${encodeURIComponent(String(slate.season))}&venue=${venue}&phase=${phase}&week=${encodeURIComponent(
        String(slate.week),
      )}&seasonType=${seasonType}`,
      { cache: "no-store" },
    );
    const data = await res.json();
    if (!res.ok || data?.ok === false) {
      throw new Error(data?.error ?? `TGEM failed (${res.status})`);
    }

    const lean = data?.lean ?? null;
    const suggestedPick: Exclude<PickChoice, null> = lean === "AWAY" ? "away" : "home";
    const rawSuggestion: GameSuggestion = {
      pick: suggestedPick,
      confidence: typeof data?.confidence === "number" ? data.confidence : null,
      lean,
      reasons: summarizeTgemReasonsFromApi(data, lean),
      updatedAt: new Date().toISOString(),
    };
    let suggestion = rawSuggestion;

    // Guardrail for clear subdivision mismatch games (FBS vs non-FBS).
    let guardrailNote = "";
    if (homeTeam.isFbs !== awayTeam.isFbs) {
      const fbsPick: Exclude<PickChoice, null> = homeTeam.isFbs ? "home" : "away";
      const nonFbsPick: Exclude<PickChoice, null> = homeTeam.isFbs ? "away" : "home";
      const currentConfidence = rawSuggestion.confidence ?? 50;
      const pickedNonFbs = rawSuggestion.pick === nonFbsPick;

      if (pickedNonFbs && currentConfidence < 70) {
        suggestion = {
          ...rawSuggestion,
          pick: fbsPick,
          confidence: Math.max(72, currentConfidence),
          reasons: [
            "Subdivision gap guardrail: FBS roster depth and line play edge are prioritized in mismatch games.",
            ...rawSuggestion.reasons,
          ].slice(0, 8),
        };
        guardrailNote = "Guardrail applied: FBS vs non-FBS mismatch adjusted toward FBS side.";
      } else if (!pickedNonFbs) {
        suggestion = {
          ...rawSuggestion,
          confidence: Math.max(64, currentConfidence),
        };
        guardrailNote = "Guardrail context: FBS vs non-FBS mismatch confidence floor applied.";
      }
    }

    // Guardrail for low-confidence FBS vs FBS mismatch at home.
    if (homeTeam.isFbs && awayTeam.isFbs) {
      const homeConf = FBS_CONFERENCE_BY_SLUG.get(homeTeam.token);
      const awayConf = FBS_CONFERENCE_BY_SLUG.get(awayTeam.token);
      const tierGap = conferenceTier(homeConf) - conferenceTier(awayConf);
      const currentConfidence = suggestion.confidence ?? 50;
      const isLowConfidence = currentConfidence < AUTO_PICK_CONFIDENCE_MIN;
      const homeField = !g.neutralSite;

      if (homeField && tierGap >= 2 && isLowConfidence) {
        suggestion = {
          ...suggestion,
          pick: "home",
          confidence: Math.max(68, currentConfidence),
          reasons: [
            "Program strength prior: home power-tier team vs lower-tier FBS opponent.",
            ...suggestion.reasons,
          ].slice(0, 8),
        };
        guardrailNote =
          "Guardrail applied: low-confidence mismatch adjusted toward home power-tier side.";
      }
    }

    const confidenceNum = suggestion.confidence ?? 0;
    const shouldAutoPick = confidenceNum >= AUTO_PICK_CONFIDENCE_MIN;

    setSuggestions((prev) => ({ ...prev, [g.id]: suggestion }));
    setGameNotes((prev) => ({ ...prev, [g.id]: guardrailNote }));
    if (!locked && shouldAutoPick) {
      setPicks((prev) => ({ ...prev, [g.id]: suggestedPick }));
    }
    if (!shouldAutoPick) {
      setGameNotes((prev) => ({
        ...prev,
        [g.id]: "Low-confidence lean: TGEM generated a read but did not auto-lock this pick (threshold: 60).",
      }));
    }
  }

  function setGameTgemError(g: SlateGame, message: string) {
    setGameNotes((prev) => ({
      ...prev,
      [g.id]: `TGEM synopsis unavailable: ${message}`,
    }));
  }

  async function suggestGame(g: SlateGame) {
    try {
      await runTgemForGame(g);
      return true;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "unknown TGEM error";
      setGameTgemError(g, message);
      setError(`TGEM failed for ${g.awayTeam ?? "TBD"} @ ${g.homeTeam ?? "TBD"}: ${message}`);
      return false;
    }
  }

  async function runTgemAll() {
    if (games.length === 0) return;
    setBusy(true);
    setError(null);
    let failed = 0;
    try {
      for (const g of games) {
        const ok = await suggestGame(g);
        if (!ok) failed += 1;
      }
      if (failed > 0) {
        setError(`TGEM finished with ${failed} game(s) missing a synopsis. See row notes for details.`);
      }
    } finally {
      setBusy(false);
    }
  }

  function lockPicks() {
    setLocked(true);
  }

  function gradeNow() {
    const r = gradeRecord(games, picks);
    setRecord(r);
  }

  function addManualGame() {
    const away = manualAwayTeam.trim();
    const home = manualHomeTeam.trim();
    if (!away || !home) {
      setError("Manual mode requires both away and home team names.");
      return;
    }

    const game: SlateGame = {
      id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      startDate: manualStartDate ? new Date(manualStartDate).toISOString() : null,
      homeTeam: home,
      awayTeam: away,
      venue: manualVenue.trim() || null,
      neutralSite: manualNeutralSite,
      completed: false,
      homePoints: null,
      awayPoints: null,
    };

    const nextGames = [...games, game];
    const nextRecord = gradeRecord(nextGames, picks);
    setGames(nextGames);
    setRecord(nextRecord);
    setManualAwayTeam("");
    setManualHomeTeam("");
    setManualStartDate("");
    setManualVenue("");
    setManualNeutralSite(false);
    setError(null);
  }

  if (!slate) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-6xl mx-auto text-red-700">{error ?? "Loading slate..."}</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <Link href="/pickem" className="text-sm text-gray-900 hover:underline">
            {"< Back to Pick'em Hub"}
          </Link>
        </div>

        <section className="rounded-xl bg-white p-5 shadow border border-gray-200 mb-5">
          <h1 className="text-2xl font-bold text-gray-900">{slate.slateName}</h1>
          <p className="text-sm text-gray-900 mt-1">
            Season {slate.season} • Week {slate.week} • League: {slate.mode === "college" ? "College Football" : "NFL"}
            {" • "}Setup: {(slate.entryMode ?? "auto") === "auto" ? "Auto" : "Manual"}
            {" • "}Phase: {phaseToLabel(slatePhase)}
          </p>
          <p className="text-sm text-gray-900 mt-2">
            Picks made: <strong>{pickedCount}</strong> / {games.length}
          </p>
          <p className="text-sm text-gray-900 mt-1">
            Record: <strong>{record.wins}-{record.losses}</strong>
            {record.pushes > 0 ? `-${record.pushes}` : ""} • Pending: {record.pending}
          </p>
          <div className="mt-3 flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => void refreshGames()}
              disabled={(slate.entryMode ?? "auto") !== "auto"}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
            >
              Refresh Games/Results
            </button>
            <button
              type="button"
              onClick={runTgemAll}
              disabled={busy || games.length === 0}
              className="rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-50"
            >
              {busy ? "Running TGEM..." : "Run TGEM All"}
            </button>
            <button
              type="button"
              onClick={lockPicks}
              disabled={locked}
              className="rounded-lg bg-amber-700 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
            >
              {locked ? "Picks Locked" : "Lock Picks"}
            </button>
            <button
              type="button"
              onClick={gradeNow}
              className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Grade Picks
            </button>
          </div>
          {error ? <p className="text-sm text-red-700 mt-3">{error}</p> : null}
        </section>

        {(slate.entryMode ?? "auto") === "manual" ? (
          <section className="rounded-xl bg-white p-5 shadow border border-gray-200 mb-5">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Add Manual Matchup</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="text"
                value={manualAwayTeam}
                onChange={(e) => setManualAwayTeam(e.target.value)}
                placeholder="Away Team"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={manualHomeTeam}
                onChange={(e) => setManualHomeTeam(e.target.value)}
                placeholder="Home Team"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="datetime-local"
                value={manualStartDate}
                onChange={(e) => setManualStartDate(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={manualVenue}
                onChange={(e) => setManualVenue(e.target.value)}
                placeholder="Venue (optional)"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-gray-800">
              <input
                type="checkbox"
                checked={manualNeutralSite}
                onChange={(e) => setManualNeutralSite(e.target.checked)}
              />
              Neutral Site
            </label>
            <button
              type="button"
              onClick={addManualGame}
              className="mt-3 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-800"
            >
              Add Matchup
            </button>
          </section>
        ) : null}

        <section className="rounded-xl bg-white p-5 shadow border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Games</h2>

          {loading ? (
            <div className="text-gray-700">Loading games...</div>
          ) : games.length === 0 ? (
            <div className="text-gray-700">No FBS games found for this week.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-2 border-b border-gray-200">Date</th>
                    <th className="text-left p-2 border-b border-gray-200">Matchup</th>
                    <th className="text-left p-2 border-b border-gray-200">Venue</th>
                    <th className="text-left p-2 border-b border-gray-200">TGEM</th>
                    <th className="text-left p-2 border-b border-gray-200">Pick</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map((g) => {
                    const gameId = g.id;
                    const pick = picks[gameId] ?? null;
                    const suggestion = suggestions[gameId] ?? null;

                    return (
                      <tr key={gameId}>
                        <td className="p-2 border-b border-gray-100 text-sm">{fmtDate(g.startDate)}</td>
                        <td className="p-2 border-b border-gray-100 text-sm">
                          {g.awayTeam ?? "TBD"} @ {g.homeTeam ?? "TBD"}
                          {g.homePoints != null && g.awayPoints != null ? (
                            <span className="text-gray-700"> ({g.awayPoints}-{g.homePoints})</span>
                          ) : null}
                        </td>
                        <td className="p-2 border-b border-gray-100 text-sm">
                          {g.venue ?? "TBD"}
                          {g.neutralSite ? " (Neutral)" : ""}
                        </td>
                        <td className="p-2 border-b border-gray-100 text-sm">
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              onClick={() => void suggestGame(g)}
                              disabled={busy}
                              className="rounded border border-indigo-300 px-2 py-1 text-indigo-900 hover:bg-indigo-50 disabled:opacity-50"
                            >
                              Suggest
                            </button>
                            {suggestion ? (
                              <>
                                <span className="text-xs text-gray-700">
                                  {typeof suggestion.confidence === "number" && suggestion.confidence < AUTO_PICK_CONFIDENCE_MIN
                                    ? "TOSS-UP"
                                    : suggestion.pick.toUpperCase()}{" "}
                                  • Conf {suggestion.confidence ?? "N/A"}
                                </span>
                                <span className="text-xs text-gray-700">
                                  {suggestion
                                    ? buildCoachLeanSynopsis(suggestion, g, slatePhase)
                                    : gameNotes[g.id] || "Coach read: no TGEM synopsis yet. Run Suggest to generate a lean."}
                                </span>
                              </>
                            ) : null}
                            {!suggestion ? (
                              <span className="text-xs text-gray-700">
                                {gameNotes[g.id] || "Coach read: no TGEM synopsis yet. Run Suggest to generate a lean."}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="p-2 border-b border-gray-100 text-sm">
                          <div className="flex gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setPick(gameId, "away")}
                              disabled={locked}
                              className={`rounded border px-2 py-1 ${
                                pick === "away"
                                  ? "border-blue-700 bg-blue-50 text-blue-900"
                                  : "border-gray-300 text-gray-800"
                              } disabled:opacity-50`}
                            >
                              {g.awayTeam ?? "Away"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPick(gameId, "home")}
                              disabled={locked}
                              className={`rounded border px-2 py-1 ${
                                pick === "home"
                                  ? "border-red-700 bg-red-50 text-red-900"
                                  : "border-gray-300 text-gray-800"
                              } disabled:opacity-50`}
                            >
                              {g.homeTeam ?? "Home"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPick(gameId, null)}
                              disabled={locked}
                              className="rounded border border-gray-300 px-2 py-1 text-gray-700 disabled:opacity-50"
                            >
                              Clear
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function PickemSlatePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-100 p-6">
          <div className="max-w-6xl mx-auto text-gray-700">Loading slate...</div>
        </main>
      }
    >
      <PickemSlatePageInner />
    </Suspense>
  );
}
