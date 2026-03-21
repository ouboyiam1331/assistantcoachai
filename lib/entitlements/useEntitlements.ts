"use client";

import { useMemo } from "react";
import { PLAN_ENTITLEMENTS } from "@/lib/entitlements/defaults";
import { UserPlan, type UserEntitlements } from "@/lib/entitlements/types";

export function useEntitlements(): UserEntitlements {
  return useMemo(() => {
    if (typeof window === "undefined") {
      return {
        userId: "dev-user",
        plan: UserPlan.FREE,
        entitlements: PLAN_ENTITLEMENTS[UserPlan.FREE],
      };
    }
    const raw = window.localStorage.getItem("tgem_user_plan") ?? "FREE";
    const plan =
      raw === UserPlan.PRO
        ? UserPlan.PRO
        : raw === UserPlan.PREMIUM
          ? UserPlan.PREMIUM
          : UserPlan.FREE;
    return {
      userId: "dev-user",
      plan,
      entitlements: PLAN_ENTITLEMENTS[plan],
    };
  }, []);
}

