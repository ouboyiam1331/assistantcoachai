export function getDefaultCfbSeasonYear(now = new Date()) {
  const currentYear = now.getFullYear();
  const month = now.getMonth(); // 0-based
  return month >= 7 ? currentYear : currentYear - 1;
}

// Team schedule pages should roll to the upcoming season in April.
export function getScheduleSeasonYear(now = new Date()) {
  const currentYear = now.getFullYear();
  const month = now.getMonth(); // 0-based
  return month >= 3 ? currentYear : currentYear - 1;
}

// Season stats/leaders stay on previous season until August.
export function getStatsSeasonYear(now = new Date()) {
  const currentYear = now.getFullYear();
  const month = now.getMonth(); // 0-based
  return month >= 7 ? currentYear : currentYear - 1;
}

// From Jan-Jul, allow fallback probing; from Aug onward, show pending for new season.
export function allowPriorSeasonFallback(now = new Date()) {
  const month = now.getMonth(); // 0-based
  return month < 7;
}
