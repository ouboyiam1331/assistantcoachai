// @ts-nocheck
/* eslint-disable */
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FBS_TEAMS } from "@/data/fbsTeams";
import { getTeamMeta } from "@/data/teamMeta";

function classifySubdivision(conference: string): string {
  const powerConfs = new Set(["SEC", "Big Ten", "Big 12", "ACC", "Pac-12"]);
  if (powerConfs.has(conference)) return "FBS – Power Conference";
  if (conference === "Independents") return "FBS – Independent";
  if (conference === "Unknown Conference") return "Unknown subdivision";
  return "FBS – Group of Five";
}

export default function TeamPage() {
  const params = useParams();
  const rawSlug = (params as any)?.team as string | string[] | undefined;

  const slug =
    typeof rawSlug === "string"
      ? rawSlug
      : Array.isArray(rawSlug)
      ? rawSlug[0]
      : null;

  const team = slug ? FBS_TEAMS.find((t) => t.slug === slug) : undefined;
  const meta = slug ? getTeamMeta(slug) : undefined;

  const teamName =
    team?.name ??
    (slug
      ? slug
          .split("-")
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join(" ")
      : "Unknown Team");

  const conference = team?.conference ?? "Unknown Conference";
  const subdivision = classifySubdivision(conference);
  const season = 2025;

  const city = meta?.city ?? "Unknown";
  const state = meta?.state ?? "Unknown";
  const stadium = meta?.stadium ?? "Home Stadium";
  const nickname = meta?.nickname ?? `${teamName} Football`;

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      {/* Breadcrumbs */}
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-gray-900">
        <Link href="/team-analysis/fbs/by-team" className="hover:underline">
          ← Back to FBS Team List
        </Link>
        <span className="text-gray-800">|</span>
        <Link href="/team-analysis" className="hover:underline">
          Team Analysis Hub
        </Link>
      </div>

      {/* Header */}
      <header className="max-w-5xl mx-auto mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {teamName} – TGEM Team Overview
        </h1>

        <p className="mt-3 text-gray-900 text-lg">
          <span className="font-semibold">Season:</span> {season}
        </p>

        <p className="text-gray-900 text-lg">
          <span className="font-semibold">Conference:</span> {conference}
        </p>

        <p className="text-gray-900 text-lg">
          <span className="font-semibold">Subdivision:</span> {subdivision}
        </p>

        {/* TEMP DEBUG */}
        <p className="mt-1 text-gray-700 text-xs">
          Debug – slug: <span className="font-mono">{slug ?? "none"}</span> | team
          found: <span className="font-mono">{team ? "yes" : "no"}</span>
        </p>

        <p className="mt-4 text-gray-900 max-w-3xl leading-relaxed">
          This dashboard will evolve into a full TGEM-powered analysis hub for {teamName}.
          You will eventually see real roster metrics, coaching stability, schedule-based
          TGEM edges, recent performance indicators, and matchup insights.
        </p>
      </header>

      {/* Layout */}
      <section className="max-w-5xl mx-auto grid gap-6 md:grid-cols-3">
        {/* LEFT COLUMN */}
        <div className="md:col-span-1 space-y-6">
          {/* Team Profile */}
          <div className="rounded-xl bg-white p-5 shadow border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Team Profile
            </h2>
            <ul className="text-gray-900 space-y-2 text-base">
              <li>
                <span className="font-semibold">Nickname:</span> {nickname}
              </li>
              <li>
                <span className="font-semibold">Location:</span> {city}, {state}
              </li>
              <li>
                <span className="font-semibold">Stadium:</span> {stadium}
              </li>
              <li>
                <span className="font-semibold">Conference:</span> {conference}
              </li>
              <li>
                <span className="font-semibold">Subdivision:</span> {subdivision}
              </li>
            </ul>
          </div>

          {/* Season Snapshot */}
          <div className="rounded-xl bg-white p-5 shadow border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Season Snapshot
            </h2>
            <ul className="text-gray-900 space-y-2 text-base">
              <li>Overall Record: <strong>TBD</strong></li>
              <li>Conference Record: <strong>TBD</strong></li>
              <li>Recent Form (last 5): <strong>TBD</strong></li>
              <li>Offense Rating: <strong>TBD</strong></li>
              <li>Defense Rating: <strong>TBD</strong></li>
            </ul>
          </div>

          {/* TGEM Readiness */}
          <div className="rounded-xl bg-white p-5 shadow border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              TGEM Readiness
            </h2>
            <ul className="text-gray-900 space-y-2 text-base">
              <li>Momentum Score: <strong>TBD</strong></li>
              <li>Roster Stability: <strong>TBD</strong></li>
              <li>Injury Impact: <strong>TBD</strong></li>
              <li>Coaching Stability: <strong>TBD</strong></li>
            </ul>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="md:col-span-2 space-y-6">
          {/* Recent Games */}
          <div className="rounded-xl bg-white p-5 shadow border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Recent Games (Placeholder)
            </h2>
            <p className="text-gray-900 mb-2">
              TGEM will soon analyze recent performance trends:
            </p>
            <ul className="text-gray-900 space-y-1 list-disc list-inside">
              <li>Game 1 – Opponent – Result – Performance (TBD)</li>
              <li>Game 2 – Opponent – Result – Performance (TBD)</li>
              <li>Game 3 – Opponent – Result – Performance (TBD)</li>
            </ul>
          </div>

          {/* Schedule */}
          <div className="rounded-xl bg-white p-5 shadow border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {season} Schedule (Placeholder)
            </h2>
            <ul className="text-gray-900 space-y-2">
              <li>Week 1 – vs Opponent – TGEM Edge: TBD</li>
              <li>Week 2 – @ Opponent – TGEM Edge: TBD</li>
              <li>Week 3 – vs Opponent – TGEM Edge: TBD</li>
              <li>Week 4 – @ Opponent – TGEM Edge: TBD</li>
            </ul>
          </div>

          {/* Matchup button */}
          <div className="rounded-xl bg-white p-5 shadow border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Matchup Analysis
            </h2>
            <p className="text-gray-900 mb-3">
              You’ll soon be able to select an opponent and run full TGEM analysis.
            </p>
            <button className="rounded-lg bg-red-700 px-6 py-3 text-white font-semibold hover:bg-red-800">
              Analyze a Matchup (Coming Soon)
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
