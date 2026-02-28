"use client";

import { create } from "zustand";
import { TimerSettings, TimerPhase, TimerStatus, PomodoroSession } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

interface TimerState {
  // Settings
  settings: TimerSettings;
  updateSettings: (settings: Partial<TimerSettings>) => void;

  // Timer state
  phase: TimerPhase;
  status: TimerStatus;
  timeRemaining: number; // seconds
  pomodoroCount: number;

  // Session tracking
  currentSessionStart: Date | null;
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

export const useTimerStore = create<TimerState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  phase: "work",
  status: "idle",
  timeRemaining: DEFAULT_SETTINGS.workDuration * 60,
  pomodoroCount: 0,
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
    set({ status: "running", currentSessionStart: new Date() });
  },

  pause: () => {
    set({ status: "paused" });
  },

  resume: () => {
    set({ status: "running" });
  },

  reset: () => {
    const { settings } = get();
    set({
      phase: "work",
      status: "idle",
      timeRemaining: settings.workDuration * 60,
      pomodoroCount: 0,
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

    const newTime = state.timeRemaining - 1;
    if (newTime <= 0) {
      // Phase complete
      const totalDuration = getDurationForPhase(state.phase, state.settings) * 60;
      if (state.currentSessionStart) {
        const session: PomodoroSession = {
          id: uuidv4(),
          userId: "",
          startedAt: state.currentSessionStart.toISOString(),
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
    set({ phase, status, timeRemaining, pomodoroCount });
  },
}));

function getDurationForPhase(phase: TimerPhase, settings: TimerSettings): number {
  switch (phase) {
    case "work": return settings.workDuration;
    case "shortBreak": return settings.shortBreakDuration;
    case "longBreak": return settings.longBreakDuration;
  }
}

function recordSessionIfNeeded(
  state: TimerState,
  set: (partial: Partial<TimerState> | ((s: TimerState) => Partial<TimerState>)) => void
) {
  if (state.currentSessionStart && state.phase === "work") {
    const totalDuration = getDurationForPhase(state.phase, state.settings) * 60;
    const elapsed = totalDuration - state.timeRemaining;
    const completionPercentage = Math.round((elapsed / totalDuration) * 100);

    if (elapsed > 0) {
      const session: PomodoroSession = {
        id: uuidv4(),
        userId: "",
        startedAt: state.currentSessionStart.toISOString(),
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
  set: (partial: Partial<TimerState> | ((s: TimerState) => Partial<TimerState>)) => void
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
      });
    } else {
      set({
        phase: "shortBreak",
        status: "idle",
        timeRemaining: settings.shortBreakDuration * 60,
        pomodoroCount: newCount,
        currentSessionStart: null,
      });
    }
  } else {
    set({
      phase: "work",
      status: "idle",
      timeRemaining: settings.workDuration * 60,
      currentSessionStart: null,
    });
  }
}
