import type { PickemPhase } from "@/lib/pickem/storage";

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function lastMondayOfAugust(year: number) {
  const date = new Date(year, 7, 31);
  while (date.getDay() !== 1) {
    date.setDate(date.getDate() - 1);
  }
  return startOfDay(date);
}

export function derivePickemPhaseFromWeek(week: number): PickemPhase {
  if (week >= 16) return "postseason";
  if (week >= 14) return "championship";
  return "regular";
}

export function getCurrentCollegePickemContext(now = new Date()) {
  const season = now.getFullYear();
  const today = startOfDay(now);
  const weekOneStart = lastMondayOfAugust(season);
  const diffDays = Math.floor(
    (today.getTime() - weekOneStart.getTime()) / (1000 * 60 * 60 * 24),
  );

  const rawWeek = diffDays < 0 ? 1 : Math.floor(diffDays / 7) + 1;
  const week = Math.max(1, Math.min(17, rawWeek));
  const phase = derivePickemPhaseFromWeek(week);

  return {
    season,
    week,
    phase,
    weekOrRound: String(week),
  };
}
