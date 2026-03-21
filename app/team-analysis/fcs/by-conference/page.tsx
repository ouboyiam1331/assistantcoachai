"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type FcsTeam = {
  id: number | null;
  school: string;
  conference: string | null;
  slug: string;
};

export default function FcsByConferencePage() {
  const [teams, setTeams] = useState<FcsTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openConference, setOpenConference] = useState<string | null>(null);
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
        if (!cancelled) {
          setTeams(list);
        }
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

  const teamsByConference = useMemo(() => {
    const map: Record<string, FcsTeam[]> = {};
    for (const t of teams) {
      const conf = (t.conference ?? "").trim() || "Independent / Other";
      if (!map[conf]) map[conf] = [];
      map[conf].push(t);
    }

    for (const conf of Object.keys(map)) {
      map[conf].sort((a, b) => a.school.localeCompare(b.school));
    }
    return map;
  }, [teams]);

  const conferences = useMemo(
    () => Object.keys(teamsByConference).sort((a, b) => a.localeCompare(b)),
    [teamsByConference],
  );

  useEffect(() => {
    if (!openConference && conferences.length > 0) {
      setOpenConference(conferences[0]);
    }
  }, [conferences, openConference]);

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-4 flex gap-3 text-sm">
          <Link href="/team-analysis/fcs" className="hover:underline">
            {"← FCS Home"}
          </Link>
          <Link href="/team-analysis" className="hover:underline">
            Team Analysis
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          FCS - Select Team by Conference ({year})
        </h1>

        <p className="text-gray-900 mb-6">
          Expand a conference to view teams, then select a program to open its
          TGEM team dashboard.
        </p>

        {loading ? <div>Loading conferences...</div> : null}
        {error ? <div className="text-red-700">Error: {error}</div> : null}

        {!loading && !error ? (
          <div className="space-y-4">
            {conferences.map((conf) => {
              const isOpen = openConference === conf;
              const confTeams = teamsByConference[conf] ?? [];
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
                      {conf} ({confTeams.length} teams)
                    </span>
                    <span className="text-gray-800 text-sm">
                      {isOpen ? "▲" : "▼"}
                    </span>
                  </button>

                  {isOpen ? (
                    <div className="border-t border-gray-200 px-4 py-3">
                      {confTeams.length === 0 ? (
                        <p className="text-sm text-gray-900">
                          No teams found for this conference.
                        </p>
                      ) : (
                        <ul className="grid gap-2 sm:grid-cols-2">
                          {confTeams.map((team) => (
                            <li key={team.slug}>
                              <Link
                                href={`/team-analysis/fcs/${encodeURIComponent(team.slug)}?from=by-conference`}
                                className="block w-full rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-900 hover:bg-gray-100 border border-gray-200"
                              >
                                {team.school}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </main>
  );
}
