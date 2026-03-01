"use client";

import { useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useTimerStore } from "@/store/timer-store";
import { PendingAchievement } from "@/lib/types";

export function useAchievementPolling(onUnlock: (achievement: PendingAchievement) => void) {
  const { data: session } = useSession();
  const timerStatus = useTimerStore((s) => s.status);
  const onUnlockRef = useRef(onUnlock);
  onUnlockRef.current = onUnlock;

  const fetchPending = useCallback(async () => {
    if (!session?.user?.id || !session.user.emailVerified) return;
    // Don't poll while timer is running (never interrupt a session)
    if (timerStatus === "running") return;

    try {
      const res = await fetch("/api/achievements/pending");
      if (!res.ok) return;
      const data = await res.json();
      const pending: PendingAchievement[] = data.pending ?? [];
      if (pending.length === 0) return;

      // Acknowledge immediately
      const ids = pending.slice(0, 5).map((a) => a.id);
      await fetch("/api/achievements/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ achievementIds: ids }),
      });

      // Queue toasts sequentially (up to 5)
      for (const achievement of pending.slice(0, 5)) {
        onUnlockRef.current(achievement);
      }
    } catch {
      // Silent — never interrupt the user experience
    }
  }, [session?.user?.id, session?.user?.emailVerified, timerStatus]);

  // Poll every 30 seconds when not running
  useEffect(() => {
    if (!session?.user?.id) return;
    // Initial fetch shortly after load
    const initialTimeout = setTimeout(fetchPending, 3000);
    // Recurring poll
    const interval = setInterval(fetchPending, 30_000);
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [session?.user?.id, fetchPending]);

  // Also fetch when timer transitions from running → non-running
  const prevStatus = useRef(timerStatus);
  useEffect(() => {
    if (prevStatus.current === "running" && timerStatus !== "running") {
      // Timer just stopped — fetch pending immediately
      setTimeout(fetchPending, 1500); // Small delay so server has time to process
    }
    prevStatus.current = timerStatus;
  }, [timerStatus, fetchPending]);
}
