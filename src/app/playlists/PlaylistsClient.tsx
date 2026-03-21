"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"

interface Playlist {
  id: string
  title: string
  description: string
  genre: string
  sessions: number
  youtubeUrl: string
  gradient: string
  emoji: string
}

const playlists: Playlist[] = [
  {
    id: "lofi-hiphop",
    title: "Lofi Hip Hop Study",
    description: "Chill beats to keep you focused and relaxed through your study sessions.",
    genre: "lofi",
    sessions: 4,
    youtubeUrl: "#",
    gradient: "from-purple-500 to-indigo-600",
    emoji: "🎧",
  },
  {
    id: "rainy-classics",
    title: "Rainy Day Classics",
    description: "Timeless classical pieces that pair beautifully with a rainy afternoon focus session.",
    genre: "classical",
    sessions: 6,
    youtubeUrl: "#",
    gradient: "from-blue-500 to-slate-600",
    emoji: "🎼",
  },
  {
    id: "forest-sounds",
    title: "Forest Sounds Focus",
    description: "Immerse yourself in nature — birds, rain, and rustling leaves to calm your mind.",
    genre: "nature",
    sessions: 4,
    youtubeUrl: "#",
    gradient: "from-green-500 to-emerald-700",
    emoji: "🌿",
  },
  {
    id: "late-night-jazz",
    title: "Late Night Jazz",
    description: "Smooth jazz to accompany those late-night deep work sessions.",
    genre: "jazz",
    sessions: 5,
    youtubeUrl: "#",
    gradient: "from-amber-500 to-orange-600",
    emoji: "🎷",
  },
  {
    id: "deep-space-ambient",
    title: "Deep Space Ambient",
    description: "Expansive ambient soundscapes to get you into a deep flow state.",
    genre: "ambient",
    sessions: 8,
    youtubeUrl: "#",
    gradient: "from-indigo-900 to-slate-900",
    emoji: "🌌",
  },
  {
    id: "cafe-bossa-nova",
    title: "Café Bossa Nova",
    description: "Warm, upbeat bossa nova rhythms for a cozy productive afternoon.",
    genre: "jazz",
    sessions: 4,
    youtubeUrl: "#",
    gradient: "from-amber-700 to-yellow-800",
    emoji: "☕",
  },
]

const genres = ["all", "lofi", "classical", "ambient", "jazz", "nature"]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
}

export default function PlaylistsClient() {
  const [activeGenre, setActiveGenre] = useState("all")

  const filtered =
    activeGenre === "all"
      ? playlists
      : playlists.filter((p) => p.genre === activeGenre)

  return (
    <div className="min-h-screen bg-[#FDF6EC]">
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mb-8"
        >
          <h1 className="text-3xl font-extrabold text-[#3D2C2C] tracking-tight mb-2">
            🎵 Focus Playlists
          </h1>
          <p className="text-[#8B7355] text-lg font-medium">
            Music to help you stay in the zone.
          </p>
        </motion.div>

        {/* Filter tabs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.08 }}
          className="flex flex-wrap gap-2 mb-8"
        >
          {genres.map((genre) => (
            <button
              key={genre}
              onClick={() => setActiveGenre(genre)}
              className={`relative px-4 py-1.5 rounded-full text-sm font-bold transition-colors capitalize ${
                activeGenre === genre ? "text-white" : "text-[#8B7355] hover:text-[#E54B4B]"
              }`}
            >
              {activeGenre === genre && (
                <motion.span
                  layoutId="active-tab"
                  className="absolute inset-0 bg-[#E54B4B] rounded-full"
                  style={{ zIndex: 0 }}
                />
              )}
              <span className="relative z-10">{genre}</span>
            </button>
          ))}
        </motion.div>

        {/* Card grid */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={activeGenre}
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 md:grid-cols-3 gap-4"
          >
            {filtered.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-[#A08060] text-sm mt-10"
        >
          More playlists coming soon.
        </motion.p>
      </div>
    </div>
  )
}

function PlaylistCard({ playlist }: { playlist: Playlist }) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.a
      variants={item}
      href={playlist.youtubeUrl}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ y: -4, boxShadow: "0 8px 24px rgba(229,75,75,0.15)" }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={`block rounded-2xl overflow-hidden bg-gradient-to-br ${playlist.gradient} text-white no-underline cursor-pointer`}
    >
      <div className="p-5 pb-3">
        <div className="text-3xl mb-3">{playlist.emoji}</div>
        <h3 className="text-base font-extrabold leading-tight mb-1">{playlist.title}</h3>
        <p className="text-white/70 text-xs leading-relaxed">{playlist.description}</p>
      </div>
      <div className="px-5 pb-4 flex items-center justify-between">
        <span className="text-white/60 text-xs font-semibold">
          {playlist.sessions} sessions · {playlist.sessions * 25} min
        </span>
        <motion.span
          className="text-xs font-bold flex items-center gap-1 text-white/80"
          animate={{ x: hovered ? 4 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          Open in YouTube <span>→</span>
        </motion.span>
      </div>
    </motion.a>
  )
}
