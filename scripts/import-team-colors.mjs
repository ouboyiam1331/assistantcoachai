#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const FBS_TEAMS_FILE = path.join(ROOT, "data", "fbsTeams.ts");
const TEAM_META_FILE = path.join(ROOT, "data", "teamMeta.ts");
const OUTPUT_FILE = path.join(ROOT, "data", "teamColors.ts");

const GENERIC_SITE_COLORS = new Set([
  "#000",
  "#000000",
  "#111",
  "#111111",
  "#222",
  "#222222",
  "#333",
  "#333333",
  "#FFF",
  "#FFFFFF",
  "#F5F5F5",
  "#FF0",
  "#FFCD00",
]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeHex(input) {
  if (!input) return null;
  const raw = String(input).trim();
  if (!raw) return null;
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(withHash)) return null;
  return withHash.toUpperCase();
}

function parseFbsTeams(fileText) {
  const regex = /\{\s*name:\s*"([^"]+)",\s*slug:\s*"([^"]+)"/g;
  const rows = [];
  let m;
  while ((m = regex.exec(fileText)) !== null) {
    rows.push({ name: m[1], slug: m[2] });
  }
  return rows;
}

function parseTeamMetaPrimaryColors(fileText) {
  const out = new Map();
  const regex = /"slug":\s*"([^"]+)"[\s\S]*?"color":\s*(null|"#[0-9a-fA-F]{3,6}")/g;
  let m;
  while ((m = regex.exec(fileText)) !== null) {
    const slug = m[1];
    const colorRaw = m[2];
    if (!slug || !colorRaw || colorRaw === "null") continue;
    const color = normalizeHex(colorRaw.slice(1, -1));
    if (color) out.set(slug, color);
  }
  return out;
}

function hexToRgb(hex) {
  const h = normalizeHex(hex);
  if (!h) return null;
  const raw = h.slice(1);
  const full = raw.length === 3 ? raw.split("").map((x) => x + x).join("") : raw;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function colorDistance(a, b) {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return Number.POSITIVE_INFINITY;
  const dr = ra.r - rb.r;
  const dg = ra.g - rb.g;
  const db = ra.b - rb.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function scoreLink(link, teamName) {
  const tokens = String(teamName)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const hay = link.toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (hay.includes(t)) score += 1;
  }
  return score;
}

function extractArticleUrl(searchHtml, teamName) {
  const links = Array.from(
    new Set(
      searchHtml.match(
        /https:\/\/teamcolorcodes\.com\/[^"'\s<>]*-color-codes\/?/gi,
      ) ?? [],
    ),
  );
  if (!links.length) return null;
  let best = null;
  let bestScore = -1;
  for (const link of links) {
    const score = scoreLink(link, teamName);
    if (score > bestScore) {
      best = link;
      bestScore = score;
    }
  }
  return bestScore >= 1 ? best : null;
}

function extractColors(html) {
  const matches = [];
  const hexLabelMatches = html.matchAll(/Hex Color:\s*(#[0-9a-fA-F]{3,6})/gi);
  for (const m of hexLabelMatches) {
    matches.push(m[1]);
  }
  if (!matches.length) {
    matches.push(...(html.match(/#[0-9a-fA-F]{3,6}\b/g) ?? []));
  }
  const out = [];
  const seen = new Set();
  for (const token of matches) {
    const hex = normalizeHex(token);
    if (!hex) continue;
    if (GENERIC_SITE_COLORS.has(hex)) continue;
    if (seen.has(hex)) continue;
    seen.add(hex);
    out.push(hex);
  }
  return out;
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": "TGEMsports Color Importer/1.0",
      accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) {
    throw new Error(`Request failed ${res.status}: ${url}`);
  }
  return res.text();
}

function renderOutput(entries) {
  const lines = [];
  lines.push('export type TeamColorEntry = {');
  lines.push("  primary: string;");
  lines.push("  secondary: string | null;");
  lines.push("  sourceUrl: string;");
  lines.push("};");
  lines.push("");
  lines.push("// Authoritative local team color map.");
  lines.push("// Values are estimations provided by TeamColorCodes.com.");
  lines.push("export const TEAM_COLOR_MAP: Record<string, TeamColorEntry> = {");
  for (const item of entries) {
    lines.push(`  "${item.slug}": {`);
    lines.push(`    primary: "${item.primary}",`);
    lines.push(
      `    secondary: ${item.secondary ? `"${item.secondary}"` : "null"},`,
    );
    lines.push(`    sourceUrl: "${item.sourceUrl}",`);
    lines.push("  },");
  }
  lines.push("};");
  lines.push("");
  lines.push("export const TEAM_COLOR_ALIASES: Record<string, string> = {");
  lines.push('  floridaatlantic: "florida-atlantic",');
  lines.push('  floridainternational: "fiu",');
  lines.push('  miami: "miami-fl",');
  lines.push("};");
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const fbsText = await fs.readFile(FBS_TEAMS_FILE, "utf8");
  const metaText = await fs.readFile(TEAM_META_FILE, "utf8");
  const teams = parseFbsTeams(fbsText);
  const metaPrimaryBySlug = parseTeamMetaPrimaryColors(metaText);
  if (!teams.length) {
    throw new Error("No FBS teams parsed from data/fbsTeams.ts");
  }

  const rows = [];
  for (const [idx, team] of teams.entries()) {
    process.stdout.write(`[${idx + 1}/${teams.length}] ${team.name} ... `);
    try {
      const searchUrl = `https://teamcolorcodes.com/?s=${encodeURIComponent(team.name)}`;
      const searchHtml = await fetchText(searchUrl);
      const articleUrl = extractArticleUrl(searchHtml, team.name);
      if (!articleUrl) {
        process.stdout.write("no article match\n");
        continue;
      }

      const articleHtml = await fetchText(articleUrl);
      const colors = extractColors(articleHtml);
      if (!colors.length) {
        process.stdout.write("no colors found\n");
        continue;
      }

      const metaPrimary = metaPrimaryBySlug.get(team.slug) ?? null;
      if (metaPrimary) {
        const d1 = colorDistance(colors[0], metaPrimary);
        const d2 = colors[1] ? colorDistance(colors[1], metaPrimary) : Number.POSITIVE_INFINITY;
        const min = Math.min(d1, d2);
        if (min > 110) {
          process.stdout.write("rejected (fails metadata color check)\n");
          continue;
        }
      }

      rows.push({
        slug: team.slug,
        primary: colors[0],
        secondary: colors[1] ?? null,
        sourceUrl: articleUrl,
      });
      process.stdout.write(`ok (${colors[0]}${colors[1] ? `, ${colors[1]}` : ""})\n`);
    } catch (err) {
      process.stdout.write(`failed (${err instanceof Error ? err.message : "unknown"})\n`);
    }
    await sleep(180);
  }

  rows.sort((a, b) => a.slug.localeCompare(b.slug));
  const out = renderOutput(rows);
  await fs.writeFile(OUTPUT_FILE, out, "utf8");
  console.log(`\nWrote ${rows.length} team color entries to ${path.relative(ROOT, OUTPUT_FILE)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
