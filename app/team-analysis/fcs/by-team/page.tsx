"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type FcsTeam = {
  id: number | null;
  school: string;
  conference: string | null;
  slug: string;
};

export default function FcsByTeamPage() {
  const [teams, setTeams] = useState<FcsTeam[]>([]);
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
        const res = await fetch(`/api/cfbd/fcs/teams?year=${year}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok || data?.ok === false) {
          throw new Error(data?.error ?? `Teams request failed (${res.status})`);
        }
        const list = Array.isArray(data?.teams) ? (data.teams as FcsTeam[]) : [];
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter((t) =>
      [t.school, t.conference ?? ""].some((v) => v.toLowerCase().includes(q)),
    );
  }, [teams, query]);

  return (
    <main className="tgem-page px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex gap-3 text-sm text-gray-700 dark:text-gray-300">
          <Link href="/team-analysis/fcs" className="hover:underline">
            {"<- FCS Home"}
          </Link>
          <Link href="/team-analysis" className="hover:underline">
            Team Analysis
          </Link>
        </div>

        <h1 className="mb-3 text-2xl font-bold text-gray-900 dark:text-gray-100">
          FCS Teams ({year})
        </h1>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search FCS teams..."
          className="tgem-input mb-4 w-full rounded-lg px-3 py-2"
        />

        {loading ? <div className="text-gray-700 dark:text-gray-300">Loading teams...</div> : null}
        {error ? <div className="text-red-700 dark:text-red-300">Error: {error}</div> : null}

        {!loading && !error ? (
          <div className="tgem-surface overflow-hidden rounded-3xl">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-950/70">
                  <th className="border-b border-gray-200 p-3 text-left dark:border-gray-800">Team</th>
                  <th className="border-b border-gray-200 p-3 text-left dark:border-gray-800">Conference</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.slug}>
                    <td className="border-b border-gray-200 p-3 dark:border-gray-800">
                      <Link
                        href={`/team-analysis/fcs/${encodeURIComponent(t.slug)}?from=by-team`}
                        className="underline text-gray-900 dark:text-gray-100"
                      >
                        {t.school}
                      </Link>
                    </td>
                    <td className="border-b border-gray-200 p-3 text-gray-700 dark:border-gray-800 dark:text-gray-300">
                      {t.conference ?? "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </main>
  );
}
