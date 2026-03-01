import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userAchievements, friendships, users, userStats, pomodoroSessions } from "@/lib/db/schema";
import { eq, and, sql, count, desc } from "drizzle-orm";
import { ACHIEVEMENT_MAP } from "@/lib/achievements";
import { computeStreak } from "@/lib/achievement-checker";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId: targetUserId } = await params;
  const myId = session.user.id;

  // Allow viewing own profile
  if (targetUserId !== myId) {
    // Check friendship
    const [friendship] = await db
      .select()
      .from(friendships)
      .where(
        sql`(${friendships.userIdA} = ${myId} AND ${friendships.userIdB} = ${targetUserId})
         OR (${friendships.userIdA} = ${targetUserId} AND ${friendships.userIdB} = ${myId})`
      )
      .limit(1);

    if (!friendship) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const [targetUser] = await db.select({ name: users.name }).from(users).where(eq(users.id, targetUserId)).limit(1);
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const unlockedRows = await db
    .select()
    .from(userAchievements)
    .where(eq(userAchievements.userId, targetUserId))
    .orderBy(desc(userAchievements.unlockedAt));

  const [statsRow] = await db.select().from(userStats).where(eq(userStats.userId, targetUserId)).limit(1);
  const pinned: string[] = JSON.parse(statsRow?.pinnedAchievements ?? "[]");

  const [pomCount] = await db
    .select({ cnt: count() })
    .from(pomodoroSessions)
    .where(and(
      eq(pomodoroSessions.userId, targetUserId),
      eq(pomodoroSessions.phase, "work"),
      eq(pomodoroSessions.completed, true)
    ));
  const totalPomodoros = Number(pomCount?.cnt ?? 0);
  const currentStreak = await computeStreak(targetUserId);

  const unlocked = unlockedRows.map((row) => {
    const def = ACHIEVEMENT_MAP.get(row.achievementId);
    if (!def) return null;
    return {
      id: row.achievementId,
      name: def.name,
      emoji: def.emoji,
      tier: def.tier,
      category: def.category,
      unlockedAt: row.unlockedAt,
    };
  }).filter(Boolean);

  const byTier = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
  for (const a of unlocked) {
    if (a) byTier[a.tier as keyof typeof byTier]++;
  }

  return NextResponse.json({
    userId: targetUserId,
    userName: targetUser.name,
    unlocked,
    pinnedAchievements: pinned,
    summary: {
      total: unlocked.length,
      byTier,
      currentStreak,
      totalPomodoros,
    },
  });
}
