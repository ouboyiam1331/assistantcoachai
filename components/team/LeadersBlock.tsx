"use client";

import type { LeaderEntry } from "@/lib/cfbd/leaders";

function fmt(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return "N/A";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

type Props = {
  seasonYear: number;
  note?: string | null;
  emptyMessage?: string;
  loading: boolean;
  error: string | null;
  leaders: LeaderEntry[] | null;
};

export function LeadersBlock({
  seasonYear,
  note,
  emptyMessage = "No key player data available.",
  loading,
  error,
  leaders,
}: Props) {
  const availableLeaders = (leaders ?? []).filter(
    (entry) => entry.player && entry.stat != null,
  );

  return (
    <section className="tgem-surface mt-4 rounded-3xl p-6 text-gray-900 dark:text-gray-100">
      <div className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
        Key Players / Leaders ({seasonYear})
      </div>
      {note ? (
        <div className="mb-3 text-sm text-gray-700 dark:text-gray-300">
          {note}
        </div>
      ) : null}

      {loading ? (
        <div className="text-sm text-gray-700 dark:text-gray-300">Loading leaders...</div>
      ) : null}
      {!loading && error ? (
        <div className="text-sm text-red-700 dark:text-red-300">Leaders error: {error}</div>
      ) : null}

      {!loading && !error && availableLeaders.length > 0 ? (
        <div
          className="grid gap-3 text-sm text-gray-700 sm:grid-cols-2 dark:text-gray-300"
        >
          {availableLeaders.map((entry) => (
            <div
              key={entry.key}
              className="tgem-surface-subtle rounded-2xl px-4 py-3"
            >
              <strong className="text-gray-900 dark:text-gray-100">{entry.label}:</strong>{" "}
              {entry.player && entry.stat != null
                ? `${entry.player} (${entry.statLabel ?? "Stat"}: ${fmt(entry.stat)})`
                : "N/A"}
            </div>
          ))}
        </div>
      ) : null}

      {!loading && !error && availableLeaders.length === 0 ? (
        <div className="text-sm text-gray-700 dark:text-gray-300">{emptyMessage}</div>
      ) : null}
    </section>
  );
}
