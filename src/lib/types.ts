export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export type AnalyticsPeriod = "day" | "week" | "month";

export interface TimerSettings {
  workDuration: number; // in minutes
  shortBreakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  longBreakInterval: number; // after how many pomodoros
}

export type TimerPhase = "work" | "shortBreak" | "longBreak";

export type TimerStatus = "idle" | "running" | "paused";

export interface PomodoroSession {
  id: string;
  userId: string;
  startedAt: string;
  endedAt: string | null;
  phase: TimerPhase;
  plannedDuration: number; // in seconds
  actualDuration: number; // in seconds
  completed: boolean; // did it run to full completion?
  completionPercentage: number; // 0-100, for partial tracking
  date: string; // YYYY-MM-DD for grouping
}

export interface DailyAnalytics {
  date: string;
  totalPomodoros: number;
  completedPomodoros: number;
  partialPomodoros: number;
  totalFocusMinutes: number;
  completionRate: number; // percentage
  sessions: PomodoroSession[];
}

export interface PeriodAnalytics {
  periodStart: string; // YYYY-MM-DD start of the period
  periodEnd: string; // YYYY-MM-DD end of the period
  period: AnalyticsPeriod;
  totalPomodoros: number;
  completedPomodoros: number;
  partialPomodoros: number;
  totalFocusMinutes: number;
  completionRate: number; // percentage
  sessions: PomodoroSession[];
}

export interface RoomTimerState {
  phase: TimerPhase;
  status: TimerStatus;
  duration: number; // total seconds for current phase
  startedAt: string | null; // ISO timestamp when timer was last started/resumed
  elapsed: number; // seconds elapsed before the last pause
  pomodoroCount: number;
}

export interface Room {
  id: string;
  name: string;
  hostId: string;
  hostName: string;
  createdAt: string;
  lastActivityAt: string; // ISO 8601, for inactivity cleanup
  settings: TimerSettings;
  timerState: RoomTimerState;
  participants: Participant[];
}

/** Shape returned to clients -- includes computed timeRemaining for backward compat */
export interface RoomResponse {
  id: string;
  name: string;
  hostId: string;
  hostName: string;
  createdAt: string;
  lastActivityAt: string;
  settings: TimerSettings;
  timerState: {
    phase: TimerPhase;
    status: TimerStatus;
    timeRemaining: number; // computed on each request
    pomodoroCount: number;
  };
  participants: Participant[];
}

export interface Participant {
  id: string;
  name: string;
  joinedAt: string;
}
