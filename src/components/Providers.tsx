"use client";
import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { NonceProvider } from "@/lib/nonce-context";
import { useTimerStore } from "@/store/timer-store";
import AchievementToastContainer from "@/components/AchievementToastContainer";
import FriendRequestToastContainer from "@/components/FriendRequestToastContainer";

const DEFAULT_TITLE = "PomoPals — Pomodoro Timer with Friends! 🍅";

function TimerTitle() {
  const status = useTimerStore((s) => s.status);
  const phase = useTimerStore((s) => s.phase);
  const startedAt = useTimerStore((s) => s.startedAt);
  const elapsed = useTimerStore((s) => s.elapsed);
  const settings = useTimerStore((s) => s.settings);
  const timeRemaining = useTimerStore((s) => s.timeRemaining);
  const roomId = useTimerStore((s) => s.roomId);

  useEffect(() => {
    const duration =
      phase === "work" ? settings.workDuration * 60 :
      phase === "shortBreak" ? settings.shortBreakDuration * 60 :
      settings.longBreakDuration * 60;

    const label =
      phase === "work" ? "Work" :
      phase === "shortBreak" ? "Short Break" : "Long Break";

    const setTitle = (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      document.title = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} · ${label} — PomoPals`;
    };

    if (status === "idle") {
      document.title = DEFAULT_TITLE;
      return;
    }

    if (status === "paused") {
      setTitle(timeRemaining);
      return;
    }

    if (startedAt !== null) {
      // Solo mode: derive time from wall-clock so it runs independently of tick()
      const tick = () => {
        const additionalElapsed = Math.floor((Date.now() - startedAt) / 1000);
        setTitle(Math.max(0, duration - elapsed - additionalElapsed));
      };
      tick();
      const id = setInterval(tick, 1000);
      return () => clearInterval(id);
    } else if (roomId !== null) {
      // Room mode: syncState sets timeRemaining from server polls but not startedAt.
      // Only run when roomId is set so stale store state on other pages doesn't trigger a countdown.
      const receivedAt = Date.now();
      const receivedRemaining = timeRemaining;
      const tick = () => {
        const secondsPassed = Math.floor((Date.now() - receivedAt) / 1000);
        setTitle(Math.max(0, receivedRemaining - secondsPassed));
      };
      tick();
      const id = setInterval(tick, 1000);
      return () => clearInterval(id);
    } else {
      document.title = DEFAULT_TITLE;
    }
  }, [status, phase, startedAt, elapsed, settings, timeRemaining, roomId]);

  return null;
}

export default function Providers({
  children,
  session,
  nonce,
}: {
  children: React.ReactNode;
  session: Session | null;
  nonce: string;
}) {
  return (
    <NonceProvider nonce={nonce}>
      <SessionProvider session={session} refetchOnWindowFocus={false} refetchInterval={0}>
        <TimerTitle />
        {children}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
          <FriendRequestToastContainer />
          <AchievementToastContainer />
        </div>
      </SessionProvider>
    </NonceProvider>
  );
}
