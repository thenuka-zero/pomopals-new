"use client";

import { useCallback } from "react";
import { useTimerStore } from "@/store/timer-store";
import { TimerPhase } from "@/lib/types";

// ---------------------------------------------------------------------------
// Module-level AudioContext singleton (pre-unlocked on first user gesture)
// ---------------------------------------------------------------------------
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

/** Call this during a user-gesture (Start button press) to pre-unlock AudioContext for Safari */
export function unlockAudioContext() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Sound synthesis
// ---------------------------------------------------------------------------
function playBell() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.value = 880; // A5
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.8);
}

function playDigital() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "square";
  osc.frequency.value = 440; // A4
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
}

function playNotificationSound(sound: "none" | "bell" | "digital") {
  if (sound === "bell") playBell();
  else if (sound === "digital") playDigital();
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useNotifications() {
  const notificationSound = useTimerStore((s) => s.settings.notificationSound);

  /**
   * Request notification permission once per user (persisted in localStorage).
   * Must be called from a user-gesture handler (e.g., Start button click).
   */
  const requestPermission = useCallback(() => {
    if (typeof Notification === "undefined") return;
    if (localStorage.getItem("pomo-notif-asked")) return;
    if (Notification.permission !== "default") return;
    localStorage.setItem("pomo-notif-asked", "1");
    Notification.requestPermission().catch(() => {});
  }, []);

  /**
   * Fire a phase-completion notification + optional sound.
   *
   * - If the tab is focused (document visible): suppress OS notification, show in-app flash (handled by caller).
   * - If the tab is hidden: show OS notification.
   * - Sound: only plays when isRemote is false (i.e., this tab was the clock source).
   *
   * @param completedPhase  The phase that just ended
   * @param nextPhase       The phase that just began
   * @param opts.isRemote   True when state came from BroadcastChannel (another tab fired tick)
   * @returns               { showFlash: boolean } — true when the OS notification was suppressed (tab is visible)
   */
  const notifyPhaseComplete = useCallback(
    (
      completedPhase: TimerPhase,
      nextPhase: TimerPhase,
      opts: { isRemote: boolean } = { isRemote: false },
    ): { showFlash: boolean } => {
      // Always play sound on the source tab (not remote)
      if (!opts.isRemote) {
        playNotificationSound(notificationSound ?? "none");
      }

      // Determine notification content
      let title: string;
      let body: string;

      if (completedPhase === "work") {
        title = "🍅 Pomodoro complete!";
        body =
          nextPhase === "longBreak"
            ? "Time for a 15-minute long break. Well done! 🎉"
            : "Time for a 5-minute break. You've earned it.";
      } else {
        title = "☕ Break's over!";
        body = "Ready to focus? Start your next Pomodoro.";
      }

      // If tab is visible, suppress OS notification (return showFlash = true)
      if (!document.hidden) {
        return { showFlash: true };
      }

      // Tab is hidden — send OS notification
      if (typeof Notification === "undefined") return { showFlash: false };
      if (Notification.permission !== "granted") return { showFlash: false };

      try {
        const notif = new Notification(title, {
          body,
          icon: "/favicon.ico",
          tag: "pomo-phase",
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch {
        // Ignore notification errors (e.g., insecure context)
      }

      return { showFlash: false };
    },
    [notificationSound],
  );

  /**
   * Fire a "timer finished while you were away" notification (hydration path).
   * Only fires if Notification.permission === "granted".
   */
  const notifyHydratedExpired = useCallback(
    (completedPhase: TimerPhase) => {
      if (typeof Notification === "undefined") return;
      if (Notification.permission !== "granted") return;

      const body =
        completedPhase === "work"
          ? "Your Pomodoro ended. Ready to take a break?"
          : "Your break ended. Ready to start a new Pomodoro?";

      try {
        const notif = new Notification("⏰ Timer finished while you were away", {
          body,
          icon: "/favicon.ico",
          tag: "pomo-phase",
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch {
        // Ignore
      }
    },
    [],
  );

  return { requestPermission, notifyPhaseComplete, notifyHydratedExpired };
}
