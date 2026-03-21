import { useCurrentFrame, useVideoConfig, interpolate, spring, Audio, AbsoluteFill } from "remotion"
import { AnimatedBackground } from "./components/AnimatedBackground"
import { FloatingOrbs } from "./components/FloatingOrbs"
import { TitleCard } from "./components/TitleCard"
import { ProgressBar } from "./components/ProgressBar"

export interface PlaylistVideoProps {
  playlist: {
    id: string
    title: string
    genre: string
    sessions: number
    emoji: string
    gradient: [string, string]
  }
  audioSrc: string
  durationInSeconds: number
}

export function PlaylistVideo({ playlist, audioSrc }: PlaylistVideoProps) {
  const frame = useCurrentFrame()
  const { durationInFrames, fps } = useVideoConfig()

  // Phase 1: 0–90 frames — title card springs in
  const titleIntroOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" })
  const titleIntroY = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 120 },
    from: 40,
    to: 0,
    durationInFrames: 90,
  })

  // Phase 2: after frame 90 — main visuals, title shrinks to corner
  const mainPhaseOpacity = interpolate(frame, [60, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })

  // Fade to black in last 90 frames
  const fadeToBlack = interpolate(
    frame,
    [durationInFrames - 90, durationInFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  )

  const isIntroPhase = frame < 90

  return (
    <AbsoluteFill>
      {/* Background always visible */}
      <AnimatedBackground gradient={playlist.gradient} />
      <FloatingOrbs />

      {/* Intro title card (frames 0–90) */}
      {isIntroPhase && (
        <TitleCard
          emoji={playlist.emoji}
          title={playlist.title}
          sessions={playlist.sessions}
          opacity={titleIntroOpacity}
          translateY={titleIntroY}
        />
      )}

      {/* Main phase (frame 90+) */}
      {!isIntroPhase && (
        <div style={{ opacity: mainPhaseOpacity, position: "absolute", inset: 0 }}>
          <TitleCard
            emoji={playlist.emoji}
            title={playlist.title}
            sessions={playlist.sessions}
            compact
          />
          <ProgressBar />
        </div>
      )}

      {/* Fade to black overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "black",
          opacity: fadeToBlack,
          pointerEvents: "none",
        }}
      />

      {/* Audio baked into MP4 */}
      <Audio src={audioSrc} />
    </AbsoluteFill>
  )
}
