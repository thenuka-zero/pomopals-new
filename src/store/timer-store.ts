"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { TimerSettings, TimerPhase, TimerStatus, PomodoroSession } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

interface TimerState {
  // Settings
  settings: TimerSettings;
  updateSettings: (settings: Partial<TimerSettings>) => void;

  // Timer state
  phase: TimerPhase;
  status: TimerStatus;
  timeRemaining: number; // seconds (computed from wall-clock on each tick)
  pomodoroCount: number;

  // Wall-clock tracking for cross-tab sync
  startedAt: number | null; // Date.now() when timer was last started/resumed
  elapsed: number; // seconds elapsed before the last pause

  // Session tracking
  currentSessionStart: number | null; // Date.now() timestamp
  sessions: PomodoroSession[];

  // Actions
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  skip: () => void;
  tick: () => void;

  // For synced room mode
  syncState: (phase: TimerPhase, status: TimerStatus, timeRemaining: number, pomodoroCount: number) => void;
}

const DEFAULT_SETTINGS: TimerSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
};

function getDurationForPhase(phase: TimerPhase, settings: TimerSettings): number {
  switch (phase) {
    case "work": return settings.workDuration;
    case "shortBreak": return settings.shortBreakDuration;
    case "longBreak": return settings.longBreakDuration;
  }
}

function computeTimeRemaining(
  phase: TimerPhase,
  settings: TimerSettings,
  status: TimerStatus,
  startedAt: number | null,
  elapsed: number,
): number {
  const duration = getDurationForPhase(phase, settings) * 60;
  if (status === "running" && startedAt) {
    const additionalElapsed = Math.floor((Date.now() - startedAt) / 1000);
    return Math.max(0, duration - elapsed - additionalElapsed);
  }
  return Math.max(0, duration - elapsed);
}

// Flag to prevent broadcasting when receiving from another tab or from syncState
let skipBroadcast = false;

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      phase: "work",
      status: "idle",
      timeRemaining: DEFAULT_SETTINGS.workDuration * 60,
      pomodoroCount: 0,
      startedAt: null,
      elapsed: 0,
      currentSessionStart: null,
      sessions: [],

      updateSettings: (newSettings) => {
        const settings = { ...get().settings, ...newSettings };
        set({ settings });
        if (get().status === "idle") {
          const duration = getDurationForPhase(get().phase, settings);
          set({ timeRemaining: duration * 60 });
        }
      },

      start: () => {
        const now = Date.now();
        set({
          status: "running",
          startedAt: now,
          elapsed: 0,
          currentSessionStart: now,
        });
      },

      pause: () => {
        const { startedAt, elapsed, phase, settings } = get();
        const additionalElapsed = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
        const newElapsed = elapsed + additionalElapsed;
        const duration = getDurationForPhase(phase, settings) * 60;
        set({
          status: "paused",
          startedAt: null,
          elapsed: newElapsed,
          timeRemaining: Math.max(0, duration - newElapsed),
        });
      },

      resume: () => {
        set({
          status: "running",
          startedAt: Date.now(),
        });
      },

      reset: () => {
        const { settings } = get();
        set({
          phase: "work",
          status: "idle",
          timeRemaining: settings.workDuration * 60,
          pomodoroCount: 0,
          startedAt: null,
          elapsed: 0,
          currentSessionStart: null,
        });
      },

      skip: () => {
        const state = get();
        recordSessionIfNeeded(state, set);
        transitionPhase(state, set);
      },

      tick: () => {
        const state = get();
        if (state.status !== "running") return;

        const newTime = computeTimeRemaining(
          state.phase, state.settings, state.status, state.startedAt, state.elapsed,
        );

        if (newTime <= 0) {
          // Phase complete
          const totalDuration = getDurationForPhase(state.phase, state.settings) * 60;
          if (state.currentSessionStart) {
            const session: PomodoroSession = {
              id: uuidv4(),
              userId: "",
              startedAt: new Date(state.currentSessionStart).toISOString(),
              endedAt: new Date().toISOString(),
              phase: state.phase,
              plannedDuration: totalDuration,
              actualDuration: totalDuration,
              completed: true,
              completionPercentage: 100,
              date: new Date().toISOString().split("T")[0],
            };
            set((s) => ({ sessions: [...s.sessions, session] }));
          }
          transitionPhase(state, set);
        } else {
          set({ timeRemaining: newTime });
        }
      },

      syncState: (phase, status, timeRemaining, pomodoroCount) => {
        skipBroadcast = true;
        set({ phase, status, timeRemaining, pomodoroCount });
        skipBroadcast = false;
      },
    }),
    {
      name: "pomo-timer",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        phase: state.phase,
        status: state.status,
        pomodoroCount: state.pomodoroCount,
        settings: state.settings,
        startedAt: state.startedAt,
        elapsed: state.elapsed,
        currentSessionStart: state.currentSessionStart,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.status === "running" && state.startedAt) {
          const timeRemaining = computeTimeRemaining(
            state.phase, state.settings, state.status, state.startedAt, state.elapsed,
          );
          if (timeRemaining <= 0) {
            // Timer expired while tab was closed — transition to next phase
            const { phase, pomodoroCount, settings } = state;
            if (phase === "work") {
              const newCount = pomodoroCount + 1;
              const nextPhase = newCount % settings.longBreakInterval === 0 ? "longBreak" : "shortBreak";
              useTimerStore.setState({
                phase: nextPhase,
                status: "idle",
                pomodoroCount: newCount,
                startedAt: null,
                elapsed: 0,
                timeRemaining: getDurationForPhase(nextPhase, settings) * 60,
                currentSessionStart: null,
              });
            } else {
              useTimerStore.setState({
                phase: "work",
                status: "idle",
                startedAt: null,
                elapsed: 0,
                timeRemaining: settings.workDuration * 60,
                currentSessionStart: null,
              });
            }
          } else {
            useTimerStore.setState({ timeRemaining });
          }
        } else {
          // Recompute timeRemaining for paused and idle states
          const timeRemaining = computeTimeRemaining(
            state.phase, state.settings, state.status, null, state.elapsed,
          );
          useTimerStore.setState({ timeRemaining });
        }
      },
    },
  ),
);

// Client-side hydration and cross-tab sync
if (typeof window !== "undefined") {
  // Explicitly rehydrate from localStorage on the client.
  // skipHydration: true prevents hydration during SSR; this call runs only in the browser.
  useTimerStore.persist.rehydrate();

  try {
    const channel = new BroadcastChannel("pomo-timer-sync");

    // Broadcast meaningful state changes to other tabs (not every tick)
    useTimerStore.subscribe((state, prevState) => {
      if (skipBroadcast) return;
      if (
        state.status !== prevState.status ||
        state.phase !== prevState.phase ||
        state.pomodoroCount !== prevState.pomodoroCount ||
        state.startedAt !== prevState.startedAt ||
        state.elapsed !== prevState.elapsed ||
        state.settings !== prevState.settings
      ) {
        channel.postMessage({
          phase: state.phase,
          status: state.status,
          startedAt: state.startedAt,
          elapsed: state.elapsed,
          pomodoroCount: state.pomodoroCount,
          settings: state.settings,
        });
      }
    });

    // Receive state updates from other tabs
    channel.onmessage = (event) => {
      const data = event.data;
      const timeRemaining = computeTimeRemaining(
        data.phase, data.settings, data.status, data.startedAt, data.elapsed,
      );
      skipBroadcast = true;
      useTimerStore.setState({
        phase: data.phase,
        status: data.status,
        startedAt: data.startedAt,
        elapsed: data.elapsed,
        pomodoroCount: data.pomodoroCount,
        settings: data.settings,
        timeRemaining,
      });
      skipBroadcast = false;
    };
  } catch {
    // BroadcastChannel not supported in some environments
  }
}

function recordSessionIfNeeded(
  state: TimerState,
  set: (partial: Partial<TimerState> | ((s: TimerState) => Partial<TimerState>)) => void,
) {
  if (state.currentSessionStart && state.phase === "work") {
    const totalDuration = getDurationForPhase(state.phase, state.settings) * 60;
    const elapsed = totalDuration - state.timeRemaining;
    const completionPercentage = Math.round((elapsed / totalDuration) * 100);

    if (elapsed > 0) {
      const session: PomodoroSession = {
        id: uuidv4(),
        userId: "",
        startedAt: new Date(state.currentSessionStart).toISOString(),
        endedAt: new Date().toISOString(),
        phase: state.phase,
        plannedDuration: totalDuration,
        actualDuration: elapsed,
        completed: false,
        completionPercentage,
        date: new Date().toISOString().split("T")[0],
      };
      set((s) => ({ sessions: [...s.sessions, session] }));
    }
  }
}

function transitionPhase(
  state: TimerState,
  set: (partial: Partial<TimerState> | ((s: TimerState) => Partial<TimerState>)) => void,
) {
  const { phase, pomodoroCount, settings } = state;

  if (phase === "work") {
    const newCount = pomodoroCount + 1;
    if (newCount % settings.longBreakInterval === 0) {
      set({
        phase: "longBreak",
        status: "idle",
        timeRemaining: settings.longBreakDuration * 60,
        pomodoroCount: newCount,
        currentSessionStart: null,
        startedAt: null,
        elapsed: 0,
      });
    } else {
      set({
        phase: "shortBreak",
        status: "idle",
        timeRemaining: settings.shortBreakDuration * 60,
        pomodoroCount: newCount,
        currentSessionStart: null,
        startedAt: null,
        elapsed: 0,
      });
    }
  } else {
    set({
      phase: "work",
      status: "idle",
      timeRemaining: settings.workDuration * 60,
      currentSessionStart: null,
      startedAt: null,
      elapsed: 0,
    });
  }
}
