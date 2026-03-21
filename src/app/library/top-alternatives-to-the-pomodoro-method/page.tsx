import Link from "next/link";
import RelatedArticles from "@/components/RelatedArticles";

export const metadata = {
  title: "Top Alternatives to The Pomodoro Method | Pom's Library",
  description:
    "The Pomodoro Technique isn't for everyone. Here are the best time management methods to try if 25-minute blocks don't fit your workflow.",
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
    <div className="flex gap-3 bg-[#F5F0FF] border border-[#DDD0F0] rounded-xl px-4 py-3">
      <span className="text-lg leading-none select-none flex-shrink-0 mt-0.5">{emoji}</span>
      <p className="text-sm text-[#5C4033]">{children}</p>
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="flex-1 h-px bg-[#F0E6D3]" />
      <span className="text-lg leading-none select-none opacity-50">💡</span>
      <div className="flex-1 h-px bg-[#F0E6D3]" />
    </div>
  );
}

function MethodCard({
  emoji,
  name,
  bestFor,
  children,
}: {
  emoji: string;
  name: string;
  bestFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-[#DDD0F0] rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 bg-[#F5F0FF] px-4 py-3 border-b border-[#DDD0F0]">
        <span className="text-xl leading-none">{emoji}</span>
        <div>
          <p className="font-extrabold text-[#3D2C2C] text-sm">{name}</p>
          <p className="text-xs text-[#7C5CBF] font-semibold">Best for: {bestFor}</p>
        </div>
      </div>
      <div className="px-4 py-3 text-sm text-[#5C4033] leading-relaxed">{children}</div>
    </div>
  );
}

const TOC_ITEMS = [
  { id: "why-alternatives", emoji: "🤔", label: "Why Look for Alternatives?" },
  { id: "time-blocking", emoji: "📅", label: "Time Blocking" },
  { id: "ultradian", emoji: "🌊", label: "90-Minute Ultradian Rhythm" },
  { id: "gtd", emoji: "📋", label: "Getting Things Done (GTD)" },
  { id: "eisenhower", emoji: "⚖️", label: "Eisenhower Matrix" },
  { id: "deep-work", emoji: "🧠", label: "Deep Work" },
  { id: "eat-the-frog", emoji: "🐸", label: "Eat the Frog" },
  { id: "comparison", emoji: "🔍", label: "Quick Comparison" },
];

export default function TopAlternativesToPomodoro() {
  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* Back button */}
        <Link
          href="/library"
          className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors hover:text-[#7C5CBF] text-[#8B7355]"
        >
          <span className="text-base leading-none">&larr;</span>
          Back to Library
        </Link>

        {/* Hero */}
        <div className="relative mt-6 rounded-2xl overflow-hidden shadow-lg bg-[#7C5CBF]">
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
              <span className="leading-none select-none text-[clamp(4rem,8vw,5.5rem)]">💡</span>
            </div>
            <div className="text-center sm:text-left flex-1 min-w-0">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-3 bg-[#4A3570] text-[#FDF6EC]">
                Productivity
              </span>
              <h1 className="text-3xl md:text-5xl font-extrabold leading-tight tracking-tight text-[#FDF6EC]">
                Top Alternatives to The Pomodoro Method
              </h1>
              <p className="mt-3 text-base font-semibold text-[#FDF6EC]/80">
                by Pom <span role="img" aria-label="tomato">🍅</span>
              </p>
              <p className="mt-4 text-sm sm:text-base leading-relaxed max-w-prose text-[#FDF6EC]/75">
                The Pomodoro Technique isn&apos;t for everyone. Here are the best time management methods to try if 25-minute blocks don&apos;t fit your workflow.
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
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-semibold text-[#5C4033] hover:bg-[#F5F0FF] hover:text-[#7C5CBF] transition-colors"
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

            {/* Why alternatives */}
            <Section id="why-alternatives" emoji="🤔" title="Why Look for Alternatives?">
              <p>
                The Pomodoro Technique is one of the most popular productivity methods in the world — but it is not the right tool for every brain or every type of work. Some people find the 25-minute alarm disruptive rather than motivating. Others do their best work in long, uninterrupted stretches that a timer would shatter. Some struggle not with focus but with knowing <em>what</em> to focus on.
              </p>
              <p>
                If you have tried the Pomodoro Technique and found it frustrating, or if you are simply curious what else is out there, here are the best alternatives worth knowing — each suited to a different working style.
              </p>
              <Callout emoji="💡">
                No method is universally superior. The best productivity system is the one that fits your work, your brain, and your life — and that you actually use.
              </Callout>
            </Section>

            <Divider />

            {/* Time Blocking */}
            <Section id="time-blocking" emoji="📅" title="Time Blocking">
              <p>
                Time blocking is the most natural alternative for people who resist constant interruptions. Instead of splitting the day into 25-minute intervals, you assign specific chunks of time — often an hour or more — to specific tasks or categories of work.
              </p>
              <p>
                You might block 9–11am for deep project work, 11am–12pm for email, and 2–4pm for meetings. The structure comes from the calendar rather than a countdown timer, and the blocks are large enough to accommodate work that needs extended warm-up time.
              </p>
              <div className="bg-[#F5F0FF] border border-[#DDD0F0] rounded-xl p-4 text-sm text-[#5C4033]">
                <p className="font-extrabold text-[#3D2C2C] mb-2">Example day with time blocking</p>
                <div className="space-y-2">
                  {[
                    ["9:00–11:00am", "Deep work — most important project"],
                    ["11:00–11:30am", "Email and messages"],
                    ["11:30am–12:30pm", "Meetings or calls"],
                    ["1:30–3:30pm", "Second deep work block"],
                    ["3:30–4:00pm", "Admin and planning for tomorrow"],
                  ].map(([time, task]) => (
                    <div key={time} className="flex gap-3">
                      <span className="font-bold text-[#7C5CBF] flex-shrink-0 w-32">{time}</span>
                      <span>{task}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Callout emoji="👤">
                Cal Newport, author of <strong>Deep Work</strong>, is the most prominent advocate for time blocking. He argues it is the single most important scheduling habit for knowledge workers.
              </Callout>
            </Section>

            <Divider />

            {/* 90-Minute Ultradian Rhythm */}
            <Section id="ultradian" emoji="🌊" title="90-Minute Ultradian Rhythm">
              <p>
                This method is grounded in sleep science. Nathaniel Kleitman — who also discovered REM sleep — found that the brain cycles through periods of high and low alertness roughly every 90 minutes throughout the day, a pattern called the <strong className="text-[#3D2C2C]">Basic Rest-Activity Cycle</strong>.
              </p>
              <p>
                Working with this rhythm means identifying your natural peaks of alertness and scheduling your hardest work during those windows, followed by genuine rest. Tony Schwartz and Jim Loehr popularised this approach in <em>The Power of Full Engagement</em>.
              </p>
              <p>
                If Pomodoro sessions feel too short and you regularly find yourself frustrated by the alarm cutting through your flow, working in 90-minute blocks may align better with how your brain actually operates.
              </p>
              <Callout emoji="🧬">
                The science: your brain&apos;s ultradian rhythm means it naturally peaks and troughs every 90 minutes. Working against this cycle leads to fatigue; working with it lets you sustain high performance across the whole day.
              </Callout>
            </Section>

            <Divider />

            {/* GTD */}
            <Section id="gtd" emoji="📋" title="Getting Things Done (GTD)">
              <p>
                GTD is less a timer-based technique and more a comprehensive system for managing commitments. Developed by David Allen, it is built on a simple premise: <strong className="text-[#3D2C2C]">your brain is for having ideas, not holding them.</strong>
              </p>
              <p>
                The system involves capturing every task, project, and obligation into a trusted external system, organising them into contexts and next actions, and reviewing the system regularly so you always know what to work on next.
              </p>
              <ul className="space-y-2 text-sm pl-1">
                {[
                  ["Capture", "Write down every commitment — no matter how small — so your brain can let go of it."],
                  ["Clarify", "Decide the very next physical action required for each item."],
                  ["Organise", "Put items into lists by context: calls, emails, errands, waiting for, someday."],
                  ["Review", "Do a weekly review of every list to stay current and catch anything slipping."],
                  ["Engage", "Choose what to work on right now with confidence — your system has your back."],
                ].map(([step, desc]) => (
                  <li key={step} className="flex gap-3">
                    <span className="text-[#7C5CBF] font-bold flex-shrink-0 mt-0.5">→</span>
                    <span><strong className="text-[#3D2C2C]">{step}:</strong> {desc}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <Divider />

            {/* Eisenhower Matrix */}
            <Section id="eisenhower" emoji="⚖️" title="Eisenhower Matrix">
              <p>
                The Eisenhower Matrix is a prioritisation method rather than a timer technique — but it is one of the most useful tools for people who find themselves busy but unproductive. The matrix divides tasks into four quadrants:
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-[#FFF5F5] border border-[#FFCCCC] p-3">
                  <p className="font-extrabold text-[#E54B4B] mb-1">Urgent + Important</p>
                  <p className="text-[#5C4033]">Do it now. Crises, deadlines, emergencies.</p>
                </div>
                <div className="rounded-xl bg-[#F5FFF7] border border-[#C3E6CB] p-3">
                  <p className="font-extrabold text-[#3D7A4E] mb-1">Important, Not Urgent</p>
                  <p className="text-[#5C4033]">Schedule it. Planning, growth, relationships.</p>
                </div>
                <div className="rounded-xl bg-[#FFFDF0] border border-[#F0E890] p-3">
                  <p className="font-extrabold text-[#8B7A00] mb-1">Urgent, Not Important</p>
                  <p className="text-[#5C4033]">Delegate it. Interruptions, some emails.</p>
                </div>
                <div className="rounded-xl bg-[#F8F8F8] border border-[#E0E0E0] p-3">
                  <p className="font-extrabold text-[#888] mb-1">Not Urgent, Not Important</p>
                  <p className="text-[#5C4033]">Eliminate it. Busywork, time-wasters.</p>
                </div>
              </div>
              <Callout emoji="💡">
                Most people spend too much time in the &quot;urgent but not important&quot; quadrant — reactive work that feels pressing but doesn&apos;t move the needle. The matrix redirects attention toward the important-but-not-urgent work that actually builds careers and skills over time.
              </Callout>
            </Section>

            <Divider />

            {/* Deep Work */}
            <Section id="deep-work" emoji="🧠" title="Deep Work">
              <p>
                Deep Work, as a practice, refers to the deliberate cultivation of long periods of uninterrupted, cognitively demanding work — typically two to four hours at a stretch. Cal Newport identifies four philosophies for how to structure it:
              </p>
              <ul className="space-y-3 text-sm pl-1">
                {[
                  ["Monastic", "Eliminate shallow work almost entirely. Ideal for researchers and writers who control their schedule."],
                  ["Bimodal", "Divide your time between long periods of isolation and open availability. Good for academics."],
                  ["Rhythmic", "A fixed daily block of deep work at the same time every day. Most practical for most people."],
                  ["Journalistic", "Fit deep work into whatever gaps appear in the schedule. Hard to sustain, but flexible."],
                ].map(([name, desc]) => (
                  <li key={name} className="flex gap-3">
                    <span className="text-[#7C5CBF] font-bold flex-shrink-0 mt-0.5">—</span>
                    <span><strong className="text-[#3D2C2C]">{name}:</strong> {desc}</span>
                  </li>
                ))}
              </ul>
              <p>
                For most people, the <strong className="text-[#3D2C2C]">Rhythmic philosophy</strong> is the most practical alternative to Pomodoro: a fixed morning block of two to four hours for the hardest work, before the day&apos;s interruptions begin.
              </p>
            </Section>

            <Divider />

            {/* Eat the Frog */}
            <Section id="eat-the-frog" emoji="🐸" title="Eat the Frog">
              <p>
                Named after a Mark Twain quote and popularised by Brian Tracy, Eat the Frog is built around a single habit: <strong className="text-[#3D2C2C]">begin every day by completing your most important, most difficult task first.</strong>
              </p>
              <p>
                The metaphor is intentional. If you have to eat a live frog today, it is better to do it first thing in the morning than to spend the day dreading it. The method does not specify how long to work — it simply argues that the <em>order</em> in which you tackle tasks matters enormously.
              </p>
              <p>
                Most people waste their freshest cognitive resources on email and admin before touching their most meaningful work. Eat the Frog reverses this. Pair it with any scheduling technique — including Pomodoro — and your first session of the day will always be your most important one.
              </p>
              <Callout emoji="🐸">
                &quot;If it&apos;s your job to eat a frog, it&apos;s best to do it first thing in the morning. And if it&apos;s your job to eat two frogs, it&apos;s best to eat the biggest one first.&quot; — Mark Twain
              </Callout>
            </Section>

            <Divider />

            {/* Quick Comparison */}
            <Section id="comparison" emoji="🔍" title="Quick Comparison">
              <p>
                Here is a summary of each method and who it suits best:
              </p>
              <div className="space-y-3">
                <MethodCard emoji="🍅" name="Pomodoro Technique" bestFor="building focus habits, fighting procrastination">
                  25-minute work sprints with 5-minute breaks. Best for people who struggle to start tasks or who get lost in distraction.
                </MethodCard>
                <MethodCard emoji="📅" name="Time Blocking" bestFor="complex work that needs long warm-up time">
                  Schedule large chunks of the day for specific work types. Best for people who find short timers disruptive.
                </MethodCard>
                <MethodCard emoji="🌊" name="90-Minute Ultradian" bestFor="deep thinkers who enter long flow states">
                  Work in 90-minute blocks aligned to your brain&apos;s natural alertness cycle. Best for researchers, writers, and programmers.
                </MethodCard>
                <MethodCard emoji="📋" name="GTD" bestFor="people overwhelmed by too many commitments">
                  Comprehensive task capture and organisation system. Best for people who struggle with what to work on, not how to focus.
                </MethodCard>
                <MethodCard emoji="⚖️" name="Eisenhower Matrix" bestFor="people who are busy but not making progress">
                  Prioritise by urgency and importance. Best for people whose days are full but whose most important work gets pushed aside.
                </MethodCard>
                <MethodCard emoji="🐸" name="Eat the Frog" bestFor="people who procrastinate on their hardest tasks">
                  Do your most important task first, every day. Best as a complement to any other scheduling system.
                </MethodCard>
              </div>
              <Callout emoji="🔄">
                Many practitioners use a hybrid approach: the Eisenhower Matrix to decide what matters, Eat the Frog to determine what to do first, Time Blocking to protect the calendar, and the Pomodoro Technique for the sessions themselves.
              </Callout>
            </Section>

          </div>
        </div>

        {/* Bottom nav */}
        <div className="flex justify-center mt-10 mb-4">
          <Link
            href="/library"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#7C5CBF] text-white rounded-full font-bold text-sm hover:bg-[#6A4DAD] transition-colors shadow-sm"
          >
            <span className="text-base leading-none">📚</span>
            Browse More Books
          </Link>
        </div>

        <RelatedArticles currentSlug="top-alternatives-to-the-pomodoro-method" />
      </div>
    </main>
  );
}
