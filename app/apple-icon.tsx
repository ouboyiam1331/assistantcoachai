import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000000",
          color: "#f3f4f6",
          fontSize: 48,
          fontWeight: 800,
          letterSpacing: "-0.08em",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        TGEM
      </div>
    ),
    size,
  );
}
