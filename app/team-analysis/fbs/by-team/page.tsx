"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type FbsTeam = {
  id: number | null;
  school: string;
  conference: string | null;
  slug: string;
};

export default function FbsByTeamPage() {
  const [teams, setTeams] = useState<FbsTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const year = useMemo(() => new Date().getFullYear(), []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/cfbd/fbs/teams?year=${year}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok || data?.ok === false) {
          throw new Error(data?.error ?? `Teams request failed (${res.status})`);
        }
        const list = Array.isArray(data?.teams) ? (data.teams as FbsTeam[]) : [];
        if (!cancelled) setTeams(list);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unknown error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [year]);

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.school.localeCompare(b.school)),
    [teams],
  );

  const filteredTeams = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return sortedTeams;
    return sortedTeams.filter((team) => team.school.toLowerCase().includes(q));
  }, [query, sortedTeams]);

  return (
    <main className="tgem-page flex min-h-screen flex-col items-center px-6 py-12">
      <div className="w-full max-w-3xl">
        <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
          <Link href="/team-analysis/fbs" className="hover:underline">
            {"<- Back to FBS Analysis"}
          </Link>
          <span>|</span>
          <Link href="/team-analysis" className="hover:underline">
            Team Analysis Hub
          </Link>
        </div>

        <h1 className="text-center text-3xl font-bold text-gray-900 dark:text-gray-100">
          FBS - Select Team from List
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-center text-gray-700 dark:text-gray-300">
          Start typing to search for an FBS team, then tap it to open a TGEM team
          overview page for that program. Conference alignment is checked against
          CFBD for season {year}.
        </p>

        <div className="mt-8 w-full">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a team (e.g., Alabama, Troy, Oklahoma)..."
            className="tgem-input w-full rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-red-700"
          />
        </div>

        {loading ? <div className="mt-6 text-gray-700 dark:text-gray-300">Loading teams...</div> : null}
        {error ? <div className="mt-6 text-red-700 dark:text-red-300">Error: {error}</div> : null}

        <div className="mt-6 w-full border-t border-gray-300 pt-4 dark:border-gray-800">
          {filteredTeams.length === 0 ? (
            <p className="text-center text-gray-700 dark:text-gray-300">No teams match that search.</p>
          ) : (
            <ul className="space-y-2">
              {filteredTeams.map((team) => (
                <li key={team.slug}>
                  <Link
                    href={`/team-analysis/fbs/${team.slug}?from=by-team`}
                    className="tgem-surface block rounded-2xl px-4 py-3 text-gray-900 transition hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-900"
                  >
                    {team.school}
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
