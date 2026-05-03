export function getDefaultCfbSeasonYear(now = new Date()) {
  const currentYear = now.getFullYear();
  const month = now.getMonth(); // 0-based
  return month >= 7 ? currentYear : currentYear - 1;
}

// Team schedule pages should roll to the upcoming season in mid-July.
export function getScheduleSeasonYear(now = new Date()) {
  const currentYear = now.getFullYear();
  const month = now.getMonth(); // 0-based
  const day = now.getDate();
  return month > 6 || (month === 6 && day >= 15) ? currentYear : currentYear - 1;
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
