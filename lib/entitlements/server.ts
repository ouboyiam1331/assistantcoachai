import { PLAN_ENTITLEMENTS } from "@/lib/entitlements/defaults";
import { UserPlan, type UserEntitlements } from "@/lib/entitlements/types";

export function getDevUserPlan(): UserPlan {
  const raw = String(process.env.DEV_USER_PLAN ?? "FREE").toUpperCase();
  if (raw === UserPlan.PREMIUM) return UserPlan.PREMIUM;
  if (raw === UserPlan.PRO) return UserPlan.PRO;
  return UserPlan.FREE;
}

export function getServerUserEntitlements(): UserEntitlements {
  const plan = getDevUserPlan();
  return {
    userId: "dev-user",
    plan,
    entitlements: PLAN_ENTITLEMENTS[plan],
  };
}

