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
    <section
      style={{
        marginTop: 14,
        padding: 12,
        border: "1px solid #ddd",
        borderRadius: 10,
        background: "#fff",
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 8, color: "#111" }}>
        Key Players / Leaders ({seasonYear})
      </div>
      {note ? (
        <div style={{ marginBottom: 8, color: "#333", fontSize: 13 }}>{note}</div>
      ) : null}

      {loading ? <div style={{ color: "#333" }}>Loading leaders...</div> : null}
      {!loading && error ? <div style={{ color: "#b00020" }}>Leaders error: {error}</div> : null}

      {!loading && !error && availableLeaders.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            color: "#111",
          }}
        >
          {availableLeaders.map((entry) => (
            <div key={entry.key}>
              <strong>{entry.label}:</strong>{" "}
              {entry.player && entry.stat != null
                ? `${entry.player} (${entry.statLabel ?? "Stat"}: ${fmt(entry.stat)})`
                : "N/A"}
            </div>
          ))}
        </div>
      ) : null}

      {!loading && !error && availableLeaders.length === 0 ? (
        <div style={{ color: "#333" }}>{emptyMessage}</div>
      ) : null}
    </section>
  );
}
