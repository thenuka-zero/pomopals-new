import { useCurrentFrame, useVideoConfig, interpolate } from "remotion"

interface Props {
  gradient: [string, string]
}

export function AnimatedBackground({ gradient }: Props) {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()

  const hue = interpolate(frame, [0, durationInFrames], [0, 60])

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
        filter: `hue-rotate(${hue}deg)`,
      }}
    />
  )
}
