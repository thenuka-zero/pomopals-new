"use client";

import { useState } from "react";

interface ChangelogEntry {
  version: string;
  date: string;
  categories: { name: string; items: string[] }[];
}

const CATEGORY_EMOJI: Record<string, string> = {
  Added: "✨",
  Fixed: "🐛",
  Changed: "🔄",
  Removed: "🗑️",
  Security: "🔒",
  Deprecated: "⚠️",
  Performance: "⚡",
};

// ── Roadmap data ────────────────────────────────────────────────────────────

const ROADMAP: { month: string; emoji: string; items: { title: string; description: string; completed?: boolean }[] }[] = [
  {
    month: "March 2026",
    emoji: "🌱",
    items: [
      {
        title: "Profile pages",
        description: "Public profile pages for each account summarising their stats, achievements, and focus history.",
        completed: true,
      },
      {
        title: "Profile settings",
        description: "A dedicated settings page to change email, password, display name, and notification preferences.",
        completed: true,
      },
      {
        title: "Feature & bug requests",
        description: "An in-app form to submit feature ideas and bug reports directly — no GitHub account required.",
      },
      {
        title: "Leaderboards",
        description: "Daily, weekly, and monthly leaderboards showing who's focused the most among your friends.",
      },
      {
        title: "Status broadcasting",
        description: "Opt-in setting to broadcast what you're working on, and proactively join a friend's active Pomodoro from your friends list.",
      },
    ],
  },
  {
    month: "April 2026",
    emoji: "🌸",
    items: [
      {
        title: "Onboarding email drip",
        description: "A friendly sequence of emails to help new users start their first Pomodoro and build a habit.",
      },
      {
        title: "Breathing countdown",
        description: "A \"Take a deep breath\" 3-2-1 countdown that plays before each Pomodoro starts, to ease you in.",
      },
      {
        title: "Live support chat",
        description: "Real-time chat with the PomoPals team for support and feature discussions — right inside the app.",
      },
    ],
  },
];

// ── Changelog components ────────────────────────────────────────────────────

function ChangelogSection({ entry, isLatest }: { entry: ChangelogEntry; isLatest: boolean }) {
  const isUnreleased = entry.version === "Unreleased";
  return (
    <div className="relative">
      <div className="absolute -left-[41px] top-6 w-4 h-4 rounded-full bg-[#E54B4B] border-2 border-[#FDF6EC] shadow-sm" />
      <div className={`bg-white rounded-2xl border ${isLatest ? "border-[#E54B4B]/30 shadow-md shadow-[#E54B4B]/10" : "border-[#F0E6D3] shadow-sm"} p-6 mb-6`}>
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-extrabold ${
            isUnreleased ? "bg-[#F0E6D3] text-[#8B7355]" : "bg-[#E54B4B] text-white"
          }`}>
            {isUnreleased ? "🚧 Unreleased" : `🍅 v${entry.version}`}
          </span>
          {isLatest && !isUnreleased && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FFF0F0] text-[#E54B4B] border border-[#E54B4B]/20">
              ✨ Latest
            </span>
          )}
          {entry.date && (
            <span className="text-xs text-[#B8A080] font-medium ml-auto">📅 {entry.date}</span>
          )}
        </div>
        <div className="space-y-4">
          {entry.categories.map((cat) => (
            <div key={cat.name}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base leading-none">{CATEGORY_EMOJI[cat.name] ?? "📌"}</span>
                <h3 className="text-sm font-extrabold text-[#3D2C2C] uppercase tracking-wider">{cat.name}</h3>
              </div>
              <ul className="space-y-1.5 pl-1">
                {cat.items.map((item, i) => (
                  <li key={i} className="flex gap-2.5 items-start">
                    <span className="text-[#E54B4B] text-xs mt-1.5 flex-shrink-0">●</span>
                    <span className="text-sm text-[#5C4033] leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Roadmap components ──────────────────────────────────────────────────────

function RoadmapSection({ section }: { section: typeof ROADMAP[number] }) {
  const allDone = section.items.every((i) => i.completed);
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl leading-none">{section.emoji}</span>
        <h2 className="text-lg font-extrabold text-[#3D2C2C]">{section.month}</h2>
        <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${allDone ? "bg-[#6EAE3E]/10 text-[#6EAE3E]" : "bg-[#E54B4B]/10 text-[#E54B4B]"}`}>
          {allDone ? "Shipped" : "Coming soon"}
        </span>
      </div>
      <div className="space-y-3">
        {section.items.map((item, i) => (
          <div key={i} className={`bg-white border-2 rounded-xl px-5 py-4 flex gap-3 items-start ${item.completed ? "border-[#6EAE3E]/30" : "border-[#F0E6D3]"}`}>
            <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${item.completed ? "bg-[#6EAE3E]" : "bg-[#F0E6D3]"}`}>
              {item.completed ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <span className="w-2 h-2 rounded-full bg-[#A08060] block" />
              )}
            </span>
            <div>
              <p className={`text-sm font-bold ${item.completed ? "text-[#6EAE3E]" : "text-[#3D2C2C]"}`}>{item.title}</p>
              <p className="text-xs text-[#8B7355] mt-0.5 leading-relaxed">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main client component ───────────────────────────────────────────────────

type Tab = "whats-new" | "roadmap";

export default function ChangelogClient({ entries }: { entries: ChangelogEntry[] }) {
  const [tab, setTab] = useState<Tab>("whats-new");

  return (
    <main className="min-h-screen bg-[#FDF6EC]">
      <div className="max-w-2xl mx-auto px-6 py-14">

        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-5xl leading-none select-none block mb-4">🍅</span>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#3D2C2C]">
            {tab === "whats-new" ? "What's New" : "Roadmap"}
          </h1>
          <p className="mt-2 text-[#8B7355] font-medium">
            {tab === "whats-new" ? "Every little update, with love." : "What we're building next."}
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex justify-center gap-1 mb-10">
          <button
            onClick={() => setTab("whats-new")}
            className={`px-5 py-2.5 rounded-full text-sm font-bold transition-colors ${
              tab === "whats-new"
                ? "bg-[#E54B4B] text-white shadow-md shadow-[#E54B4B]/20"
                : "bg-white border-2 border-[#F0E6D3] text-[#8B7355] hover:text-[#E54B4B]"
            }`}
          >
            ✨ What&apos;s New
          </button>
          <button
            onClick={() => setTab("roadmap")}
            className={`px-5 py-2.5 rounded-full text-sm font-bold transition-colors ${
              tab === "roadmap"
                ? "bg-[#E54B4B] text-white shadow-md shadow-[#E54B4B]/20"
                : "bg-white border-2 border-[#F0E6D3] text-[#8B7355] hover:text-[#E54B4B]"
            }`}
          >
            🗺️ Roadmap
          </button>
        </div>

        {/* Content */}
        {tab === "whats-new" ? (
          entries.length === 0 ? (
            <p className="text-center text-[#B8A080]">No entries yet. Check back soon! 🌱</p>
          ) : (
            <div className="relative pl-10 border-l-2 border-dashed border-[#F0E6D3]">
              {entries.map((entry, i) => (
                <ChangelogSection key={entry.version} entry={entry} isLatest={i === 0} />
              ))}
            </div>
          )
        ) : (
          <div>
            {ROADMAP.map((section) => (
              <RoadmapSection key={section.month} section={section} />
            ))}
            <p className="text-center text-xs text-[#B8A080] mt-6">
              Timelines are estimates and may shift. Have an idea?{" "}
              <a href="mailto:hi@pomopals.com" className="text-[#E54B4B] hover:underline">Let us know.</a>
            </p>
          </div>
        )}

      </div>
    </main>
  );
}
