import { db } from "@/lib/db";
import { users, pomodoroSessions, userAchievements } from "@/lib/db/schema";
import { eq, and, gte, sql, count, sum } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PublicProfilePageContent from "@/components/PublicProfilePageContent";

type Props = { params: Promise<{ userId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId } = await params;
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { name: true },
  });
  if (!user) return { title: "User Not Found | PomoPals" };
  return { title: `${user.name} | PomoPals` };
}

export default async function PublicProfilePage({ params }: Props) {
  const { userId } = await params;

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, name: true, avatarUrl: true, createdAt: true },
  });

  if (!user) notFound();

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

  const activityMap = new Map(activityRows.map((r) => [r.date, r.minutes]));
  const recentActivity: { date: string; minutes: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    recentActivity.push({ date: dateStr, minutes: activityMap.get(dateStr) ?? 0 });
  }

  const profile = {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl ?? null,
    memberSince: user.createdAt,
    totalPomodoros: Number(pomCount?.cnt ?? 0),
    totalFocusMinutes: Math.round(Number(focusSum?.total ?? 0) / 60),
    achievementCount: Number(achCount?.cnt ?? 0),
    recentActivity,
  };

  return (
    <div className="min-h-screen bg-[#FDF6EC]">
      <PublicProfilePageContent profile={profile} />
    </div>
  );
}
