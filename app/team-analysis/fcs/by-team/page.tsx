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
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-4 flex gap-3 text-sm">
          <Link href="/team-analysis/fcs" className="hover:underline">
            ← FCS Home
          </Link>
          <Link href="/team-analysis" className="hover:underline">
            Team Analysis
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          FCS Teams ({year})
        </h1>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search FCS teams..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 mb-4"
        />

        {loading ? <div>Loading teams...</div> : null}
        {error ? <div className="text-red-700">Error: {error}</div> : null}

        {!loading && !error ? (
          <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-3 border-b">Team</th>
                  <th className="text-left p-3 border-b">Conference</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.slug}>
                    <td className="p-3 border-b">
                      <Link
                        href={`/team-analysis/fcs/${encodeURIComponent(t.slug)}?from=by-team`}
                        className="underline"
                      >
                        {t.school}
                      </Link>
                    </td>
                    <td className="p-3 border-b">{t.conference ?? "N/A"}</td>
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
