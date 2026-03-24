export enum LeagueKey {
  FBS = "FBS",
  FCS = "FCS",
  NFL = "NFL",
  NCAAMB = "NCAAMB",
  NCAAWB = "NCAAWB",
  NBA = "NBA",
  MLB = "MLB",
}

export type LeagueSeasonRules = {
  unitLabel: "week" | "game" | "round";
  postseasonTypes: string[];
};

export type LeagueRouteSupport = {
  teamAnalysis: boolean;
  matchupAnalysis: boolean;
  pickem: boolean;
  archive: boolean;
  aiAssistant: boolean;
  bracketology: boolean;
};

export type LeagueConfig = {
  key: LeagueKey;
  label: string;
  enabled: boolean;
  comingSoon: boolean;
  dataProvider: "cfbd" | "mock" | "nfl" | "basketball" | "mlb";
  seasonRules: LeagueSeasonRules;
  routes: LeagueRouteSupport;
};

export const leagueConfig: Record<LeagueKey, LeagueConfig> = {
  [LeagueKey.FBS]: {
    key: LeagueKey.FBS,
    label: "College Football - FBS",
    enabled: true,
    comingSoon: false,
    dataProvider: "cfbd",
    seasonRules: {
      unitLabel: "week",
      postseasonTypes: ["regular", "championship", "postseason", "bowl", "cfp"],
    },
    routes: {
      teamAnalysis: true,
      matchupAnalysis: true,
      pickem: true,
      archive: true,
      aiAssistant: true,
      bracketology: false,
    },
  },
  [LeagueKey.FCS]: {
    key: LeagueKey.FCS,
    label: "College Football - FCS",
    enabled: true,
    comingSoon: false,
    dataProvider: "cfbd",
    seasonRules: {
      unitLabel: "week",
      postseasonTypes: ["regular", "championship", "postseason", "playoffs"],
    },
    routes: {
      teamAnalysis: true,
      matchupAnalysis: true,
      pickem: true,
      archive: true,
      aiAssistant: true,
      bracketology: false,
    },
  },
  [LeagueKey.NFL]: {
    key: LeagueKey.NFL,
    label: "NFL",
    enabled: false,
    comingSoon: true,
    dataProvider: "nfl",
    seasonRules: {
      unitLabel: "week",
      postseasonTypes: ["regular", "playoffs", "super-bowl"],
    },
    routes: {
      teamAnalysis: true,
      matchupAnalysis: true,
      pickem: true,
      archive: true,
      aiAssistant: true,
      bracketology: false,
    },
  },
  [LeagueKey.NCAAMB]: {
    key: LeagueKey.NCAAMB,
    label: "NCAA Men's Basketball",
    enabled: false,
    comingSoon: true,
    dataProvider: "basketball",
    seasonRules: {
      unitLabel: "round",
      postseasonTypes: ["regular", "conference-tournament", "march-madness"],
    },
    routes: {
      teamAnalysis: true,
      matchupAnalysis: true,
      pickem: true,
      archive: true,
      aiAssistant: true,
      bracketology: true,
    },
  },
  [LeagueKey.NCAAWB]: {
    key: LeagueKey.NCAAWB,
    label: "NCAA Women's Basketball",
    enabled: false,
    comingSoon: true,
    dataProvider: "basketball",
    seasonRules: {
      unitLabel: "round",
      postseasonTypes: ["regular", "conference-tournament", "march-madness"],
    },
    routes: {
      teamAnalysis: true,
      matchupAnalysis: true,
      pickem: true,
      archive: true,
      aiAssistant: true,
      bracketology: true,
    },
  },
  [LeagueKey.NBA]: {
    key: LeagueKey.NBA,
    label: "NBA",
    enabled: false,
    comingSoon: true,
    dataProvider: "basketball",
    seasonRules: {
      unitLabel: "game",
      postseasonTypes: ["regular", "play-in", "playoffs", "finals"],
    },
    routes: {
      teamAnalysis: true,
      matchupAnalysis: true,
      pickem: true,
      archive: true,
      aiAssistant: true,
      bracketology: false,
    },
  },
  [LeagueKey.MLB]: {
    key: LeagueKey.MLB,
    label: "MLB",
    enabled: false,
    comingSoon: true,
    dataProvider: "mlb",
    seasonRules: {
      unitLabel: "game",
      postseasonTypes: ["regular", "wild-card", "division-series", "cs", "world-series"],
    },
    routes: {
      teamAnalysis: true,
      matchupAnalysis: true,
      pickem: true,
      archive: true,
      aiAssistant: true,
      bracketology: false,
    },
  },
};

export function getLeagueConfig(key: LeagueKey) {
  return leagueConfig[key];
}

export const allLeagues = Object.values(leagueConfig);
export const enabledLeagues = allLeagues.filter((l) => l.enabled);
