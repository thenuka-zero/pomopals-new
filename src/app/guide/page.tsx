import Link from "next/link";

export const metadata = {
  title: "Quick Start Guide | PomoPals",
  description:
    "Everything you need to know to get the most out of PomoPals — from your first pomodoro to hosting a room with friends.",
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

const TOC_ITEMS = [
  { id: "what-is-pomopals", emoji: "🍅", label: "What is PomoPals?" },
  { id: "solo-mode", emoji: "⏱️", label: "Solo Mode" },
  { id: "intentions", emoji: "💭", label: "Setting Intentions" },
  { id: "rooms", emoji: "🏠", label: "Multiplayer Rooms" },
  { id: "analytics", emoji: "📊", label: "Analytics" },
  { id: "friends", emoji: "👫", label: "Friends" },
  { id: "trophies", emoji: "🏆", label: "Trophies & Achievements" },
  { id: "tips", emoji: "✨", label: "Tips & Shortcuts" },
];

export default function GuidePage() {
  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="text-center mb-10">
          <span className="text-5xl leading-none select-none block mb-4">🚀</span>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#3D2C2C]">
            Quick Start Guide
          </h1>
          <p className="mt-3 text-lg text-[#8B7355] font-medium max-w-xl mx-auto">
            Everything you need to know to get the most out of PomoPals — from your very first pomodoro to hosting a room with friends.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* Table of contents — sticky sidebar on large screens */}
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

            {/* What is PomoPals */}
            <Section id="what-is-pomopals" emoji="🍅" title="What is PomoPals?">
              <p>
                PomoPals is a social Pomodoro timer that helps you focus — alone or alongside friends. It is built around the{" "}
                <strong className="text-[#3D2C2C]">Pomodoro Technique</strong>: work in focused 25-minute sprints, take short breaks in between, and take a longer break every four sessions.
              </p>
              <p>
                What makes PomoPals different is the social layer. You can create a shared room, invite friends, and work together with a synchronised timer — everyone sees the same countdown, transitions together, and stays accountable to each other.
              </p>
              <Callout emoji="🔓">
                You can use the timer without an account. Sign up to unlock analytics, intentions, achievements, rooms, and friends.
              </Callout>
            </Section>

            <Divider />

            {/* Solo Mode */}
            <Section id="solo-mode" emoji="⏱️" title="Solo Mode">
              <p>
                The timer on the homepage is your solo workspace. By default it runs a classic Pomodoro cycle:
              </p>
              <ul className="space-y-2 pl-1">
                {[
                  ["🔴", "Work", "25 minutes of focused work"],
                  ["🟢", "Short Break", "5 minutes to rest"],
                  ["🌿", "Long Break", "15 minutes after every 4 work sessions"],
                ].map(([dot, name, desc]) => (
                  <li key={name} className="flex items-start gap-2 text-sm">
                    <span className="leading-relaxed">{dot}</span>
                    <span>
                      <strong className="text-[#3D2C2C]">{name}</strong> — {desc}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="font-semibold text-[#3D2C2C] mt-2">Controls</p>
              <ul className="space-y-1.5 text-sm pl-1">
                {[
                  ["▶ / ⏸", "Start or pause the timer"],
                  ["⏭", "Skip to the next phase"],
                  ["↺", "Reset the current phase (visible when running or paused)"],
                ].map(([key, desc]) => (
                  <li key={key} className="flex gap-2">
                    <code className="bg-[#F0E6D3] text-[#3D2C2C] px-1.5 py-0.5 rounded text-xs font-mono flex-shrink-0">{key}</code>
                    <span>{desc}</span>
                  </li>
                ))}
              </ul>

              <p className="font-semibold text-[#3D2C2C] mt-2">Customising the timer</p>
              <p className="text-sm">
                Click the chevron (∨) at the bottom of the timer to expand options, then the gear icon to open Settings. You can change work, short break, and long break durations, set the long break interval, choose a notification sound, and toggle auto-start for breaks.
              </p>
              <Callout emoji="💡">
                If you skip or reset a session after at least 1 minute has elapsed, PomoPals will ask whether to count that partial session toward your analytics.
              </Callout>
            </Section>

            <Divider />

            {/* Intentions */}
            <Section id="intentions" emoji="💭" title="Setting Intentions">
              <p>
                Before starting a work session, you can set an <strong className="text-[#3D2C2C]">intention</strong> — a short note describing what you plan to focus on. Intentions help you stay on track and build a habit of purposeful work.
              </p>

              <p className="font-semibold text-[#3D2C2C]">How it works</p>
              <div className="space-y-2">
                <Step number={1}>Click the pencil icon next to the timer (requires a signed-in account and intentions enabled in Settings).</Step>
                <Step number={2}>Type what you will focus on — up to 280 characters. The field expands as you type.</Step>
                <Step number={3}>Press Enter or click the edit icon to confirm, then start the timer. Your intention appears below the timer while the session is running.</Step>
                <Step number={4}>When the work phase ends naturally, a <strong className="text-[#3D2C2C]">reflection prompt</strong> appears asking whether you completed it. You can also add an optional note on how the session went.</Step>
              </div>

              <p className="font-semibold text-[#3D2C2C] mt-2">Intentions Journal</p>
              <p className="text-sm">
                All your intentions and reflections are saved in the{" "}
                <Link href="/intentions" className="text-[#E54B4B] font-semibold hover:underline">Intentions Journal</Link>. You can filter by status (completed, not completed, skipped), see your completion rate, and track your current focus streak.
              </p>
            </Section>

            <Divider />

            {/* Rooms */}
            <Section id="rooms" emoji="🏠" title="Multiplayer Rooms">
              <p>
                Rooms let you work alongside others with a <strong className="text-[#3D2C2C]">shared, synchronised timer</strong>. Everyone in the room sees the same countdown and transitions through phases together.
              </p>

              <p className="font-semibold text-[#3D2C2C]">Creating a room</p>
              <div className="space-y-2">
                <Step number={1}>Click the chevron (∨) on the timer, then the + icon to open the Create Room dialog.</Step>
                <Step number={2}>Give your room a name and choose whether to bring your current timer state or start fresh.</Step>
                <Step number={3}>Copy the invite link and share it with anyone you want to join.</Step>
              </div>

              <p className="font-semibold text-[#3D2C2C] mt-2">Joining a room</p>
              <div className="space-y-2">
                <Step number={1}>Click the invite link, or use the join icon in the timer options and enter the 6-character room code.</Step>
                <Step number={2}>If the host has join requests enabled, your request will be sent to them for approval. You will be notified once accepted.</Step>
              </div>

              <p className="font-semibold text-[#3D2C2C] mt-2">Roles in a room</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse mt-1">
                  <thead>
                    <tr className="bg-[#FDF6EC]">
                      <th className="text-left px-3 py-2 rounded-tl-lg text-[#3D2C2C] font-bold">Role</th>
                      <th className="text-left px-3 py-2 text-[#3D2C2C] font-bold">Can do</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["🎯 Host", "Start, pause, reset, skip the timer · Approve/deny join requests · Make co-hosts · Transfer host · End the room"],
                      ["⭐ Co-Host", "Start, pause, reset, skip the timer (same timer controls as the host)"],
                      ["👤 Participant", "See the shared timer and participants · Set a personal intention · Receive phase notifications"],
                    ].map(([role, can]) => (
                      <tr key={role} className="border-t border-[#F0E6D3]">
                        <td className="px-3 py-2 font-semibold text-[#3D2C2C] align-top whitespace-nowrap">{role}</td>
                        <td className="px-3 py-2 text-[#5C4033]">{can}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Callout emoji="🔄">
                If you refresh the page while hosting, PomoPals automatically reclaims your host role when you rejoin — your session is not lost.
              </Callout>

              <p className="text-sm mt-1">
                Rooms support up to <strong className="text-[#3D2C2C]">20 participants</strong> and expire after 2 hours of inactivity.
              </p>
            </Section>

            <Divider />

            {/* Analytics */}
            <Section id="analytics" emoji="📊" title="Analytics">
              <p>
                Every completed (and partial) session is automatically saved. Visit the{" "}
                <Link href="/analytics" className="text-[#E54B4B] font-semibold hover:underline">Analytics page</Link>{" "}
                to see:
              </p>
              <ul className="space-y-1.5 text-sm pl-1">
                {[
                  "Total and completed pomodoros over any time period",
                  "Total focus time in minutes",
                  "Completion rate",
                  "A session-by-session log with timestamps and duration",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-[#E54B4B] font-bold flex-shrink-0">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm">
                Sessions from rooms are labelled with the room name and participant count, so you can see exactly when you worked solo versus with others.
              </p>
            </Section>

            <Divider />

            {/* Friends */}
            <Section id="friends" emoji="👫" title="Friends">
              <p>
                Add friends to see when they are focused and jump into rooms together.
              </p>

              <p className="font-semibold text-[#3D2C2C]">Adding a friend</p>
              <div className="space-y-2">
                <Step number={1}>Go to <Link href="/friends" className="text-[#E54B4B] font-semibold hover:underline">Friends</Link> and search by name or email.</Step>
                <Step number={2}>Send a friend request — they will receive a notification to accept or decline.</Step>
                <Step number={3}>Once accepted, you can see each other's activity on the home screen.</Step>
              </div>

              <p className="font-semibold text-[#3D2C2C] mt-2">Activity feed</p>
              <p className="text-sm">
                The Friends widget on the homepage shows which of your friends are currently in a work session and which room they are in. Click <strong className="text-[#3D2C2C]">Join</strong> to send a join request directly to their room.
              </p>
              <Callout emoji="🔒">
                You can hide your activity from friends at any time via the <Link href="/settings" className="text-[#E54B4B] font-semibold hover:underline">Settings</Link> page (toggle <em>Share sessions with friends</em>).
              </Callout>
            </Section>

            <Divider />

            {/* Trophies */}
            <Section id="trophies" emoji="🏆" title="Trophies & Achievements">
              <p>
                PomoPals awards <strong className="text-[#3D2C2C]">trophies</strong> as you reach milestones — completing your first pomodoro, building a focus streak, hosting rooms, and more. There are also a handful of secret achievements to discover.
              </p>
              <p className="text-sm">
                Achievements are organised into four tiers: <strong className="text-[#3D2C2C]">Bronze → Silver → Gold → Platinum</strong>. You can see your full trophy case, track progress toward locked achievements, and pin your favourites to your profile on the{" "}
                <Link href="/trophies" className="text-[#E54B4B] font-semibold hover:underline">Trophies page</Link>.
              </p>
              <p className="text-sm">
                A toast notification pops up whenever you unlock something new — keep an eye on the bottom of the screen after completing a session.
              </p>
            </Section>

            <Divider />

            {/* Tips */}
            <Section id="tips" emoji="✨" title="Tips & Shortcuts">
              <ul className="space-y-3 text-sm">
                {[
                  ["⌨️ Enter to confirm", "While typing an intention, press Enter to set it and close the input."],
                  ["🔔 Browser notifications", "Allow notifications on first timer start to get desktop alerts when a phase ends — even if the tab is in the background."],
                  ["📑 Tab title countdown", "The browser tab title counts down your timer in real time, so you can glance at it without switching tabs."],
                  ["🔀 Auto-start breaks", "Enable auto-start in Settings so breaks begin automatically the moment a work phase finishes."],
                  ["⭐ Make a co-host", "In a room, the host can make any participant a co-host. Co-hosts share timer controls so the host is not the only one who can pause or skip."],
                  ["📖 Intentions journal", "Even if you do not finish an intention, mark it \"Not completed\" and add a note — the reflection is often more valuable than the result."],
                  ["🏆 Secret achievements", "A few trophies are hidden. Explore the app and see what you can find."],
                ].map(([title, desc]) => (
                  <li key={title as string} className="flex gap-3">
                    <span className="font-extrabold text-[#3D2C2C] flex-shrink-0 whitespace-nowrap">{title as string}</span>
                    <span className="text-[#5C4033]">{desc as string}</span>
                  </li>
                ))}
              </ul>
            </Section>

          </div>
        </div>

        {/* Footer CTA */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="px-6 py-3 bg-[#E54B4B] text-white rounded-full font-bold text-sm hover:bg-[#D43D3D] transition-colors shadow-sm"
          >
            Start your first pomodoro →
          </Link>
          <Link
            href="/library"
            className="px-6 py-3 bg-white border-2 border-[#F0E6D3] text-[#5C4033] rounded-full font-bold text-sm hover:border-[#E54B4B]/30 hover:bg-[#FFF8F0] transition-all"
          >
            📚 Browse the Library
          </Link>
        </div>

      </div>
    </main>
  );
}
