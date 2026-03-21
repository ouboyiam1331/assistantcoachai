import type { LeagueKey } from "@/lib/leagues/config";

export enum UserPlan {
  FREE = "FREE",
  PREMIUM = "PREMIUM",
  PRO = "PRO",
}

export type Entitlements = {
  maxPickSheets: number;
  adsEnabled: boolean;
  historicalAccess: boolean;
  leagueAccess: LeagueKey[];
  aiChatCreditsPerDay: number;
  manVsMachineEnabled: boolean;
};

export type UserEntitlements = {
  userId: string;
  plan: UserPlan;
  entitlements: Entitlements;
};

