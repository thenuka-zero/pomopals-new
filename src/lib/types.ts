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
  notificationSound: "none" | "bell" | "digital"; // NEW — default "none"
  autoStartBreaks: boolean; // auto-start breaks and work phases — default true
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

// ─── Friend Relationships ─────────────────────────────────────────────────────

export type FriendRequestStatus = "pending" | "accepted" | "rejected" | "cancelled";
export type RoomJoinRequestStatus = "pending" | "approved" | "denied" | "expired" | "cancelled";

export interface FriendRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  recipientId: string;
  recipientName: string;
  status: FriendRequestStatus;
  createdAt: string;
  respondedAt: string | null;
}

export interface Friend {
  userId: string;
  name: string;
  email: string;
  friendsSince: string; // ISO 8601 (createdAt of friendship row)
}

// ─── Presence ────────────────────────────────────────────────────────────────

export interface FriendPresence {
  userId: string;
  name: string;
  isActive: boolean;
  roomId: string | null;
  roomName: string | null;
  phase: TimerPhase | null;
  startedAt: string | null;
}

// ─── Room Join Requests ───────────────────────────────────────────────────────

export interface RoomJoinRequest {
  id: string;
  roomId: string;
  requesterId: string;
  requesterName: string;
  hostId: string;
  status: RoomJoinRequestStatus;
  createdAt: string;
  respondedAt: string | null;
  expiresAt: string;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface UserSettings {
  broadcastEnabled: boolean;
  intentionsEnabled: boolean;
}

// ── Intentions ──────────────────────────────────────────────────────────────

export type IntentionStatus = "pending" | "completed" | "not_completed" | "skipped";

export interface Intention {
  id: string;
  userId: string;
  sessionId: string | null;
  text: string;
  status: IntentionStatus;
  note: string | null;
  startedAt: string;       // ISO 8601
  reflectedAt: string | null;
  date: string;            // YYYY-MM-DD
  createdAt: string;
}

export interface CreateIntentionPayload {
  id: string;              // client-generated UUID
  text: string;
  startedAt: string;       // ISO 8601
  date: string;            // YYYY-MM-DD
}

export interface ReflectIntentionPayload {
  status: "completed" | "not_completed";
  sessionId?: string;
  note?: string;
  reflectedAt: string;     // ISO 8601
}

export interface IntentionJournalEntry extends Intention {}

export interface DailyIntentionStat {
  date: string;            // YYYY-MM-DD
  total: number;
  completed: number;
  completionRate: number;
}

export interface IntentionTrends {
  totalIntentions: number;
  completedCount: number;
  notCompletedCount: number;
  skippedCount: number;
  completionRate: number;
  currentStreak: number;   // consecutive days with >= 1 reflected intention
  longestStreak: number;
  last30Days: DailyIntentionStat[];
}

// ─── Achievements ─────────────────────────────────────────────────────────────

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type AchievementCategory = 'solo' | 'social' | 'consistency' | 'easter_egg';
export type AchievementProgressType = 'binary' | 'count';

export interface AchievementDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
  hint: string;
  category: AchievementCategory;
  tier: AchievementTier;
  isSecret: boolean;
  progressType: AchievementProgressType;
  progressTarget?: number;
  toastCopy: string;
}

export interface AchievementWithStatus {
  id: string;
  name: string;           // "???" if isSecret && !unlocked
  emoji: string;          // "🔒" if isSecret && !unlocked
  description: string | null;  // null if isSecret && !unlocked
  hint: string;
  category: AchievementCategory;
  tier: AchievementTier;
  isSecret: boolean;
  progressType: AchievementProgressType;
  progressTarget: number | null;
  unlocked: boolean;
  unlockedAt: string | null;
  currentProgress: number | null;
  retroactivelyAwarded: boolean;
}

export interface PendingAchievement {
  id: string;
  name: string;
  emoji: string;
  tier: AchievementTier;
  toastCopy: string;
  unlockedAt: string;
}

export interface AchievementsSummary {
  total: number;
  unlocked: number;
  byTier: {
    bronze:   { total: number; unlocked: number };
    silver:   { total: number; unlocked: number };
    gold:     { total: number; unlocked: number };
    platinum: { total: number; unlocked: number };
  };
  currentStreak: number;
  totalPomodoros: number;
}

export interface GetAchievementsResponse {
  achievements: AchievementWithStatus[];
  summary: AchievementsSummary;
}

export interface GetPendingAchievementsResponse {
  pending: PendingAchievement[];
}
