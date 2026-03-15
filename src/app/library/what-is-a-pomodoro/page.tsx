import Link from "next/link";
import RelatedArticles from "@/components/RelatedArticles";

export const metadata = {
  title: "What is a Pomodoro? | Pom's Library",
  description:
    "Everything you need to know about the Pomodoro Technique — what it is, where it came from, and why it actually works.",
};

function Section({
  id,
  emoji,
  title,
  children,
}: {
  id: string;
  emoji: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl leading-none select-none">{emoji}</span>
        <h2 className="text-xl font-extrabold text-[#3D2C2C]">{title}</h2>
      </div>
      <div className="space-y-3 text-[#5C4033] leading-relaxed">{children}</div>
    </section>
  );
}

function Step({
  number,
  children,
}: {
  number: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#E54B4B] text-white text-xs font-extrabold flex items-center justify-center mt-0.5">
        {number}
      </div>
      <p className="flex-1 text-[#5C4033]">{children}</p>
    </div>
  );
}

function Callout({
  emoji,
  children,
}: {
  emoji: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 bg-[#FDF6EC] border border-[#F0E6D3] rounded-xl px-4 py-3">
      <span className="text-lg leading-none select-none flex-shrink-0 mt-0.5">{emoji}</span>
      <p className="text-sm text-[#5C4033]">{children}</p>
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="flex-1 h-px bg-[#F0E6D3]" />
      <span className="text-lg leading-none select-none opacity-50">🍅</span>
      <div className="flex-1 h-px bg-[#F0E6D3]" />
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 min-w-0 bg-[#FDF6EC] border border-[#F0E6D3] rounded-xl p-4 text-center">
      <p className="text-2xl font-extrabold text-[#E54B4B]">{value}</p>
      <p className="text-xs font-semibold text-[#8B7355] mt-1 leading-tight">{label}</p>
    </div>
  );
}

const TOC_ITEMS = [
  { id: "what-is-it", emoji: "🍅", label: "What is a Pomodoro?" },
  { id: "history", emoji: "🕰️", label: "The History" },
  { id: "how-it-works", emoji: "⚙️", label: "How It Works" },
  { id: "the-cycle", emoji: "🔄", label: "The Cycle" },
  { id: "the-science", emoji: "🧠", label: "The Science" },
  { id: "common-mistakes", emoji: "❌", label: "Common Mistakes" },
  { id: "get-started", emoji: "🚀", label: "Get Started" },
];

export default function WhatIsAPomodoro() {
  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* Back button */}
        <Link
          href="/library"
          className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors hover:text-[#E54B4B] text-[#8B7355]"
        >
          <span className="text-base leading-none">&larr;</span>
          Back to Library
        </Link>

        {/* Hero */}
        <div className="relative mt-6 rounded-2xl overflow-hidden shadow-lg bg-[#E54B4B]">
          <div className="absolute inset-0 pointer-events-none z-[1] bg-[radial-gradient(ellipse_at_80%_15%,rgba(255,255,255,0.2)_0%,transparent_55%)]" />
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.08] z-[1]"
            style={{
              backgroundImage: "radial-gradient(#FDF6EC 1.5px, transparent 1.5px)",
              backgroundSize: "18px 18px",
            }}
          />
          <div className="relative flex flex-col sm:flex-row items-center gap-6 px-8 py-10 sm:py-12 z-[2]">
            <div className="flex-shrink-0 flex items-center justify-center w-32 h-32 sm:w-40 sm:h-40">
              <span className="leading-none select-none text-[clamp(4rem,8vw,5.5rem)]">🍅</span>
            </div>
            <div className="text-center sm:text-left flex-1 min-w-0">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-3 bg-[#5C4033] text-[#FDF6EC]">
                Productivity
              </span>
              <h1 className="text-3xl md:text-5xl font-extrabold leading-tight tracking-tight text-[#FDF6EC]">
                What is a Pomodoro?
              </h1>
              <p className="mt-3 text-base font-semibold text-[#FDF6EC]/80">
                by Pom <span role="img" aria-label="tomato">🍅</span>
              </p>
              <p className="mt-4 text-sm sm:text-base leading-relaxed max-w-prose text-[#FDF6EC]/75">
                Everything you need to know about the Pomodoro Technique — what it is, where it came from, and why it actually works.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start mt-8">

          {/* Sticky TOC sidebar */}
          <aside className="lg:sticky lg:top-6 w-full lg:w-56 flex-shrink-0">
            <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-4">
              <p className="text-xs font-extrabold text-[#A08060] uppercase tracking-widest mb-3">
                Contents
              </p>
              <nav className="space-y-1">
                {TOC_ITEMS.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-semibold text-[#5C4033] hover:bg-[#FFF8F0] hover:text-[#E54B4B] transition-colors"
                  >
                    <span className="text-base leading-none">{item.emoji}</span>
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 bg-white border-2 border-[#F0E6D3] rounded-2xl p-6 sm:p-8 space-y-8">

            {/* What is it */}
            <Section id="what-is-it" emoji="🍅" title="What is a Pomodoro?">
              <p>
                A <strong className="text-[#3D2C2C]">Pomodoro</strong> is a focused 25-minute work session — the core building block of the Pomodoro Technique. The name comes from the Italian word for <em>tomato</em>, after the tomato-shaped kitchen timer Francesco Cirillo used as a university student in the 1980s.
              </p>
              <p>
                The idea is simple: work on one thing, without distraction, for 25 minutes. Then take a short break. Repeat. That&apos;s it.
              </p>
              <Callout emoji="💡">
                The power is not in the timer — it is in committing to a single task for a fixed, finite stretch of time. Knowing the session ends soon makes starting easier.
              </Callout>
            </Section>

            <Divider />

            {/* History */}
            <Section id="history" emoji="🕰️" title="The History">
              <p>
                In the late 1980s, Francesco Cirillo was struggling to focus while studying at Luiss University in Rome. He made a deal with himself: just ten minutes of real, unbroken focus. He grabbed a tomato-shaped kitchen timer from his desk and set it.
              </p>
              <p>
                It worked. He refined the system over the following years and published it formally in the 1990s. Today, the Pomodoro Technique is one of the most widely used productivity methods in the world — used by students, writers, programmers, and remote teams alike.
              </p>
              <div className="bg-[#FDF6EC] border border-[#F0E6D3] rounded-xl p-4 text-sm text-[#5C4033]">
                <p className="font-extrabold text-[#3D2C2C] mb-2">Timeline</p>
                <div className="space-y-2">
                  {[
                    ["Late 1980s", "Francesco Cirillo invents the technique as a student in Rome"],
                    ["1992", "First written description of the method"],
                    ["2006", "Published as a book, spreading globally"],
                    ["2010s–now", "Adopted by millions; integrated into apps, tools, and team workflows"],
                  ].map(([year, event]) => (
                    <div key={year} className="flex gap-3">
                      <span className="font-bold text-[#E54B4B] flex-shrink-0 w-24">{year}</span>
                      <span>{event}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            <Divider />

            {/* How it works */}
            <Section id="how-it-works" emoji="⚙️" title="How It Works">
              <p>
                The technique is built around five steps. Once you learn them, you can apply them anywhere.
              </p>
              <div className="space-y-2">
                <Step number={1}>
                  <strong className="text-[#3D2C2C]">Choose one task.</strong> Pick a single thing to work on. Not a project — a specific, actionable task.
                </Step>
                <Step number={2}>
                  <strong className="text-[#3D2C2C]">Set a timer for 25 minutes.</strong> Commit to that task and nothing else until the timer rings.
                </Step>
                <Step number={3}>
                  <strong className="text-[#3D2C2C]">Work without interruption.</strong> No checking messages, no context-switching. If something comes to mind, jot it down and return to it after.
                </Step>
                <Step number={4}>
                  <strong className="text-[#3D2C2C]">Take a 5-minute break.</strong> Step away from the screen. Breathe. Let your brain reset.
                </Step>
                <Step number={5}>
                  <strong className="text-[#3D2C2C]">After 4 pomodoros, take a longer break.</strong> 15–30 minutes. You have earned it.
                </Step>
              </div>
            </Section>

            <Divider />

            {/* The cycle */}
            <Section id="the-cycle" emoji="🔄" title="The Cycle">
              <p>
                One full Pomodoro cycle looks like this:
              </p>

              {/* Visual cycle */}
              <div className="rounded-xl border border-[#F0E6D3] overflow-hidden text-sm">
                {[
                  { phase: "🔴 Work", duration: "25 min", bg: "bg-[#FFF5F5]", border: "border-[#FFCCCC]" },
                  { phase: "🟢 Short Break", duration: "5 min", bg: "bg-[#F5FFF7]", border: "border-[#C3E6CB]" },
                  { phase: "🔴 Work", duration: "25 min", bg: "bg-[#FFF5F5]", border: "border-[#FFCCCC]" },
                  { phase: "🟢 Short Break", duration: "5 min", bg: "bg-[#F5FFF7]", border: "border-[#C3E6CB]" },
                  { phase: "🔴 Work", duration: "25 min", bg: "bg-[#FFF5F5]", border: "border-[#FFCCCC]" },
                  { phase: "🟢 Short Break", duration: "5 min", bg: "bg-[#F5FFF7]", border: "border-[#C3E6CB]" },
                  { phase: "🔴 Work", duration: "25 min", bg: "bg-[#FFF5F5]", border: "border-[#FFCCCC]" },
                  { phase: "🌿 Long Break", duration: "15–30 min", bg: "bg-[#F0FFF4]", border: "border-[#A8D5B5]" },
                ].map((row, i) => (
                  <div key={i} className={`flex items-center justify-between px-4 py-2.5 ${row.bg} border-b ${row.border} last:border-0`}>
                    <span className="font-semibold text-[#3D2C2C]">{row.phase}</span>
                    <span className="font-mono text-[#8B7355] font-bold">{row.duration}</span>
                  </div>
                ))}
              </div>

              {/* Stat cards */}
              <div className="flex gap-3 flex-wrap sm:flex-nowrap">
                <StatCard value="25 min" label="Work session" />
                <StatCard value="5 min" label="Short break" />
                <StatCard value="15–30 min" label="Long break" />
                <StatCard value="×4" label="Sessions before long break" />
              </div>

              <Callout emoji="⚙️">
                These are the classic defaults — but they are not rules. Many people use 50-minute work sessions with 10-minute breaks. Experiment and find what works for you.
              </Callout>
            </Section>

            <Divider />

            {/* The science */}
            <Section id="the-science" emoji="🧠" title="The Science">
              <p>
                The Pomodoro Technique works for a few concrete psychological reasons:
              </p>
              <ul className="space-y-3 text-sm pl-1">
                {([
                  [
                    "Time-boxing reduces overwhelm",
                    "A task that feels huge becomes manageable when you only need to work on it for 25 minutes. You are not committing to finishing — just to starting.",
                  ],
                  [
                    "Parkinson's Law in reverse",
                    "Work expands to fill the time available. A tight timer compresses it. Deadlines — even artificial ones — create urgency and sharpen focus.",
                  ],
                  [
                    "Forced breaks prevent burnout",
                    "The brain is not built for sustained attention. Breaks are not wasted time — they consolidate learning and restore mental energy.",
                  ],
                  [
                    "Single-tasking improves output quality",
                    "Every time you switch tasks, your brain incurs a 'switching cost'. Blocking out one task for 25 minutes eliminates that overhead.",
                  ],
                  [
                    "Completion streaks build momentum",
                    "Finishing a Pomodoro gives you a small win. Small wins compound into motivation. The technique is designed to make progress visible.",
                  ],
                ] as [string, string][]).map(([title, desc]) => (
                  <li key={title} className="flex gap-3">
                    <span className="text-[#E54B4B] font-bold flex-shrink-0 mt-0.5">—</span>
                    <span>
                      <strong className="text-[#3D2C2C]">{title}</strong>
                      {" — "}
                      {desc}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>

            <Divider />

            {/* Common mistakes */}
            <Section id="common-mistakes" emoji="❌" title="Common Mistakes">
              <p>
                The technique is simple — but easy to do wrong. Here are the mistakes most people make when starting out:
              </p>
              <ul className="space-y-3 text-sm pl-1">
                {[
                  [
                    "Skipping the break",
                    "The break is the point. Your brain needs it to consolidate what you just worked on. Skipping it defeats the purpose.",
                  ],
                  [
                    "Multitasking during the session",
                    "Checking messages, switching tabs, or doing \"just one quick thing\" breaks the session. It no longer counts. Reset and try again.",
                  ],
                  [
                    "Starting without a task in mind",
                    "If you sit down and figure out what to work on after the timer starts, you have already wasted part of your Pomodoro. Decide first, then start.",
                  ],
                  [
                    "Treating it as a rigid rule",
                    "If you are in deep flow at the 25-minute mark, it is fine to keep going. The timer is a tool, not a boss.",
                  ],
                  [
                    "Going too long without customising",
                    "25 minutes is the classic default — not a universal law. If it feels too short or too long, adjust it until it fits your work style.",
                  ],
                ].map(([title, desc]) => (
                  <li key={title} className="flex gap-3">
                    <span className="text-[#E54B4B] font-bold flex-shrink-0 mt-0.5">✗</span>
                    <span>
                      <strong className="text-[#3D2C2C]">{title}</strong> — {desc}
                    </span>
                  </li>
                ))}
              </ul>

              <Callout emoji="✅">
                The best Pomodoro is the one you actually complete. Start small — even one 25-minute session a day builds the habit.
              </Callout>
            </Section>

            <Divider />

            {/* Get Started */}
            <Section id="get-started" emoji="🚀" title="Get Started">
              <p>
                You do not need any special equipment. Any timer works. But if you want a dedicated Pomodoro timer with friends, analytics, and achievements built in — you are already in the right place.
              </p>
              <p>
                <strong className="text-[#3D2C2C]">PomoPals</strong> runs a full Pomodoro cycle — work, short break, long break — and tracks every session automatically. You can work solo or invite friends to a shared room where everyone&apos;s timer stays in sync.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <Link
                  href="/"
                  className="px-5 py-2.5 bg-[#E54B4B] text-white rounded-full font-bold text-sm hover:bg-[#D43D3D] transition-colors shadow-sm text-center"
                >
                  Start your first Pomodoro →
                </Link>
                <Link
                  href="/guide"
                  className="px-5 py-2.5 bg-white border-2 border-[#F0E6D3] text-[#5C4033] rounded-full font-bold text-sm hover:border-[#E54B4B]/30 hover:bg-[#FFF8F0] transition-all text-center"
                >
                  Read the Quick Start Guide
                </Link>
              </div>
            </Section>

          </div>
        </div>

        {/* Bottom nav */}
        <div className="flex justify-center mt-10 mb-4">
          <Link
            href="/library"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#E54B4B] text-white rounded-full font-bold text-sm hover:bg-[#D43D3D] transition-colors shadow-sm"
          >
            <span className="text-base leading-none">📚</span>
            Browse More Books
          </Link>
        </div>

        <RelatedArticles currentSlug="what-is-a-pomodoro" />
      </div>
    </main>
  );
}
