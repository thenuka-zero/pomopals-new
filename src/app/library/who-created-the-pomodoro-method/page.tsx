import Link from "next/link";

export const metadata = {
  title: "Who Created the Pomodoro Method? | Pom's Library",
  description:
    "The story of Francesco Cirillo — the university student who picked up a tomato-shaped kitchen timer and accidentally invented one of the most popular productivity methods in the world.",
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

const TOC_ITEMS = [
  { id: "the-creator", emoji: "👤", label: "The Creator" },
  { id: "the-origin-story", emoji: "🍅", label: "The Origin Story" },
  { id: "the-technique-takes-shape", emoji: "⚙️", label: "Taking Shape" },
  { id: "spreading-globally", emoji: "🌍", label: "Going Global" },
  { id: "the-name", emoji: "🏷️", label: "Why \"Pomodoro\"?" },
  { id: "legacy", emoji: "🏆", label: "Legacy & Impact" },
  { id: "get-started", emoji: "🚀", label: "Try It Yourself" },
];

export default function WhoCreatedThePomodoro() {
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
        <div className="relative mt-6 rounded-2xl overflow-hidden shadow-lg bg-[#8B5E3C]">
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
              <span className="leading-none select-none text-[clamp(4rem,8vw,5.5rem)]">🕰️</span>
            </div>
            <div className="text-center sm:text-left flex-1 min-w-0">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-3 bg-[#5C4033] text-[#FDF6EC]">
                History
              </span>
              <h1 className="text-3xl md:text-5xl font-extrabold leading-tight tracking-tight text-[#FDF6EC]">
                Who Created the Pomodoro Method?
              </h1>
              <p className="mt-3 text-base font-semibold text-[#FDF6EC]/80">
                by Pom <span role="img" aria-label="tomato">🍅</span>
              </p>
              <p className="mt-4 text-sm sm:text-base leading-relaxed max-w-prose text-[#FDF6EC]/75">
                The story of Francesco Cirillo — the university student who picked up a tomato-shaped kitchen timer and accidentally invented one of the most popular productivity methods in the world.
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

            {/* The Creator */}
            <Section id="the-creator" emoji="👤" title="The Creator">
              <p>
                The Pomodoro Technique was invented by <strong className="text-[#3D2C2C]">Francesco Cirillo</strong>, an Italian developer, entrepreneur, and author. Born in Italy in 1969, Cirillo created the technique in the late 1980s while struggling to focus during his university studies in Rome.
              </p>
              <p>
                He went on to found his own consulting firm, teach the technique to thousands of students and professionals, and publish a book formalising the method. Today, the Pomodoro Technique is practised by millions of people worldwide — yet it all traces back to one overwhelmed student and one kitchen timer.
              </p>

              {/* Quick-fact card */}
              <div className="bg-[#FDF6EC] border border-[#F0E6D3] rounded-xl p-4">
                <p className="text-xs font-extrabold text-[#A08060] uppercase tracking-widest mb-3">Quick Facts</p>
                <div className="space-y-2 text-sm">
                  {[
                    ["Name", "Francesco Cirillo"],
                    ["Born", "1969, Italy"],
                    ["Education", "Luiss University, Rome"],
                    ["Technique created", "Late 1980s"],
                    ["Book published", "~1992 (formal write-up); 2006 (wider release)"],
                    ["Profession", "Developer, consultant, author"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex gap-3">
                      <span className="font-bold text-[#3D2C2C] w-36 flex-shrink-0">{label}</span>
                      <span className="text-[#5C4033]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            <Divider />

            {/* The Origin Story */}
            <Section id="the-origin-story" emoji="🍅" title="The Origin Story">
              <p>
                It was the late 1980s in Rome. Cirillo was a university student at Luiss, struggling with a problem that every student recognises: he could not make himself study. There were too many distractions, too many worries about whether his effort was even going anywhere. The work felt endless and purposeless.
              </p>
              <p>
                One afternoon, he made a deal with himself. He would study — really study — for just ten minutes. Not tomorrow, not after checking one more thing. Right now. Ten minutes.
              </p>
              <p>
                He reached across his desk and picked up the kitchen timer that happened to be there. It was shaped like a tomato. In Italian: <em>pomodoro</em>.
              </p>
              <p>
                He set it for ten minutes and began.
              </p>
              <Callout emoji="💡">
                The name of the entire technique — used by millions of people today — comes from that specific timer. Not from a research paper or a productivity philosophy. From a tomato-shaped kitchen gadget sitting on a student&apos;s desk in Rome.
              </Callout>
            </Section>

            <Divider />

            {/* Taking Shape */}
            <Section id="the-technique-takes-shape" emoji="⚙️" title="Taking Shape">
              <p>
                After that first session, Cirillo kept experimenting. Ten minutes became 25. He discovered that 25 minutes was enough time to make meaningful progress on a task, but short enough that the end was always in sight — which made starting much easier.
              </p>
              <p>
                He added structured breaks: five minutes after each session, a longer break after every four. He noticed that these breaks were not wasted time — they helped him retain what he had studied and come back to the work with renewed focus.
              </p>
              <p>
                Over the following years, he refined the approach. He started tracking how many sessions he completed each day, which revealed patterns in his own productivity he had never noticed. He developed rules for handling interruptions. He wrote everything down.
              </p>

              <div className="rounded-xl border border-[#F0E6D3] overflow-hidden text-sm">
                <div className="bg-[#FDF6EC] px-4 py-2.5 border-b border-[#F0E6D3]">
                  <p className="font-extrabold text-[#3D2C2C]">The Technique Cirillo Settled On</p>
                </div>
                {[
                  ["1️⃣", "Choose one task"],
                  ["2️⃣", "Set a timer for 25 minutes"],
                  ["3️⃣", "Work without interruption until it rings"],
                  ["4️⃣", "Take a 5-minute break"],
                  ["5️⃣", "Every 4 sessions, take a longer 15–30 minute break"],
                ].map(([num, step]) => (
                  <div key={num} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#F0E6D3] last:border-0 bg-white">
                    <span className="flex-shrink-0">{num}</span>
                    <span className="text-[#5C4033]">{step}</span>
                  </div>
                ))}
              </div>

              <Callout emoji="🔬">
                Cirillo was not following productivity research when he designed this — he was running personal experiments. The 25-minute interval was arrived at empirically: it worked for him, and later he found it worked for others too. Subsequent research on attention and cognitive load broadly confirmed what he discovered by trial and error.
              </Callout>
            </Section>

            <Divider />

            {/* Going Global */}
            <Section id="spreading-globally" emoji="🌍" title="Going Global">
              <p>
                For years, the Pomodoro Technique was a personal system. Cirillo shared it with classmates, then with colleagues, then with clients at the software consultancy he founded.
              </p>
              <p>
                In <strong className="text-[#3D2C2C]">1992</strong>, he wrote the first formal description of the technique as a document. It circulated quietly, mostly in Italian software and tech communities, where it found an audience among developers looking for structured ways to handle complex, deep-focus work.
              </p>
              <p>
                The wider breakthrough came in the <strong className="text-[#3D2C2C]">mid-2000s</strong>. The rise of blogs, productivity communities, and the GTD (Getting Things Done) movement created a culture hungry for new ways to work. The Pomodoro Technique — simple, free, and immediately actionable — spread rapidly.
              </p>
              <p>
                In <strong className="text-[#3D2C2C]">2006</strong>, Cirillo made the technique available as a free e-book and later as a published book. It was translated into multiple languages and became required reading in productivity circles. Apps, websites, and browser extensions built around the Pomodoro Technique multiplied. By the 2010s, it had become one of the most widely recommended focus methods in the world.
              </p>

              {/* Timeline */}
              <div className="bg-[#FDF6EC] border border-[#F0E6D3] rounded-xl p-4 text-sm text-[#5C4033]">
                <p className="font-extrabold text-[#3D2C2C] mb-3">Timeline</p>
                <div className="space-y-3">
                  {[
                    ["Late 1980s", "Cirillo invents the technique as a student at Luiss University, Rome"],
                    ["1992", "First formal written description circulates in Italian tech communities"],
                    ["Early 2000s", "Word spreads through productivity blogs and developer communities"],
                    ["2006", "Technique published as a book; translated internationally"],
                    ["2010s", "Adopted by millions globally; hundreds of apps built on the method"],
                    ["Today", "One of the most-practised productivity techniques in the world"],
                  ].map(([year, event]) => (
                    <div key={year} className="flex gap-3">
                      <span className="font-bold text-[#E54B4B] flex-shrink-0 w-28">{year}</span>
                      <span>{event}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            <Divider />

            {/* Why "Pomodoro"? */}
            <Section id="the-name" emoji="🏷️" title="Why &ldquo;Pomodoro&rdquo;?">
              <p>
                <em>Pomodoro</em> is simply the Italian word for <strong className="text-[#3D2C2C]">tomato</strong>. The technique was named after the specific kitchen timer Cirillo used in that original session — a small, wind-up timer shaped like a tomato.
              </p>
              <p>
                These tomato timers were (and still are) a common sight in Italian kitchens. They were cheap, tactile, and required no batteries. When Cirillo wound it up, it produced a gentle ticking sound while counting down — and a satisfying ring when it reached zero.
              </p>
              <p>
                That ring became the defining sound of the technique. The act of physically winding the timer was also meaningful: it was a small, deliberate gesture that signalled the start of focused work. You could not accidentally start a Pomodoro. You had to choose it.
              </p>
              <Callout emoji="🍅">
                You do not need a tomato-shaped timer to practice the Pomodoro Technique. Any timer will do — your phone, a browser tab, or a dedicated app. What matters is the 25 minutes, not the shape of the clock.
              </Callout>
            </Section>

            <Divider />

            {/* Legacy */}
            <Section id="legacy" emoji="🏆" title="Legacy &amp; Impact">
              <p>
                Francesco Cirillo created a technique that millions of people use every day — students, developers, writers, researchers, designers, and professionals of every kind. What started as one student&apos;s experiment with focus has become a global standard for structured, intentional work.
              </p>
              <p>
                What makes his contribution remarkable is not the complexity of the idea — the Pomodoro Technique is deliberately, defiantly simple. Its power comes from the insight that the hardest part of work is starting, and that a finite countdown makes starting much easier than an open-ended stretch of time.
              </p>
              <ul className="space-y-2 text-sm pl-1">
                {[
                  "Used by millions of people in over 100 countries",
                  "One of the most-cited methods in productivity and time-management writing",
                  "The foundation of hundreds of dedicated apps and tools",
                  "Taught in universities, bootcamps, and corporate training programmes worldwide",
                  "Still advocated and taught by Cirillo himself through workshops and his consultancy",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-[#E54B4B] font-bold flex-shrink-0">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Callout emoji="📖">
                Cirillo&apos;s book, <em>The Pomodoro Technique</em>, is still in print and available in multiple languages. If you want to go deeper into the system as he originally designed it, it is a short and worthwhile read.
              </Callout>
            </Section>

            <Divider />

            {/* Get Started */}
            <Section id="get-started" emoji="🚀" title="Try It Yourself">
              <p>
                The best way to understand why the Pomodoro Technique works is to do one. Set a 25-minute timer, pick one task, and work on nothing else until it rings. That simple act is all Francesco Cirillo needed to change how he worked — and it might change how you work too.
              </p>
              <p>
                <strong className="text-[#3D2C2C]">PomoPals</strong> is a free Pomodoro timer that runs the full work–break–long break cycle automatically. You can use it solo or invite friends to a shared room where everyone&apos;s timer stays in sync.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <Link
                  href="/"
                  className="px-5 py-2.5 bg-[#E54B4B] text-white rounded-full font-bold text-sm hover:bg-[#D43D3D] transition-colors shadow-sm text-center"
                >
                  Start your first Pomodoro →
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
