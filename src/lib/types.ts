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

export interface Room {
  id: string;
  name: string;
  hostId: string;
  hostName: string;
  createdAt: string;
  settings: TimerSettings;
  timerState: {
    phase: TimerPhase;
    status: TimerStatus;
    timeRemaining: number; // in seconds
    pomodoroCount: number;
  };
  participants: Participant[];
}

export interface Participant {
  id: string;
  name: string;
  joinedAt: string;
}
