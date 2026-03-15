import Link from "next/link";
import RelatedArticles from "@/components/RelatedArticles";

export const metadata = {
  title: "What are the best books on Pomodoros? | Pom's Library",
  description:
    "A reading list for anyone who wants to go deeper on focus, time management, and the Pomodoro philosophy.",
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

function BookEntry({
  title,
  author,
  year,
  tag,
  children,
}: {
  emoji?: string;
  title: string;
  author: string;
  year: string;
  tag: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#F0E6D3] overflow-hidden">
      <div className="flex items-center gap-3 bg-[#FDF6EC] px-4 py-3 border-b border-[#F0E6D3]">
        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-[#3D2C2C] leading-snug">{title}</p>
          <p className="text-xs text-[#8B7355]">{author} · {year}</p>
        </div>
        <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#6EAE3E]/15 text-[#3D5C1A]">
          {tag}
        </span>
      </div>
      <div className="px-4 py-4 text-sm text-[#5C4033] leading-relaxed space-y-2 bg-white">
        {children}
      </div>
    </div>
  );
}

const TOC_ITEMS = [
  { id: "how-to-use", emoji: "🗺️", label: "How to Use This List" },
  { id: "the-pomodoro-technique", emoji: "🍅", label: "The Pomodoro Technique" },
  { id: "deep-work", emoji: "🧠", label: "Deep Work" },
  { id: "atomic-habits", emoji: "⚛️", label: "Atomic Habits" },
  { id: "getting-things-done", emoji: "✅", label: "Getting Things Done" },
  { id: "rest", emoji: "🌿", label: "Rest" },
  { id: "start-here", emoji: "🚀", label: "Where to Start" },
];

export default function BestBooksOnPomodoros() {
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
        <div className="relative mt-6 rounded-2xl overflow-hidden shadow-lg bg-[#6EAE3E]">
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
              <span className="leading-none select-none text-[clamp(4rem,8vw,5.5rem)]">📚</span>
            </div>
            <div className="text-center sm:text-left flex-1 min-w-0">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-3 bg-[#3D5C1A] text-[#FDF6EC]">
                Productivity
              </span>
              <h1 className="text-3xl md:text-5xl font-extrabold leading-tight tracking-tight text-[#FDF6EC]">
                What are the best books on Pomodoros?
              </h1>
              <p className="mt-3 text-base font-semibold text-[#FDF6EC]/80">
                by Pom <span role="img" aria-label="tomato">🍅</span>
              </p>
              <p className="mt-4 text-sm sm:text-base leading-relaxed max-w-prose text-[#FDF6EC]/75">
                A reading list for anyone who wants to go deeper on focus, time management, and the Pomodoro philosophy.
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

            {/* Quick picks */}
            <div className="mt-4 bg-[#F0FFF4] border-2 border-[#C3E6CB] rounded-2xl p-4">
              <p className="text-xs font-extrabold text-[#3D5C1A] uppercase tracking-widest mb-3">
                Quick Picks
              </p>
              <div className="space-y-2 text-xs text-[#5C4033]">
                <p><strong className="text-[#3D2C2C]">Brand new to Pomodoro?</strong><br />Start with <em>The Pomodoro Technique</em></p>
                <p><strong className="text-[#3D2C2C]">Want to go deep on focus?</strong><br />Read <em>Deep Work</em></p>
                <p><strong className="text-[#3D2C2C]">Struggling to build the habit?</strong><br />Try <em>Atomic Habits</em></p>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 bg-white border-2 border-[#F0E6D3] rounded-2xl p-6 sm:p-8 space-y-8">

            {/* How to Use */}
            <Section id="how-to-use" emoji="🗺️" title="How to Use This List">
              <p>
                There is no single book called &ldquo;The Complete Guide to Pomodoros.&rdquo; The technique itself is simple enough to explain in a paragraph — so the most useful reading goes deeper: into the science of attention, the psychology of habits, and the broader philosophy of intentional work.
              </p>
              <p>
                The books below are grouped roughly from most directly relevant to most complementary. You do not need to read all of them — each one stands alone. But if you read even two or three, you will have a fundamentally different relationship with your focused work sessions.
              </p>
              <Callout emoji="📖">
                You do not need to finish any of these before your next Pomodoro. Read one chapter, then go do 25 minutes of real work. The best productivity books are best absorbed in small doses — between sessions, not instead of them.
              </Callout>
            </Section>

            <Divider />

            {/* Book 1 */}
            <Section id="the-pomodoro-technique" emoji="🍅" title="The Pomodoro Technique">
              <BookEntry
                emoji="🍅"
                title="The Pomodoro Technique"
                author="Francesco Cirillo"
                year="2006 / updated 2018"
                tag="Essential"
              >
                <p>
                  This is the book by the inventor of the technique himself, and it is the obvious starting point. Cirillo explains not just the mechanics of the method but the philosophy behind it — the idea of time as an ally rather than a tyrant, and the importance of tracking your own work to discover patterns you cannot otherwise see.
                </p>
                <p>
                  It is a short, direct read. Cirillo writes plainly and practically, without padding or self-promotion. By the end you will understand why the technique works the way it does — not just what to do, but why each element matters.
                </p>
                <p>
                  <strong className="text-[#3D2C2C]">Best for:</strong> Anyone starting out, or anyone who has been using the technique informally and wants to understand it more deeply.
                </p>
              </BookEntry>
            </Section>

            <Divider />

            {/* Book 2 */}
            <Section id="deep-work" emoji="🧠" title="Deep Work">
              <BookEntry
                emoji="🧠"
                title="Deep Work: Rules for Focused Success in a Distracted World"
                author="Cal Newport"
                year="2016"
                tag="Highly Recommended"
              >
                <p>
                  Newport argues that the ability to focus without distraction on a cognitively demanding task — what he calls &ldquo;deep work&rdquo; — is both increasingly rare and increasingly valuable. The book makes the case that this skill can be deliberately built, and that the people who build it will have a significant advantage in almost any knowledge-work profession.
                </p>
                <p>
                  After reading Deep Work, the 25-minute Pomodoro interval stops feeling like a productivity trick and starts feeling like a serious response to a serious problem: the way modern work is structured tends to destroy the conditions necessary for doing anything that actually matters.
                </p>
                <p>
                  <strong className="text-[#3D2C2C]">Best for:</strong> Anyone who wants the intellectual case for why focused work matters — and a framework for protecting it.
                </p>
              </BookEntry>
              <Callout emoji="💡">
                Newport does not mention the Pomodoro Technique by name, but his entire argument is essentially a philosophical endorsement of it. The two fit together naturally: Deep Work supplies the &ldquo;why,&rdquo; Pomodoro supplies the &ldquo;how.&rdquo;
              </Callout>
            </Section>

            <Divider />

            {/* Book 3 */}
            <Section id="atomic-habits" emoji="⚛️" title="Atomic Habits">
              <BookEntry
                emoji="⚛️"
                title="Atomic Habits"
                author="James Clear"
                year="2018"
                tag="Highly Recommended"
              >
                <p>
                  Atomic Habits is not about the Pomodoro Technique — it is about how habits form and stick. But it is one of the most useful books you can read if you are trying to build a consistent Pomodoro practice, because Clear&apos;s central insight applies directly: habits are built by making good behaviours easy and bad behaviours hard.
                </p>
                <p>
                  His framework of <em>identity-based habits</em> is particularly useful here. Rather than trying to &ldquo;use the Pomodoro Technique more,&rdquo; you work on becoming the kind of person who works in focused intervals. That shift in framing — from behaviour to identity — makes consistency significantly more likely.
                </p>
                <p>
                  <strong className="text-[#3D2C2C]">Best for:</strong> Anyone who keeps starting the Pomodoro Technique and then drifting away from it. Clear&apos;s four laws of behaviour change are directly applicable.
                </p>
              </BookEntry>
            </Section>

            <Divider />

            {/* Book 4 */}
            <Section id="getting-things-done" emoji="✅" title="Getting Things Done">
              <BookEntry
                emoji="✅"
                title="Getting Things Done"
                author="David Allen"
                year="2001 / updated 2015"
                tag="Pairs Well"
              >
                <p>
                  GTD is a system for capturing every commitment, task, and idea into a trusted external system — so that your mind is free to focus fully on whatever is in front of you right now. That last part is what makes it relevant here.
                </p>
                <p>
                  The Pomodoro Technique is an execution tool: it tells you how to work on a task. GTD is a planning tool: it tells you which task to work on next. Together, the two systems cover the full cycle. Once you know what to do (GTD), the Pomodoro tells you how to do it without getting pulled away.
                </p>
                <p>
                  Many practitioners use both in combination as the backbone of their entire working approach. GTD for the macro, Pomodoro for the micro.
                </p>
                <p>
                  <strong className="text-[#3D2C2C]">Best for:</strong> Anyone whose problem is not focus itself but figuring out what to focus on. If you sit down to a Pomodoro and spend the first five minutes deciding what to work on, GTD is your fix.
                </p>
              </BookEntry>
            </Section>

            <Divider />

            {/* Book 5 */}
            <Section id="rest" emoji="🌿" title="Rest">
              <BookEntry
                emoji="🌿"
                title="Rest: Why You Get More Done When You Work Less"
                author="Alex Soojung-Kim Pang"
                year="2016"
                tag="Underrated"
              >
                <p>
                  Rest is a quietly brilliant book that examines how history&apos;s most productive people actually spent their time — and discovers that almost all of them worked far fewer hours than we might expect, compensated by an almost religious commitment to rest and recovery.
                </p>
                <p>
                  It validates, from a historical and scientific angle, what the Pomodoro Technique assumes: that breaks are not interruptions to work, they are <em>part</em> of the work. During rest, the brain consolidates learning, makes creative connections, and repairs the mental resources depleted by effort.
                </p>
                <p>
                  After reading Rest, you will take your five-minute breaks far more seriously — not as guilty pauses, but as necessary components of the productive cycle.
                </p>
                <p>
                  <strong className="text-[#3D2C2C]">Best for:</strong> Anyone who feels guilty taking breaks, or who habitually skips them to push through. This book will change your mind.
                </p>
              </BookEntry>
              <Callout emoji="🌿">
                The most actionable insight from Rest: a walk — even a short indoor one — produces significantly more creative thinking than sitting at a desk. Your Pomodoro break is the perfect time for one.
              </Callout>
            </Section>

            <Divider />

            {/* Where to Start */}
            <Section id="start-here" emoji="🚀" title="Where to Start">
              <p>
                If you are new to all of this, start with <em>The Pomodoro Technique</em> by Cirillo — it is short and immediately actionable. Then read <em>Deep Work</em> to understand why protecting focused time matters more than ever.
              </p>
              <p>
                If you already use the Pomodoro Technique but find yourself drifting, <em>Atomic Habits</em> will help you make the practice stick. If you know how to focus but not what to focus on, <em>Getting Things Done</em> is your answer. And if you skip breaks, read <em>Rest</em>.
              </p>

              <div className="rounded-xl border border-[#F0E6D3] overflow-hidden text-sm">
                <div className="bg-[#FDF6EC] px-4 py-2.5 border-b border-[#F0E6D3]">
                  <p className="font-extrabold text-[#3D2C2C]">Reading Order by Problem</p>
                </div>
                {[
                  ["Just getting started", "The Pomodoro Technique → Deep Work"],
                  ["Can't make it stick", "Atomic Habits → The Pomodoro Technique"],
                  ["Don't know what to work on", "Getting Things Done → Deep Work"],
                  ["Always skipping breaks", "Rest → The Pomodoro Technique"],
                  ["Want the full system", "GTD + Deep Work + Atomic Habits"],
                ].map(([problem, reading]) => (
                  <div key={problem} className="flex items-start gap-3 px-4 py-2.5 border-b border-[#F0E6D3] last:border-0 bg-white">
                    <span className="text-[#8B7355] flex-shrink-0 w-44">{problem}</span>
                    <span className="font-semibold text-[#3D2C2C]">{reading}</span>
                  </div>
                ))}
              </div>

              <p>
                But before any of that — do one Pomodoro right now. The best productivity book in the world is less useful than 25 minutes of focused work.
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

        <RelatedArticles currentSlug="best-books-on-pomodoros" />
      </div>
    </main>
  );
}
