export function getDefaultCfbSeasonYear(now = new Date()) {
  const currentYear = now.getFullYear();
  const month = now.getMonth(); // 0-based
  return month >= 7 ? currentYear : currentYear - 1;
}

