import { FBS_TEAMS } from "@/data/fbsTeams";
import { resolvePickemTeamIdentity } from "@/lib/pickem/teamSlug";

const AUTO_PICK_CONFIDENCE_MIN = 60;

const FBS_CONFERENCE_BY_SLUG = new Map(
  FBS_TEAMS.map((team) => [team.slug, team.conference]),
);

function conferenceTier(conference?: string | null) {
  const value = String(conference ?? "");
  if (value === "SEC" || value === "Big Ten") return 3;
  if (value === "ACC" || value === "Big 12") return 2;
  return 1;
}

export type CollegeMatchupGuardrailInput = {
  homeTeam: string | null | undefined;
  awayTeam: string | null | undefined;
  neutralSite?: boolean | null;
  lean: string | null | undefined;
  confidence: number | null | undefined;
  reasons: string[] | null | undefined;
};

export type CollegeMatchupGuardrailResult = {
  lean: string | null | undefined;
  confidence: number | null | undefined;
  reasons: string[];
  note: string;
};

export function applyCollegeMatchupGuardrails({
  homeTeam,
  awayTeam,
  neutralSite,
  lean,
  confidence,
  reasons,
}: CollegeMatchupGuardrailInput): CollegeMatchupGuardrailResult {
  const homeIdentity = resolvePickemTeamIdentity(homeTeam);
  const awayIdentity = resolvePickemTeamIdentity(awayTeam);
  const baseReasons = [...(reasons ?? [])];

  let nextLean = lean;
  let nextConfidence = confidence;
  let nextReasons = baseReasons;
  let note = "";

  if (homeIdentity.isFbs !== awayIdentity.isFbs) {
    const fbsLean = homeIdentity.isFbs ? "HOME" : "AWAY";
    const nonFbsLean = homeIdentity.isFbs ? "AWAY" : "HOME";
    const currentConfidence = nextConfidence ?? 50;
    const pickedNonFbs = nextLean === nonFbsLean;

    if (pickedNonFbs && currentConfidence < 70) {
      nextLean = fbsLean;
      nextConfidence = Math.max(72, currentConfidence);
      nextReasons = [
        "Subdivision gap guardrail: FBS roster depth and line play edge are prioritized in mismatch games.",
        ...baseReasons,
      ].slice(0, 8);
      note = "Guardrail applied: FBS vs non-FBS mismatch adjusted toward the FBS side.";
    } else if (!pickedNonFbs) {
      nextConfidence = Math.max(64, currentConfidence);
      note = "Guardrail context: FBS vs non-FBS mismatch confidence floor applied.";
    }
  }

  if (homeIdentity.isFbs && awayIdentity.isFbs) {
    const homeConference = FBS_CONFERENCE_BY_SLUG.get(homeIdentity.token);
    const awayConference = FBS_CONFERENCE_BY_SLUG.get(awayIdentity.token);
    const tierGap = conferenceTier(homeConference) - conferenceTier(awayConference);
    const currentConfidence = nextConfidence ?? 50;
    const isLowConfidence = currentConfidence < AUTO_PICK_CONFIDENCE_MIN;
    const homeField = !neutralSite;

    if (homeField && tierGap >= 2 && isLowConfidence) {
      nextLean = "HOME";
      nextConfidence = Math.max(68, currentConfidence);
      nextReasons = [
        "Program strength prior: home power-tier team vs lower-tier FBS opponent.",
        ...nextReasons,
      ].slice(0, 8);
      note = "Guardrail applied: low-confidence mismatch adjusted toward the home power-tier side.";
    }
  }

  return {
    lean: nextLean,
    confidence: nextConfidence,
    reasons: nextReasons,
    note,
  };
}
