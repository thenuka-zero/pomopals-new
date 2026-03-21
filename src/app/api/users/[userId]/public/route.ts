import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, pomodoroSessions, userAchievements } from "@/lib/db/schema";
import { eq, and, gte, sql, count, sum } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, name: true, avatarUrl: true, createdAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const workFilter = and(
    eq(pomodoroSessions.userId, userId),
    eq(pomodoroSessions.phase, "work"),
    eq(pomodoroSessions.completed, true)
  );

  const [pomCount] = await db
    .select({ cnt: count() })
    .from(pomodoroSessions)
    .where(workFilter);

  const [focusSum] = await db
    .select({ total: sum(pomodoroSessions.actualDuration) })
    .from(pomodoroSessions)
    .where(workFilter);

  const [achCount] = await db
    .select({ cnt: count() })
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));

  // Last 14 days activity: group completed work sessions by date
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 13);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const activityRows = await db
    .select({
      date: pomodoroSessions.date,
      minutes: sql<number>`cast(sum(${pomodoroSessions.actualDuration}) / 60 as integer)`,
    })
    .from(pomodoroSessions)
    .where(
      and(
        eq(pomodoroSessions.userId, userId),
        eq(pomodoroSessions.phase, "work"),
        eq(pomodoroSessions.completed, true),
        gte(pomodoroSessions.date, cutoffStr)
      )
    )
    .groupBy(pomodoroSessions.date);

  // Build a full 14-day map (0 minutes for missing days)
  const activityMap = new Map(activityRows.map((r) => [r.date, r.minutes]));
  const recentActivity: { date: string; minutes: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    recentActivity.push({ date: dateStr, minutes: activityMap.get(dateStr) ?? 0 });
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl ?? null,
    memberSince: user.createdAt,
    totalPomodoros: Number(pomCount?.cnt ?? 0),
    totalFocusMinutes: Math.round(Number(focusSum?.total ?? 0) / 60),
    achievementCount: Number(achCount?.cnt ?? 0),
    recentActivity,
  });
}
