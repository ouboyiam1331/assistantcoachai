 "use client";

import { adPlacementConfig, type AdPlacement } from "@/config/adPlacements";
import { useEntitlements } from "@/lib/entitlements/useEntitlements";

type AdSlotProps = {
  placement?: AdPlacement;
  label?: string;
  height?: number;
  className?: string;
};

export default function AdSlot({
  placement,
  label,
  height,
  className = "",
}: AdSlotProps) {
  const { entitlements } = useEntitlements();
  if (!entitlements.adsEnabled) return null;

  const configured = placement ? adPlacementConfig[placement] : null;
  const finalLabel = label ?? configured?.label ?? "Ad Banner";
  const finalHeight = height ?? configured?.height ?? 90;

  return (
    <div
      className={`tgem-ad-slot ${className}`.trim()}
      style={{ minHeight: finalHeight }}
      aria-label={`${finalLabel} placeholder`}
    >
      <span>{finalLabel}</span>
    </div>
  );
}
