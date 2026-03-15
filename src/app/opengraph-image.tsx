import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "PomoPals — Pomodoro Timer with Friends";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FDF6EC",
          fontFamily: "sans-serif",
          gap: "24px",
        }}
      >
        <div style={{ fontSize: "120px", lineHeight: 1 }}>🍅</div>
        <div
          style={{
            fontSize: "80px",
            fontWeight: 900,
            color: "#3D2C2C",
            letterSpacing: "-2px",
          }}
        >
          Pomo<span style={{ color: "#E54B4B" }}>Pals</span>
        </div>
        <div
          style={{
            fontSize: "32px",
            color: "#8B7355",
            fontWeight: 600,
            textAlign: "center",
            maxWidth: "800px",
          }}
        >
          Focus together, grow together.
        </div>
        <div
          style={{
            fontSize: "22px",
            color: "#A08060",
            textAlign: "center",
            maxWidth: "700px",
          }}
        >
          A cute Pomodoro timer to share with friends.
        </div>
      </div>
    ),
    { ...size }
  );
}
