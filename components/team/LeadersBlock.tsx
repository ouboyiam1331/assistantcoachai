"use client";

import type { LeaderEntry } from "@/lib/cfbd/leaders";

function fmt(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return "N/A";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

type Props = {
  seasonYear: number;
  loading: boolean;
  error: string | null;
  leaders: LeaderEntry[] | null;
};

export function LeadersBlock({ seasonYear, loading, error, leaders }: Props) {
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

      {loading ? <div style={{ color: "#333" }}>Loading leaders...</div> : null}
      {!loading && error ? <div style={{ color: "#b00020" }}>Leaders error: {error}</div> : null}

      {!loading && !error ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            color: "#111",
          }}
        >
          {(leaders ?? []).map((entry) => (
            <div key={entry.key}>
              <strong>{entry.label}:</strong>{" "}
              {entry.player && entry.stat != null
                ? `${entry.player} (${entry.statLabel ?? "Stat"}: ${fmt(entry.stat)})`
                : "N/A"}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

