import path from "path"
import fs from "fs"
import https from "https"
import http from "http"

// ---------------------------------------------------------------------------
// Playlist config (mirrors PlaylistsClient.tsx)
// ---------------------------------------------------------------------------

interface PlaylistConfig {
  id: string
  title: string
  genre: string
  sessions: number
  emoji: string
  gradient: [string, string]
  sunoPrompt: string
}

const PLAYLISTS: PlaylistConfig[] = [
  {
    id: "lofi-hiphop",
    title: "Lofi Hip Hop Study",
    genre: "lofi",
    sessions: 4,
    emoji: "🎧",
    gradient: ["#7c3aed", "#4338ca"],
    sunoPrompt: "lofi hip hop, instrumental, chill study beats, warm vinyl crackle, no lyrics",
  },
  {
    id: "rainy-classics",
    title: "Rainy Day Classics",
    genre: "classical",
    sessions: 6,
    emoji: "🎼",
    gradient: ["#3b82f6", "#475569"],
    sunoPrompt: "classical piano, instrumental, soft orchestral, study music, no lyrics",
  },
  {
    id: "forest-sounds",
    title: "Forest Sounds Focus",
    genre: "nature",
    sessions: 4,
    emoji: "🌿",
    gradient: ["#22c55e", "#065f46"],
    sunoPrompt: "ambient nature sounds, forest rain, birds, soft wind, relaxing, no music",
  },
  {
    id: "late-night-jazz",
    title: "Late Night Jazz",
    genre: "jazz",
    sessions: 5,
    emoji: "🎷",
    gradient: ["#f59e0b", "#ea580c"],
    sunoPrompt: "smooth jazz, instrumental, late night cafe, soft trumpet and piano, no lyrics",
  },
  {
    id: "deep-space-ambient",
    title: "Deep Space Ambient",
    genre: "ambient",
    sessions: 8,
    emoji: "🌌",
    gradient: ["#312e81", "#1e293b"],
    sunoPrompt: "deep ambient, space, drone, atmospheric, focus music, no lyrics",
  },
  {
    id: "cafe-bossa-nova",
    title: "Café Bossa Nova",
    genre: "jazz",
    sessions: 4,
    emoji: "☕",
    gradient: ["#92400e", "#713f12"],
    sunoPrompt: "bossa nova, instrumental, warm cafe, upbeat but relaxed, no lyrics",
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function printPrerequisites() {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PomoPals Video Generator — Prerequisites
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Get your Suno session cookie:
   Open suno.com → DevTools → Network tab → any request → copy the "Cookie" header value

2. Clone suno-api:
   git clone https://github.com/gcui-art/suno-api ~/Repos/suno-api

3. Add your cookie:
   echo "SUNO_COOKIE=<your-cookie>" > ~/Repos/suno-api/.env

4. Start suno-api (Docker required):
   cd ~/Repos/suno-api && docker compose up -d

5. Install ffmpeg (required by Remotion):
   brew install ffmpeg

6. Add to pomopals-new .env.local:
   SUNO_API_URL=http://localhost:3000

Then re-run:
  npx ts-node --project tsconfig.scripts.json scripts/generate-video.ts --playlist lofi-hiphop

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    const client = url.startsWith("https") ? https : http
    client.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close()
        fs.unlinkSync(dest)
        downloadFile(response.headers.location!, dest).then(resolve).catch(reject)
        return
      }
      response.pipe(file)
      file.on("finish", () => file.close(() => resolve()))
    }).on("error", (err) => {
      fs.unlinkSync(dest)
      reject(err)
    })
  })
}

async function fetchJson(url: string, options: RequestInit = {}): Promise<unknown> {
  const res = await fetch(url, options)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status} from ${url}: ${text}`)
  }
  return res.json()
}

function parseArgs(): { playlistId: string; audioUrl?: string } {
  const args = process.argv.slice(2)
  const idx = args.indexOf("--playlist")
  const playlistId = idx !== -1 ? args[idx + 1] : "lofi-hiphop"
  const audioIdx = args.indexOf("--audio-url")
  const audioUrl = audioIdx !== -1 ? args[audioIdx + 1] : undefined
  return { playlistId, audioUrl }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { playlistId, audioUrl: presetAudioUrl } = parseArgs()

  const playlist = PLAYLISTS.find((p) => p.id === playlistId)
  if (!playlist) {
    console.error(`Unknown playlist ID: "${playlistId}"`)
    console.error(`Valid IDs: ${PLAYLISTS.map((p) => p.id).join(", ")}`)
    process.exit(1)
  }

  console.log(`\n🎬 PomoPals Video Generator`)
  console.log(`   Playlist : ${playlist.emoji} ${playlist.title}`)

  const outputDir = path.resolve(__dirname, "../output")
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })

  const audioPath = path.join(outputDir, `${playlist.id}-audio.mp3`)

  let durationInSeconds = 120

  // audioSrc for Remotion: use CDN URL directly (Remotion supports HTTP), or local path as fallback
  const remotionAudioSrc = presetAudioUrl || audioPath

  if (presetAudioUrl) {
    // --audio-url provided: use CDN URL directly for Remotion (no download needed)
    console.log(`\n🎵 Using provided audio URL for rendering.`)
    console.log(`   URL: ${presetAudioUrl}`)
  } else if (fs.existsSync(audioPath)) {
    console.log(`\n♻️  Reusing existing audio: ${audioPath}`)
  } else {
    // Call suno-api Docker container
    const sunoApiUrl = process.env.SUNO_API_URL || "http://localhost:3000"
    console.log(`   Suno API : ${sunoApiUrl}\n`)

    try {
      const limit = await fetchJson(`${sunoApiUrl}/api/get_limit`) as { credits_left?: number }
      console.log(`✅ Suno API reachable — credits remaining: ${limit.credits_left ?? "unknown"}`)
    } catch {
      console.error(`\n❌ Cannot reach Suno API at ${sunoApiUrl}`)
      printPrerequisites()
      process.exit(1)
    }

    console.log(`\n🎵 Requesting Suno audio generation...`)
    console.log(`   Prompt: "${playlist.sunoPrompt}"`)
    console.log(`   (This takes 30–90 seconds — waiting for audio...)`)

    const generateResult = await fetchJson(`${sunoApiUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: playlist.sunoPrompt,
        make_instrumental: true,
        wait_audio: true,
      }),
    }) as Array<{ audio_url?: string; duration?: number; id?: string }>

    const track = generateResult[0]
    if (!track?.audio_url) {
      console.error("❌ Suno did not return an audio_url. Response:", JSON.stringify(generateResult, null, 2))
      process.exit(1)
    }

    durationInSeconds = track.duration ?? 120
    console.log(`✅ Audio generated! Duration: ${durationInSeconds}s`)
    console.log(`   URL: ${track.audio_url}`)

    console.log(`\n⬇️  Downloading audio to ${audioPath}...`)
    await downloadFile(track.audio_url, audioPath)
    console.log(`✅ Audio saved.`)
  }

  // Step 3: Bundle & render with Remotion ------------------------------------
  console.log(`\n🎥 Bundling Remotion composition...`)

  // Dynamic imports to avoid loading heavy Remotion libs at parse time
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { bundle } = require("@remotion/bundler") as typeof import("@remotion/bundler")
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { selectComposition, renderMedia } = require("@remotion/renderer") as typeof import("@remotion/renderer")

  const entryPoint = path.resolve(__dirname, "../remotion/index.ts")
  const serveUrl = await bundle({
    entryPoint,
    // Webpack override to handle ts-node / commonjs interop
    webpackOverride: (config) => config,
  })

  console.log(`✅ Bundle ready.`)

  const inputProps = {
    playlist: {
      id: playlist.id,
      title: playlist.title,
      genre: playlist.genre,
      sessions: playlist.sessions,
      emoji: playlist.emoji,
      gradient: playlist.gradient,
    },
    audioSrc: remotionAudioSrc,
    durationInSeconds,
  }

  const composition = await selectComposition({
    serveUrl,
    id: "PlaylistVideo",
    inputProps,
  })

  const outputLocation = path.join(outputDir, `${playlist.id}.mp4`)
  console.log(`\n🎬 Rendering ${composition.durationInFrames} frames at 1920×1080 → ${outputLocation}`)

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation,
    inputProps,
    onProgress: ({ progress }) => {
      process.stdout.write(`\r   Progress: ${Math.round(progress * 100)}%`)
    },
  })

  console.log(`\n\n✅ Video saved to output/${playlist.id}.mp4 — ready to upload to YouTube`)
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err)
  process.exit(1)
})
