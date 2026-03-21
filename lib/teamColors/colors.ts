import { TEAM_COLOR_ALIASES, TEAM_COLOR_MAP } from "@/data/teamColors";

type TeamColorOverride = {
  primary?: string | null;
  secondary?: string | null;
  sourceName: string;
  sourceUrl?: string;
  estimated?: boolean;
};

export type TeamColorProfile = {
  primary: string | null;
  secondary: string | null;
  sourceName: string;
  sourceUrl: string | null;
  estimated: boolean;
  disclaimer: string;
};

function normalizeTeamKey(input: string) {
  return String(input || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

const TEAM_COLOR_MAP_NORMALIZED: Record<string, (typeof TEAM_COLOR_MAP)[string]> =
  Object.fromEntries(
    Object.entries(TEAM_COLOR_MAP).map(([slug, entry]) => [
      normalizeTeamKey(slug),
      entry,
    ]),
  );

const TEAM_COLOR_ALIASES_NORMALIZED: Record<string, string> = Object.fromEntries(
  Object.entries(TEAM_COLOR_ALIASES).map(([nameKey, slug]) => [
    normalizeTeamKey(nameKey),
    normalizeTeamKey(slug),
  ]),
);

function getOverride(slugKey: string, nameKey: string): TeamColorOverride | null {
  const fromSlug = TEAM_COLOR_MAP_NORMALIZED[slugKey];
  if (fromSlug) {
    return {
      primary: fromSlug.primary,
      secondary: fromSlug.secondary,
      sourceName: "TeamColorCodes.com",
      sourceUrl: fromSlug.sourceUrl,
      estimated: true,
    };
  }

  const aliasSlug = TEAM_COLOR_ALIASES_NORMALIZED[nameKey];
  if (aliasSlug && TEAM_COLOR_MAP_NORMALIZED[aliasSlug]) {
    const aliased = TEAM_COLOR_MAP_NORMALIZED[aliasSlug];
    return {
      primary: aliased.primary,
      secondary: aliased.secondary,
      sourceName: "TeamColorCodes.com",
      sourceUrl: aliased.sourceUrl,
      estimated: true,
    };
  }

  return null;
}

export function resolveTeamColorProfile(input: {
  slug?: string | null;
  teamName?: string | null;
  primary?: string | null;
  secondary?: string | null;
}): TeamColorProfile {
  const slugKey = normalizeTeamKey(input.slug ?? "");
  const nameKey = normalizeTeamKey(input.teamName ?? "");

  const override = getOverride(slugKey, nameKey);

  const primary = override?.primary ?? input.primary ?? null;
  const secondary = override?.secondary ?? input.secondary ?? null;
  const sourceName = override?.sourceName ?? "CFBD Team Metadata";
  const sourceUrl = override?.sourceUrl ?? null;
  const estimated = override?.estimated ?? true;

  const disclaimer =
    sourceName === "TeamColorCodes.com"
      ? "Colors are estimations provided by TeamColorCodes.com."
      : estimated
        ? `Colors provided by ${sourceName}; values may be estimated.`
        : `Colors provided by ${sourceName}.`;

  return {
    primary,
    secondary,
    sourceName,
    sourceUrl,
    estimated,
    disclaimer,
  };
}
