import { PomodoroSession, DailyAnalytics } from "./types";

// In-memory session store keyed by userId
const userSessions: Map<string, PomodoroSession[]> = new Map();

export function recordSession(session: PomodoroSession): void {
  const sessions = userSessions.get(session.userId) || [];
  sessions.push(session);
  userSessions.set(session.userId, sessions);
}

export function getUserSessions(userId: string): PomodoroSession[] {
  return userSessions.get(userId) || [];
}

export function getDailyAnalytics(userId: string, days: number = 7): DailyAnalytics[] {
  const sessions = getUserSessions(userId);
  const today = new Date();
  const analytics: DailyAnalytics[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const daySessions = sessions.filter((s) => s.date === dateStr && s.phase === "work");
    const completedSessions = daySessions.filter((s) => s.completed);
    const partialSessions = daySessions.filter((s) => !s.completed && s.completionPercentage > 0);

    const totalFocusMinutes = daySessions.reduce((sum, s) => sum + s.actualDuration / 60, 0);

    analytics.push({
      date: dateStr,
      totalPomodoros: daySessions.length,
      completedPomodoros: completedSessions.length,
      partialPomodoros: partialSessions.length,
      totalFocusMinutes: Math.round(totalFocusMinutes * 10) / 10,
      completionRate: daySessions.length > 0
        ? Math.round((completedSessions.reduce((sum, s) => sum + 1, 0) +
            partialSessions.reduce((sum, s) => sum + s.completionPercentage / 100, 0)) /
            daySessions.length * 100)
        : 0,
      sessions: daySessions,
    });
  }

  return analytics;
}
