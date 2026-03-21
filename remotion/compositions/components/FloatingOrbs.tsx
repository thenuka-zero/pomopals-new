import { useCurrentFrame } from "remotion"

const ORBS = [
  { x: "15%", baseY: 200, amplitude: 40, phase: 0, size: 320, opacity: 0.15 },
  { x: "70%", baseY: 500, amplitude: 60, phase: 1.2, size: 260, opacity: 0.12 },
  { x: "40%", baseY: 800, amplitude: 50, phase: 2.4, size: 400, opacity: 0.1 },
  { x: "85%", baseY: 150, amplitude: 35, phase: 0.8, size: 200, opacity: 0.18 },
  { x: "25%", baseY: 600, amplitude: 45, phase: 3.0, size: 280, opacity: 0.13 },
]

export function FloatingOrbs() {
  const frame = useCurrentFrame()

  return (
    <>
      {ORBS.map((orb, i) => {
        const yOffset = Math.sin(frame / 80 + orb.phase) * orb.amplitude
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: orb.x,
              top: orb.baseY + yOffset,
              width: orb.size,
              height: orb.size,
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.6)",
              filter: "blur(60px)",
              opacity: orb.opacity,
              transform: "translate(-50%, -50%)",
            }}
          />
        )
      })}
    </>
  )
}
