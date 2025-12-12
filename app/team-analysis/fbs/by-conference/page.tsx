"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FBS_TEAMS } from "@/data/fbsTeams";

// Base list of conferences (includes Pac-12)
const RAW_CONFERENCES = [
  "AAC",
  "ACC",
  "Big 12",
  "Big Ten",
  "C-USA",
  "Independents",
  "MAC",
  "Mountain West",
  "Pac-12",
  "SEC",
  "Sun Belt",
];

const CONFERENCES = [...RAW_CONFERENCES].sort((a, b) =>
  a.localeCompare(b)
);

export default function FbsByConferencePage() {
  const [openConference, setOpenConference] = useState<string | null>("AAC");

  const teamsByConference = useMemo(() => {
    const map: Record<string, { name: string; slug: string }[]> = {};
    for (const conf of CONFERENCES) {
      map[conf] = [];
    }

    for (const team of FBS_TEAMS) {
      if (!map[team.conference]) {
        map[team.conference] = [];
      }
      map[team.conference].push({ name: team.name, slug: team.slug });
    }

    for (const conf of Object.keys(map)) {
      map[conf].sort((a, b) => a.name.localeCompare(b.name));
    }

    return map;
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-gray-900">
          <Link href="/team-analysis/fbs" className="hover:underline">
            ← Back to FBS Analysis
          </Link>
          <span className="text-gray-800">|</span>
          <Link href="/team-analysis" className="hover:underline">
            Team Analysis Hub
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 text-center">
          FBS – Select Team by Conference
        </h1>

        <p className="mt-4 text-gray-900 text-center max-w-2xl mx-auto">
          Tap a conference to expand its teams, then select a program to open
          its TGEM team dashboard.
        </p>

        <div className="mt-8 space-y-4">
          {CONFERENCES.map((conf) => {
            const isOpen = openConference === conf;
            const teams = teamsByConference[conf] || [];
            return (
              <div
                key={conf}
                className="rounded-xl bg-white shadow border border-gray-200"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-gray-900"
                  onClick={() => setOpenConference(isOpen ? null : conf)}
                >
                  <span className="font-semibold">
                    {conf} ({teams.length} teams)
                  </span>
                  <span className="text-gray-800 text-sm">
                    {isOpen ? "▲" : "▼"}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-200 px-4 py-3">
                    {teams.length === 0 ? (
                      <p className="text-sm text-gray-900">
                        No teams found for this conference.
                      </p>
                    ) : (
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {teams.map((team) => (
                          <li key={team.slug}>
                            <Link
                              href={`/team-analysis/fbs/${team.slug}`}
                              className="block w-full rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-900 hover:bg-gray-100 border border-gray-200"
                            >
                              {team.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
