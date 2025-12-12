"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FBS_TEAMS } from "@/data/fbsTeams";

export default function FbsByTeamPage() {
  const [query, setQuery] = useState("");

  const sortedTeams = useMemo(() => {
    return [...FBS_TEAMS].sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const filteredTeams = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return sortedTeams;
    return sortedTeams.filter((team) =>
      team.name.toLowerCase().includes(q)
    );
  }, [query, sortedTeams]);

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-100">
      <div className="w-full max-w-3xl">
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
          FBS – Select Team from List
        </h1>

        <p className="mt-4 text-gray-900 text-center max-w-2xl mx-auto">
          Start typing to search for an FBS team, then tap it to open a TGEM
          team overview page for that program.
        </p>

        <div className="mt-8 w-full">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a team (e.g., Alabama, Troy, Oklahoma)..."
            className="w-full rounded-lg border border-gray-400 px-4 py-2 text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-red-700 bg-white"
          />
        </div>

        <div className="mt-6 w-full border-t border-gray-300 pt-4">
          {filteredTeams.length === 0 ? (
            <p className="text-center text-gray-900">
              No teams match that search.
            </p>
          ) : (
            <ul className="space-y-2">
              {filteredTeams.map((team) => (
                <li key={team.slug}>
                  <Link
                    href={`/team-analysis/fbs/${team.slug}`}
                    className="block w-full rounded-lg bg-white px-4 py-3 text-gray-900 shadow-sm hover:bg-gray-100 border border-gray-200"
                  >
                    {team.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
