import { LeagueKey } from "@/lib/leagues/config";
import { UserPlan, type Entitlements } from "@/lib/entitlements/types";

export const PLAN_ENTITLEMENTS: Record<UserPlan, Entitlements> = {
  [UserPlan.FREE]: {
    maxPickSheets: 3,
    adsEnabled: true,
    historicalAccess: false,
    leagueAccess: [LeagueKey.FBS, LeagueKey.FCS],
    aiChatCreditsPerDay: 5,
    manVsMachineEnabled: false,
  },
  [UserPlan.PREMIUM]: {
    maxPickSheets: 15,
    adsEnabled: false,
    historicalAccess: true,
    leagueAccess: [LeagueKey.FBS, LeagueKey.FCS, LeagueKey.NFL],
    aiChatCreditsPerDay: 50,
    manVsMachineEnabled: true,
  },
  [UserPlan.PRO]: {
    maxPickSheets: 999,
    adsEnabled: false,
    historicalAccess: true,
    leagueAccess: [
      LeagueKey.FBS,
      LeagueKey.FCS,
      LeagueKey.NFL,
      LeagueKey.NCAAMB,
      LeagueKey.NBA,
      LeagueKey.MLB,
    ],
    aiChatCreditsPerDay: 500,
    manVsMachineEnabled: true,
  },
};

