import PlaylistsClient from "./PlaylistsClient"

export const metadata = {
  title: "Focus Playlists | PomoPals",
  description:
    "Curated music playlists to help you stay in the zone during your Pomodoro sessions.",
}

export default function PlaylistsPage() {
  return <PlaylistsClient />
}
