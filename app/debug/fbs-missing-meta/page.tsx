"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FBS_TEAMS } from "@/data/fbsTeams";
import { TEAM_META } from "@/data/teamMeta";

// simple string similarity helper (startsWith + includes)
function bestSlugMatch(target: string, candidates: string[]) {
  const t = target.toLowerCase();
  const exact = candidates.find((c) => c.toLowerCase() === t);
  if (exact) return exact;

  const starts = candidates.find((c) => c.toLowerCase().startsWith(t));
  if (starts) return starts;

  const includes = candidates.find((c) => c.toLowerCase().includes(t) || t.includes(c.toLowerCase()));
  if (includes) return includes;

  return null;
}

export default function DebugFbsMissingMetaPage() {
  const [query, setQuery] = useState("");

  const metaKeys = useMemo(() => Object.keys(TEAM_META), []);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();

    return FBS_TEAMS.map((t) => {
      const meta = (TEAM_META as any)[t.slug] ?? null;
      const hasMeta = !!meta;
      const hasLogo = !!meta?.logos?.[0];

      const suggestion =
        hasMeta ? null : bestSlugMatch(t.slug, metaKeys);

      return {
        name: t.name,
        slug: t.slug,
        hasMeta,
        hasLogo,
        suggestedMetaSlug: suggestion,
      };
    })
      .filter((r) => {
        if (!q) return true;
        return (
          r.name.toLowerCase().includes(q) ||
          r.slug.toLowerCase().includes(q) ||
          (r.suggestedMetaSlug ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        // show missing meta first, then missing logo
        const aScore = (a.hasMeta ? 1 : 0) + (a.hasLogo ? 1 : 0);
        const bScore = (b.hasMeta ? 1 : 0) + (b.hasLogo ? 1 : 0);
        return aScore - bScore || a.name.localeCompare(b.name);
      });
  }, [query, metaKeys]);

  const missingMeta = rows.filter((r) => !r.hasMeta).length;
  const missingLogo = rows.filter((r) => r.hasMeta && !r.hasLogo).length;

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto", color: "#111827" }}>
      <div style={{ marginBottom: 12 }}>
        <Link href="/">← Home</Link>
      </div>

      <h1 style={{ margin: 0 }}>Debug: FBS Missing Meta / Logos</h1>
      <p style={{ marginTop: 8 }}>
        <strong>Missing meta:</strong> {missingMeta} &nbsp;|&nbsp;{" "}
        <strong>Missing logo (meta exists but no logos[0]):</strong> {missingLogo}
      </p>

      <div style={{ marginTop: 12 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search team/slug… (e.g., umass)"
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 10,
            border: "1px solid #d1d5db",
            outline: "none",
          }}
        />
      </div>

      <div style={{ marginTop: 16, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: 10 }}>Team</th>
              <th style={{ padding: 10 }}>App Slug</th>
              <th style={{ padding: 10 }}>Meta?</th>
              <th style={{ padding: 10 }}>Logo?</th>
              <th style={{ padding: 10 }}>Suggested CFBD Slug</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: 10 }}>{r.name}</td>
                <td style={{ padding: 10, fontFamily: "monospace" }}>{r.slug}</td>
                <td style={{ padding: 10 }}>{r.hasMeta ? "✅" : "❌"}</td>
                <td style={{ padding: 10 }}>{r.hasLogo ? "✅" : r.hasMeta ? "❌" : "—"}</td>
                <td style={{ padding: 10, fontFamily: "monospace" }}>
                  {r.suggestedMetaSlug ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 16, opacity: 0.8 }}>
        Tip: open a team page and compare the “App Slug” vs “Suggested CFBD Slug”.
        We can then add a one-line alias OR fix the generator permanently.
      </p>
    </main>
  );
}
