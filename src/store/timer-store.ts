"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { TimerSettings, TimerPhase, TimerStatus, PomodoroSession, TaskItem } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

export const MIN_PROMPT_ELAPSED_SECONDS = 60;

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
  sessionRunId: string; // unique ID per "sitting" — resets when reset() is called
  currentSessionStart: number | null; // Date.now() timestamp
  sessions: PomodoroSession[];

  // Notification state
  lastTransitionType: "completed" | "skipped" | "reset" | null;
  hydratedAsExpired: boolean;
  isRemoteTransition: boolean;

  // Task list state
  taskList: TaskItem[];              // solo timer tasks (persisted)
  sessionGroupId: string | null;     // persisted
  roomTaskList: TaskItem[];          // room tasks (NOT persisted)
  roomSessionGroupId: string | null; // NOT persisted

  // Reflection state
  pendingReflection: boolean;
  lastCompletedSessionId: string | null;

  // Room context for session recording
  roomId: string | null;
  roomParticipantCount: number | null;

  // Interrupt prompt state
  pendingInterruptPrompt: { session: PomodoroSession; action: "skip" | "reset"; sessionGroupId: string | null } | null;
  resolveInterruptPrompt: (count: boolean) => void;

  // Actions
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: (opts?: { deferAnalytics?: boolean; deferredSession?: PomodoroSession; sessionGroupId?: string | null }) => void;
  skip: (opts?: { deferAnalytics?: boolean; deferredSession?: PomodoroSession; sessionGroupId?: string | null }) => void;
  completeEarly: () => void;
  tick: () => void;

  // Task list actions
  addTask: (text: string) => void;
  addRoomTask: (text: string) => void;
  updateTaskStatus: (id: string, status: TaskItem["status"]) => void;
  updateRoomTaskStatus: (id: string, status: TaskItem["status"]) => void;
  updateTaskText: (id: string, text: string) => void;
  updateRoomTaskText: (id: string, text: string) => void;
  removeTask: (id: string) => void;
  removeRoomTask: (id: string) => void;
  clearTaskList: () => void;
  clearRoomTaskList: () => void;
  setSessionGroupId: (id: string | null) => void;
  setRoomSessionGroupId: (id: string | null) => void;
  setPendingReflection: (value: boolean) => void;

  // Room context
  setRoomContext: (roomId: string | null, participantCount: number | null) => void;

  // For synced room mode
  syncState: (phase: TimerPhase, status: TimerStatus, timeRemaining: number, pomodoroCount: number) => void;
}

const DEFAULT_SETTINGS: TimerSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  notificationSound: "bell",
  autoStartBreaks: false,
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
      sessionRunId: uuidv4(),
      currentSessionStart: null,
      sessions: [],
      lastTransitionType: null,
      hydratedAsExpired: false,
      isRemoteTransition: false,
      taskList: [],
      sessionGroupId: null,
      roomTaskList: [],
      roomSessionGroupId: null,
      pendingReflection: false,
      lastCompletedSessionId: null,
      roomId: null,
      roomParticipantCount: null,
      pendingInterruptPrompt: null,

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
        const state = get();
        const updates: Partial<TimerState> = {
          status: "running",
          startedAt: now,
          elapsed: 0,
          currentSessionStart: now,
        };
        // Generate sessionGroupId if we have tasks and haven't started a group yet
        if (state.taskList.length > 0 && !state.sessionGroupId) {
          updates.sessionGroupId = crypto.randomUUID();
        }
        // Mark all pending tasks as in_progress when work session starts
        if (state.phase === "work" && state.taskList.length > 0) {
          updates.taskList = state.taskList.map((t) =>
            t.status === "pending" ? { ...t, status: "in_progress" as const } : t
          );
        }
        set(updates);
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

      reset: (opts) => {
        const state = get();
        const { settings } = state;
        // Restore in_progress tasks back to pending on reset
        const resetTaskList = state.taskList.map((t) =>
          t.status === "in_progress" ? { ...t, status: "pending" as const } : t
        );
        if (opts?.deferAnalytics && opts.deferredSession) {
          set({
            phase: "work",
            status: "idle",
            timeRemaining: settings.workDuration * 60,
            pomodoroCount: 0,
            startedAt: null,
            elapsed: 0,
            sessionRunId: uuidv4(),
            currentSessionStart: null,
            lastTransitionType: "reset",
            isRemoteTransition: false,
            taskList: resetTaskList,
            sessionGroupId: null,
            pendingInterruptPrompt: {
              session: opts.deferredSession,
              action: "reset",
              sessionGroupId: opts.sessionGroupId ?? null,
            },
          });
        } else {
          set({
            phase: "work",
            status: "idle",
            timeRemaining: settings.workDuration * 60,
            pomodoroCount: 0,
            startedAt: null,
            elapsed: 0,
            sessionRunId: uuidv4(),
            currentSessionStart: null,
            lastTransitionType: "reset",
            isRemoteTransition: false,
            taskList: resetTaskList,
            sessionGroupId: null,
          });
        }
      },

      skip: (opts) => {
        const state = get();
        if (opts?.deferAnalytics && opts.deferredSession) {
          set({
            lastTransitionType: "skipped",
            isRemoteTransition: false,
            pendingInterruptPrompt: {
              session: opts.deferredSession,
              action: "skip",
              sessionGroupId: opts.sessionGroupId ?? null,
            },
          });
          transitionPhase(state, set, "skipped");
        } else {
          recordSessionIfNeeded(state, set);
          set({ lastTransitionType: "skipped", isRemoteTransition: false });
          transitionPhase(state, set, "skipped");
        }
      },

      completeEarly: () => {
        const state = get();
        if (state.phase !== "work") return;
        let completedSessionId: string | null = null;
        if (state.currentSessionStart) {
          const totalDuration = getDurationForPhase(state.phase, state.settings) * 60;
          const elapsed = totalDuration - state.timeRemaining;
          if (elapsed > 0) {
            const session: PomodoroSession = {
              id: uuidv4(),
              userId: "",
              startedAt: new Date(state.currentSessionStart).toISOString(),
              endedAt: new Date().toISOString(),
              phase: state.phase,
              plannedDuration: totalDuration,
              actualDuration: elapsed,
              completed: true,
              completionPercentage: 100,
              date: new Date().toISOString().split("T")[0],
            };
            completedSessionId = session.id;
            set((s) => ({ sessions: [...s.sessions, session] }));
          }
        }
        // Mark in_progress tasks as done on early completion
        const updatedTaskList = state.taskList.map((t) =>
          t.status === "in_progress" ? { ...t, status: "done" as const } : t
        );
        set({
          lastTransitionType: "completed",
          isRemoteTransition: false,
          pendingReflection: true,
          lastCompletedSessionId: completedSessionId,
          taskList: updatedTaskList,
        });
        transitionPhase(state, set);
      },

      tick: () => {
        const state = get();
        if (state.status !== "running") return;

        const newTime = computeTimeRemaining(
          state.phase, state.settings, state.status, state.startedAt, state.elapsed,
        );

        if (newTime <= 0) {
          const totalDuration = getDurationForPhase(state.phase, state.settings) * 60;
          let completedSessionId: string | null = null;
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
            completedSessionId = session.id;
            set((s) => ({ sessions: [...s.sessions, session] }));
          }
          set({ lastTransitionType: "completed", isRemoteTransition: false });
          // When a work phase completes naturally, mark in_progress tasks as done
          if (state.phase === "work") {
            const updatedTaskList = state.taskList.map((t) =>
              t.status === "in_progress" ? { ...t, status: "done" as const } : t
            );
            set({
              pendingReflection: true,
              lastCompletedSessionId: completedSessionId,
              taskList: updatedTaskList,
            });
          }
          transitionPhase(state, set);
        } else {
          set({ timeRemaining: newTime });
        }
      },

      resolveInterruptPrompt: (count) => {
        const state = get();
        if (!state.pendingInterruptPrompt) return;
        if (count) {
          const session = state.pendingInterruptPrompt.session;
          set((s) => ({ sessions: [...s.sessions, session], pendingInterruptPrompt: null }));
        } else {
          set({ pendingInterruptPrompt: null });
        }
      },

      syncState: (phase, status, timeRemaining, pomodoroCount) => {
        skipBroadcast = true;
        set({ phase, status, timeRemaining, pomodoroCount, isRemoteTransition: true });
        skipBroadcast = false;
      },

      // Task list actions
      addTask: (text) => {
        set((s) => ({
          taskList: [...s.taskList, { id: crypto.randomUUID(), text, status: "pending" }],
        }));
      },
      addRoomTask: (text) => {
        set((s) => ({
          roomTaskList: [...s.roomTaskList, { id: crypto.randomUUID(), text, status: "pending" }],
        }));
      },
      updateTaskStatus: (id, status) => {
        set((s) => ({
          taskList: s.taskList.map((t) => (t.id === id ? { ...t, status } : t)),
        }));
      },
      updateRoomTaskStatus: (id, status) => {
        set((s) => ({
          roomTaskList: s.roomTaskList.map((t) => (t.id === id ? { ...t, status } : t)),
        }));
      },
      updateTaskText: (id, text) => {
        set((s) => ({
          taskList: s.taskList.map((t) => (t.id === id ? { ...t, text } : t)),
        }));
      },
      updateRoomTaskText: (id, text) => {
        set((s) => ({
          roomTaskList: s.roomTaskList.map((t) => (t.id === id ? { ...t, text } : t)),
        }));
      },
      removeTask: (id) => {
        set((s) => ({ taskList: s.taskList.filter((t) => t.id !== id) }));
      },
      removeRoomTask: (id) => {
        set((s) => ({ roomTaskList: s.roomTaskList.filter((t) => t.id !== id) }));
      },
      clearTaskList: () => set({ taskList: [], sessionGroupId: null }),
      clearRoomTaskList: () => set({ roomTaskList: [], roomSessionGroupId: null }),
      setSessionGroupId: (id) => set({ sessionGroupId: id }),
      setRoomSessionGroupId: (id) => set({ roomSessionGroupId: id }),
      setPendingReflection: (value) => set({ pendingReflection: value }),
      setRoomContext: (roomId, participantCount) => set({ roomId, roomParticipantCount: participantCount }),
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
        taskList: state.taskList,
        sessionGroupId: state.sessionGroupId,
        pendingReflection: state.pendingReflection,
        lastCompletedSessionId: state.lastCompletedSessionId,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Reset in_progress tasks to pending on page reload
        if (state.taskList?.some((t) => t.status === "in_progress")) {
          useTimerStore.setState({
            taskList: state.taskList.map((t) =>
              t.status === "in_progress" ? { ...t, status: "pending" as const } : t
            ),
          });
        }
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
                hydratedAsExpired: true,
              });
            } else {
              useTimerStore.setState({
                phase: "work",
                status: "idle",
                startedAt: null,
                elapsed: 0,
                timeRemaining: settings.workDuration * 60,
                currentSessionStart: null,
                hydratedAsExpired: true,
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
        state.settings !== prevState.settings ||
        state.lastTransitionType !== prevState.lastTransitionType
      ) {
        channel.postMessage({
          phase: state.phase,
          status: state.status,
          startedAt: state.startedAt,
          elapsed: state.elapsed,
          pomodoroCount: state.pomodoroCount,
          settings: state.settings,
          lastTransitionType: state.lastTransitionType,
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
        lastTransitionType: data.lastTransitionType ?? null,
        isRemoteTransition: true,
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
  transitionType?: string,
) {
  const { phase, pomodoroCount, settings } = state;
  const autoStart = settings.autoStartBreaks;
  const now = autoStart ? Date.now() : null;

  if (phase === "work") {
    const newCount = transitionType === "skipped" ? pomodoroCount : pomodoroCount + 1;
    if (newCount % settings.longBreakInterval === 0) {
      set({
        phase: "longBreak",
        status: autoStart ? "running" : "idle",
        timeRemaining: settings.longBreakDuration * 60,
        pomodoroCount: newCount,
        currentSessionStart: null,
        startedAt: now,
        elapsed: 0,
      });
    } else {
      set({
        phase: "shortBreak",
        status: autoStart ? "running" : "idle",
        timeRemaining: settings.shortBreakDuration * 60,
        pomodoroCount: newCount,
        currentSessionStart: null,
        startedAt: now,
        elapsed: 0,
      });
    }
  } else {
    set({
      phase: "work",
      status: autoStart ? "running" : "idle",
      timeRemaining: settings.workDuration * 60,
      currentSessionStart: autoStart ? Date.now() : null,
      startedAt: now,
      elapsed: 0,
    });
  }
}
