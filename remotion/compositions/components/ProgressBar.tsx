import { useCurrentFrame, useVideoConfig, interpolate } from "remotion"

export function ProgressBar() {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()

  const progress = interpolate(frame, [0, durationInFrames], [0, 100])

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
        background: "rgba(255,255,255,0.2)",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "rgba(255,255,255,0.8)",
        }}
      />
    </div>
  )
}
