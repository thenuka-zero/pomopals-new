import Link from "next/link";

export const metadata = {
  title: "Why are Pomodoros 25 minutes? | Pom's Library",
  description:
    "The science and story behind the iconic 25-minute interval — why not 20, not 30, but exactly 25?",
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
    <div className="flex-1 min-w-0 bg-[#EEF4FF] border border-[#C7D9F8] rounded-xl p-4 text-center">
      <p className="text-2xl font-extrabold text-[#5B8CE5]">{value}</p>
      <p className="text-xs font-semibold text-[#8B7355] mt-1 leading-tight">{label}</p>
    </div>
  );
}

const TOC_ITEMS = [
  { id: "the-question", emoji: "❓", label: "The Question" },
  { id: "how-cirillo-found-25", emoji: "🔬", label: "How Cirillo Found 25" },
  { id: "attention-science", emoji: "🧠", label: "The Attention Science" },
  { id: "why-not-20-or-30", emoji: "⚖️", label: "Why Not 20 or 30?" },
  { id: "the-rhythm", emoji: "🎵", label: "The Rhythm It Creates" },
  { id: "can-you-change-it", emoji: "🔧", label: "Can You Change It?" },
  { id: "get-started", emoji: "🚀", label: "Try It" },
];

export default function WhyArePomodoros25Minutes() {
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
        <div className="relative mt-6 rounded-2xl overflow-hidden shadow-lg bg-[#5B8CE5]">
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
              <span className="leading-none select-none text-[clamp(4rem,8vw,5.5rem)]">⏱️</span>
            </div>
            <div className="text-center sm:text-left flex-1 min-w-0">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-3 bg-[#3D5C9E] text-[#FDF6EC]">
                Productivity
              </span>
              <h1 className="text-3xl md:text-5xl font-extrabold leading-tight tracking-tight text-[#FDF6EC]">
                Why are Pomodoros 25 minutes?
              </h1>
              <p className="mt-3 text-base font-semibold text-[#FDF6EC]/80">
                by Pom <span role="img" aria-label="tomato">🍅</span>
              </p>
              <p className="mt-4 text-sm sm:text-base leading-relaxed max-w-prose text-[#FDF6EC]/75">
                The science and story behind the iconic 25-minute interval — why not 20, not 30, but exactly 25?
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

            {/* The Question */}
            <Section id="the-question" emoji="❓" title="The Question">
              <p>
                Twenty-five minutes is such a specific number. Not a round 20, not a tidy 30 — exactly 25. If you have ever used the Pomodoro Technique, you have probably wondered whether there is some elegant science behind it. A neuroscience paper. A definitive study on human attention spans. A precise measurement of cognitive peak performance.
              </p>
              <p>
                The answer is more honest than that — and in a way, more useful. Francesco Cirillo did not derive 25 minutes from a research lab. He found it the same way most good ideas are born: by trying things, noticing what happened, and adjusting until something worked.
              </p>
              <Callout emoji="💡">
                The 25-minute interval is not a scientific law. It is the sweet spot one person found through trial and error — and that millions of people have since confirmed for themselves.
              </Callout>
            </Section>

            <Divider />

            {/* How Cirillo Found 25 */}
            <Section id="how-cirillo-found-25" emoji="🔬" title="How Cirillo Found 25">
              <p>
                In the late 1980s, Cirillo was a university student in Rome trying to solve a focus problem. He began by making a simple deal with himself: just ten minutes of real, uninterrupted work. He grabbed a tomato-shaped kitchen timer, wound it to ten minutes, and started.
              </p>
              <p>
                It worked. So he kept experimenting. He tried fifteen minutes, twenty, thirty, forty-five. He paid close attention to how his concentration felt at each length — not just whether he got work done, but whether he could sustain quality attention through the full interval, and whether he still had energy left when the break arrived.
              </p>
              <p>
                Twenty-five minutes was where the sweet spot lived. Long enough to sink into a task and produce something meaningful. Short enough that the end was always visible from the start — which made committing to the session feel manageable rather than daunting.
              </p>

              <div className="rounded-xl border border-[#F0E6D3] overflow-hidden text-sm">
                <div className="bg-[#FDF6EC] px-4 py-2.5 border-b border-[#F0E6D3]">
                  <p className="font-extrabold text-[#3D2C2C]">Cirillo&apos;s Interval Experiments</p>
                </div>
                {[
                  ["10 min", "Too short — barely enough time to get into the work before it ended"],
                  ["15 min", "Better — but still left the session feeling incomplete"],
                  ["25 min", "✓ The sweet spot — meaningful progress, always visible end"],
                  ["30–45 min", "Often felt long; energy started flagging before the break"],
                ].map(([interval, note]) => (
                  <div key={interval} className="flex items-start gap-3 px-4 py-2.5 border-b border-[#F0E6D3] last:border-0 bg-white">
                    <span className="font-bold text-[#5B8CE5] flex-shrink-0 w-16">{interval}</span>
                    <span className="text-[#5C4033]">{note}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Divider />

            {/* The Attention Science */}
            <Section id="attention-science" emoji="🧠" title="The Attention Science">
              <p>
                Cirillo found 25 minutes through personal experimentation — but it turns out the research broadly agrees with him. Studies on sustained attention consistently show that concentration tends to peak and then decline over roughly <strong className="text-[#3D2C2C]">20 to 45 minutes</strong> of continuous, cognitively demanding effort.
              </p>
              <p>
                After that window, errors increase, processing slows, and the mental effort required to stay on task rises steeply. Working in 25-minute blocks keeps you operating near the front end of that curve — where your attention is sharpest and your output is most reliable.
              </p>

              <ul className="space-y-3 text-sm pl-1">
                {([
                  [
                    "Attention is not constant",
                    "Focus naturally rises and falls in cycles. The Pomodoro interval is designed to work with those cycles, not against them.",
                  ],
                  [
                    "The brain consolidates during rest",
                    "During breaks, the hippocampus processes what you just learned. The rest is not wasted time — it is where retention happens.",
                  ],
                  [
                    "Shorter sessions mean more resets",
                    "Each new Pomodoro starts with fresh attention. Dividing work into 25-minute chunks gives you multiple fresh starts rather than one long slow decline.",
                  ],
                  [
                    "Breaks prevent decision fatigue",
                    "The longer you work without a break, the worse your judgment becomes. Structured rest keeps the quality of your decisions higher across the day.",
                  ],
                ] as [string, string][]).map(([title, desc]) => (
                  <li key={title} className="flex gap-3">
                    <span className="text-[#5B8CE5] font-bold flex-shrink-0 mt-0.5">—</span>
                    <span>
                      <strong className="text-[#3D2C2C]">{title}</strong>
                      {" — "}
                      {desc}
                    </span>
                  </li>
                ))}
              </ul>

              <Callout emoji="🧠">
                The mandatory 5-minute break is not a reward for finishing the Pomodoro. It is part of the cognitive process. Skipping it is a bit like sprinting without breathing — technically possible for a bit, but it catches up with you.
              </Callout>
            </Section>

            <Divider />

            {/* Why Not 20 or 30? */}
            <Section id="why-not-20-or-30" emoji="⚖️" title="Why Not 20 or 30?">
              <p>
                This is the practical heart of the question. Both 20 and 30 minutes are reasonable intervals — and many people do use them. Here is how they compare:
              </p>

              <div className="rounded-xl border border-[#F0E6D3] overflow-hidden text-sm">
                <div className="grid grid-cols-3 bg-[#FDF6EC] border-b border-[#F0E6D3] text-xs font-extrabold text-[#A08060] uppercase tracking-wider">
                  <div className="px-4 py-2.5">Interval</div>
                  <div className="px-4 py-2.5">Strengths</div>
                  <div className="px-4 py-2.5">Weaknesses</div>
                </div>
                {[
                  [
                    "20 min",
                    "Very easy to start; low activation energy",
                    "Often ends before you reach deep focus",
                  ],
                  [
                    "25 min ✓",
                    "Enough depth to be meaningful; end always visible",
                    "Might feel slightly arbitrary at first",
                  ],
                  [
                    "30 min",
                    "More time in flow once you get there",
                    "Harder to commit to; energy starts dropping near the end",
                  ],
                ].map(([interval, strength, weakness]) => (
                  <div key={interval} className="grid grid-cols-3 border-b border-[#F0E6D3] last:border-0 bg-white">
                    <div className="px-4 py-2.5 font-bold text-[#3D2C2C]">{interval}</div>
                    <div className="px-4 py-2.5 text-[#5C4033]">{strength}</div>
                    <div className="px-4 py-2.5 text-[#5C4033]">{weakness}</div>
                  </div>
                ))}
              </div>

              <p>
                Twenty-five minutes is also a convenient unit of time. Four Pomodoros fit neatly into roughly two hours (including breaks). That makes planning a working day straightforward — you can think in terms of how many Pomodoros a task needs, and schedule accordingly.
              </p>

              <div className="flex gap-3 flex-wrap sm:flex-nowrap">
                <StatCard value="25 min" label="Work session" />
                <StatCard value="5 min" label="Short break" />
                <StatCard value="~2 hrs" label="4 Pomodoros + breaks" />
                <StatCard value="6–8" label="Typical productive day" />
              </div>
            </Section>

            <Divider />

            {/* The Rhythm It Creates */}
            <Section id="the-rhythm" emoji="🎵" title="The Rhythm It Creates">
              <p>
                Beyond the individual session, the 25-minute interval creates something that longer, unbroken work blocks cannot: a <strong className="text-[#3D2C2C]">sustainable daily rhythm</strong>.
              </p>
              <p>
                Open-ended work sessions — &ldquo;I&apos;ll work on this until it&apos;s done&rdquo; — tend to either drag or exhaust. You either procrastinate because there&apos;s no urgency, or you grind until you are depleted and unable to recover by the next morning. The Pomodoro interval sidesteps both failure modes.
              </p>
              <p>
                Each 25-minute session has a beginning, a middle, and an end. The ring of the timer is a small moment of completion — a clear signal that you did something. That feeling of completion is not trivial. It is the raw material of motivation.
              </p>

              <div className="bg-[#EEF4FF] border border-[#C7D9F8] rounded-xl p-4 text-sm">
                <p className="font-extrabold text-[#3D2C2C] mb-3">A Full Pomodoro Day</p>
                <div className="space-y-1.5">
                  {[
                    ["Morning session", "3–4 Pomodoros on your most important task"],
                    ["Midday", "1–2 Pomodoros on communication, admin, or lighter work"],
                    ["Afternoon", "2–3 Pomodoros on secondary priorities"],
                    ["Total", "6–8 Pomodoros of real focused work"],
                  ].map(([phase, desc]) => (
                    <div key={phase} className="flex gap-3">
                      <span className="font-bold text-[#5B8CE5] flex-shrink-0 w-32">{phase}</span>
                      <span className="text-[#5C4033]">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Callout emoji="🎵">
                Many practitioners describe the rhythm of Pomodoros as almost musical — a steady beat of effort and rest that once found, makes the whole working day feel more like a composed piece than a chaotic struggle.
              </Callout>
            </Section>

            <Divider />

            {/* Can You Change It? */}
            <Section id="can-you-change-it" emoji="🔧" title="Can You Change It?">
              <p>
                Yes — and you should if 25 minutes does not suit your work style.
              </p>
              <p>
                The Pomodoro Technique is a framework, not a contract. Cirillo himself notes that the 25-minute interval is a starting point. The right interval for you is the one you can sustain repeatedly without either running out of steam before the break or wanting to keep going well past it.
              </p>
              <ul className="space-y-3 text-sm pl-1">
                {[
                  [
                    "50/10",
                    "Popular with people doing deep creative or analytical work. The longer session allows more time for flow to develop. The 10-minute break is long enough for a proper reset.",
                  ],
                  [
                    "45/15",
                    "A softer extended session. Good for tasks with a longer warm-up time, like complex writing or design work.",
                  ],
                  [
                    "15/5",
                    "Works well for high-difficulty tasks where 25 minutes still feels overwhelming. Getting started is the priority; shorter wins build momentum.",
                  ],
                  [
                    "25/5 (classic)",
                    "The default for good reason. Try this first before adjusting. Many people who think they need longer sessions discover 25 minutes is exactly right once they remove distractions.",
                  ],
                ].map(([format, desc]) => (
                  <li key={format} className="flex gap-3">
                    <span className="font-bold text-[#5B8CE5] flex-shrink-0 w-12 mt-0.5">{format}</span>
                    <span>{desc}</span>
                  </li>
                ))}
              </ul>
              <Callout emoji="🔧">
                The surest sign you have found your right interval: you feel slightly unsatisfied when the timer rings — still engaged, not depleted. That&apos;s the Goldilocks zone. Adjust until you reliably land there.
              </Callout>
            </Section>

            <Divider />

            {/* Get Started */}
            <Section id="get-started" emoji="🚀" title="Try It">
              <p>
                The best way to understand why 25 minutes works is not to read about it — it is to do one. Right now, if you like. Pick one specific task, set a 25-minute timer, and work on nothing else until it rings. Notice how you feel at the halfway mark, and again when the alarm sounds.
              </p>
              <p>
                <strong className="text-[#3D2C2C]">PomoPals</strong> runs the full Pomodoro cycle automatically — work, short break, long break — and tracks every session so you can see your patterns over time. Use it solo or with friends in a shared room.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <Link
                  href="/"
                  className="px-5 py-2.5 bg-[#E54B4B] text-white rounded-full font-bold text-sm hover:bg-[#D43D3D] transition-colors shadow-sm text-center"
                >
                  Start a 25-minute Pomodoro →
                </Link>
                <Link
                  href="/library/what-is-a-pomodoro"
                  className="px-5 py-2.5 bg-white border-2 border-[#F0E6D3] text-[#5C4033] rounded-full font-bold text-sm hover:border-[#E54B4B]/30 hover:bg-[#FFF8F0] transition-all text-center"
                >
                  What is a Pomodoro? →
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

      </div>
    </main>
  );
}
