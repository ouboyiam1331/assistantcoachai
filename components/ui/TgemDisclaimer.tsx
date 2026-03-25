"use client";

type Props = {
  compact?: boolean;
};

export default function TgemDisclaimer({ compact = false }: Props) {
  return (
    <div
      style={{
        marginTop: compact ? 10 : 14,
        padding: compact ? "10px 12px" : "12px 14px",
        border: "1px solid #f1d38a",
        borderRadius: 10,
        background: "#fff8e6",
        color: "#5c4300",
        fontSize: compact ? 13 : 14,
        lineHeight: 1.5,
      }}
    >
      <strong>TGEM Disclaimer:</strong> TGEM outputs are leans and estimates, not
      guarantees. The model will not be correct every time, and users are free to
      pick against any TGEM lean based on their own judgment.
    </div>
  );
}
