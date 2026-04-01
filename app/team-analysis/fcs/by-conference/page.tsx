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
          FCS - Select Team by Conference ({year})
        </h1>

        <p className="mb-6 text-gray-700 dark:text-gray-300">
          Expand a conference to view teams, then select a program to open its
          TGEM team dashboard.
        </p>

        {loading ? <div className="text-gray-700 dark:text-gray-300">Loading conferences...</div> : null}
        {error ? <div className="text-red-700 dark:text-red-300">Error: {error}</div> : null}

        {!loading && !error ? (
          <div className="space-y-4">
            {conferences.map((conf) => {
              const isOpen = openConference === conf;
              const confTeams = teamsByConference[conf] ?? [];
              return (
                <div key={conf} className="tgem-surface rounded-3xl">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-gray-900 dark:text-gray-100"
                    onClick={() => setOpenConference(isOpen ? null : conf)}
                  >
                    <span className="font-semibold">
                      {conf} ({confTeams.length} teams)
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {isOpen ? "[-]" : "[+]"}
                    </span>
                  </button>

                  {isOpen ? (
                    <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-800">
                      {confTeams.length === 0 ? (
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          No teams found for this conference.
                        </p>
                      ) : (
                        <ul className="grid gap-2 sm:grid-cols-2">
                          {confTeams.map((team) => (
                            <li key={team.slug}>
                              <Link
                                href={`/team-analysis/fcs/${encodeURIComponent(team.slug)}?from=by-conference`}
                                className="tgem-surface-subtle block rounded-2xl px-3 py-2 text-sm text-gray-900 transition hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-900"
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
