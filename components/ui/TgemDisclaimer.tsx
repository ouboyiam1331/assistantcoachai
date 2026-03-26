"use client";

type Props = {
  compact?: boolean;
};

export default function TgemDisclaimer({ compact = false }: Props) {
  return (
    <div
      className={`rounded-xl border border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100 ${
        compact ? "mt-2.5 px-3 py-2.5 text-[13px]" : "mt-3.5 px-3.5 py-3 text-sm"
      }`}
      style={{ lineHeight: 1.5 }}
    >
      <strong>TGEM Disclaimer:</strong> TGEM outputs are leans and estimates, not
      guarantees. The model will not be correct every time, and users are free to
      pick against any TGEM lean based on their own judgment.
    </div>
  );
}
