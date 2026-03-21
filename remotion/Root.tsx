import { Composition } from "remotion"
import { PlaylistVideo, PlaylistVideoProps } from "./compositions/PlaylistVideo"

const defaultProps: PlaylistVideoProps = {
  playlist: {
    id: "lofi-hiphop",
    title: "Lofi Hip Hop Study",
    genre: "lofi",
    sessions: 4,
    emoji: "🎧",
    gradient: ["#7c3aed", "#4338ca"],
  },
  audioSrc: "",
  durationInSeconds: 120,
}

export function RemotionRoot() {
  return (
    <Composition
      id="PlaylistVideo"
      component={PlaylistVideo}
      fps={30}
      width={1920}
      height={1080}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.ceil((props as PlaylistVideoProps).durationInSeconds * 30),
      })}
      defaultProps={defaultProps}
    />
  )
}
