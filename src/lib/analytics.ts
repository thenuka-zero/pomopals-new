import { PomodoroSession, DailyAnalytics, PeriodAnalytics, AnalyticsPeriod } from "./types";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, subWeeks, subMonths } from "date-fns";
import { eq, and, gte, lte } from "drizzle-orm";
import { db } from "./db";
import { pomodoroSessions } from "./db/schema";

export async function recordSession(session: PomodoroSession): Promise<void> {
  await db.insert(pomodoroSessions).values({
    id: session.id,
    userId: session.userId,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    phase: session.phase,
    plannedDuration: session.plannedDuration,
    actualDuration: session.actualDuration,
    completed: session.completed,
    completionPercentage: session.completionPercentage,
    date: session.date,
  });
}

export async function getUserSessions(userId: string): Promise<PomodoroSession[]> {
  const rows = await db.select().from(pomodoroSessions)
    .where(eq(pomodoroSessions.userId, userId));

  return rows.map(rowToSession);
}

/**
 * Convert a DB row to a PomodoroSession interface.
 */
function rowToSession(row: typeof pomodoroSessions.$inferSelect): PomodoroSession {
  return {
    id: row.id,
    userId: row.userId,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    phase: row.phase as PomodoroSession["phase"],
    plannedDuration: row.plannedDuration,
    actualDuration: row.actualDuration,
    completed: row.completed,
    completionPercentage: row.completionPercentage,
    date: row.date,
  };
}

/**
 * Compute analytics for a set of work sessions.
 */
function computeAnalytics(workSessions: PomodoroSession[]) {
  const completedSessions = workSessions.filter((s) => s.completed);
  const partialSessions = workSessions.filter((s) => !s.completed && s.completionPercentage > 0);
  const totalFocusMinutes = workSessions.reduce((sum, s) => sum + s.actualDuration / 60, 0);

  const completionRate =
    workSessions.length > 0
      ? Math.round(
          ((completedSessions.length +
            partialSessions.reduce((sum, s) => sum + s.completionPercentage / 100, 0)) /
            workSessions.length) *
            100
        )
      : 0;

  return {
    totalPomodoros: workSessions.length,
    completedPomodoros: completedSessions.length,
    partialPomodoros: partialSessions.length,
    totalFocusMinutes: Math.round(totalFocusMinutes * 10) / 10,
    completionRate,
  };
}

/**
 * Get daily analytics for a user over the last N days.
 */
export async function getDailyAnalytics(userId: string, days: number = 7): Promise<DailyAnalytics[]> {
  const today = new Date();
  const analytics: DailyAnalytics[] = [];

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (days - 1));
  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = today.toISOString().split("T")[0];

  const rows = await db.select().from(pomodoroSessions)
    .where(and(
      eq(pomodoroSessions.userId, userId),
      gte(pomodoroSessions.date, startDateStr),
      lte(pomodoroSessions.date, endDateStr)
    ));
  const allSessions = rows.map(rowToSession);

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const daySessions = allSessions.filter((s) => s.date === dateStr && s.phase === "work");
    const stats = computeAnalytics(daySessions);

    analytics.push({
      date: dateStr,
      ...stats,
      sessions: daySessions,
    });
  }

  return analytics;
}

/**
 * Get analytics grouped by period (day, week, or month).
 */
export async function getAnalyticsByPeriod(
  userId: string,
  period: AnalyticsPeriod,
  count: number = 7
): Promise<PeriodAnalytics[]> {
  if (period === "day") {
    const daily = await getDailyAnalytics(userId, count);
    return daily.map((d) => ({
      periodStart: d.date,
      periodEnd: d.date,
      period: "day" as const,
      totalPomodoros: d.totalPomodoros,
      completedPomodoros: d.completedPomodoros,
      partialPomodoros: d.partialPomodoros,
      totalFocusMinutes: d.totalFocusMinutes,
      completionRate: d.completionRate,
      sessions: d.sessions,
    }));
  }

  const today = new Date();
  const analytics: PeriodAnalytics[] = [];

  if (period === "week") {
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const earliestWeekStart = subWeeks(currentWeekStart, count - 1);
    const latestWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

    const rows = await db.select().from(pomodoroSessions)
      .where(and(
        eq(pomodoroSessions.userId, userId),
        gte(pomodoroSessions.date, format(earliestWeekStart, "yyyy-MM-dd")),
        lte(pomodoroSessions.date, format(latestWeekEnd, "yyyy-MM-dd"))
      ));
    const allSessions = rows.map(rowToSession);

    for (let i = count - 1; i >= 0; i--) {
      const weekStart = subWeeks(currentWeekStart, i);
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const startStr = format(weekStart, "yyyy-MM-dd");
      const endStr = format(weekEnd, "yyyy-MM-dd");

      const weekSessions = allSessions.filter((s) => {
        return s.phase === "work" && s.date >= startStr && s.date <= endStr;
      });
      const stats = computeAnalytics(weekSessions);

      analytics.push({
        periodStart: startStr,
        periodEnd: endStr,
        period: "week",
        ...stats,
        sessions: weekSessions,
      });
    }
  } else if (period === "month") {
    const currentMonthStart = startOfMonth(today);
    const earliestMonthStart = subMonths(currentMonthStart, count - 1);
    const latestMonthEnd = endOfMonth(currentMonthStart);

    const rows = await db.select().from(pomodoroSessions)
      .where(and(
        eq(pomodoroSessions.userId, userId),
        gte(pomodoroSessions.date, format(earliestMonthStart, "yyyy-MM-dd")),
        lte(pomodoroSessions.date, format(latestMonthEnd, "yyyy-MM-dd"))
      ));
    const allSessions = rows.map(rowToSession);

    for (let i = count - 1; i >= 0; i--) {
      const monthStart = subMonths(currentMonthStart, i);
      const monthEnd = endOfMonth(monthStart);
      const startStr = format(monthStart, "yyyy-MM-dd");
      const endStr = format(monthEnd, "yyyy-MM-dd");

      const monthSessions = allSessions.filter((s) => {
        return s.phase === "work" && s.date >= startStr && s.date <= endStr;
      });
      const stats = computeAnalytics(monthSessions);

      analytics.push({
        periodStart: startStr,
        periodEnd: endStr,
        period: "month",
        ...stats,
        sessions: monthSessions,
      });
    }
  }

  return analytics;
}
