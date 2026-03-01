import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userAchievements, achievementProgress, pomodoroSessions } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { AchievementWithStatus, GetAchievementsResponse } from "@/lib/types";
import { computeStreak } from "@/lib/achievement-checker";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.emailVerified) {
    return NextResponse.json({ error: "email_verification_required" }, { status: 403 });
  }

  const userId = session.user.id;

  // Fetch user's unlocked achievements
  const unlockedRows = await db
    .select()
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));

  const unlockedMap = new Map(unlockedRows.map((r) => [r.achievementId, r]));

  // Fetch progress rows
  const progressRows = await db
    .select()
    .from(achievementProgress)
    .where(eq(achievementProgress.userId, userId));

  const progressMap = new Map(progressRows.map((r) => [r.achievementId, r.currentValue]));

  // Compute streak and total pomodoros for summary
  const [pomCount] = await db
    .select({ cnt: count() })
    .from(pomodoroSessions)
    .where(and(
      eq(pomodoroSessions.userId, userId),
      eq(pomodoroSessions.phase, "work"),
      eq(pomodoroSessions.completed, true)
    ));
  const totalPomodoros = Number(pomCount?.cnt ?? 0);
  const currentStreak = await computeStreak(userId);

  // Build enriched list
  const achievements: AchievementWithStatus[] = ACHIEVEMENTS.map((def) => {
    const unlockedRow = unlockedMap.get(def.id);
    const isUnlocked = !!unlockedRow;
    const isSecretLocked = def.isSecret && !isUnlocked;

    return {
      id: def.id,
      name: isSecretLocked ? "???" : def.name,
      emoji: isSecretLocked ? "🔒" : def.emoji,
      description: isSecretLocked ? null : def.description,
      hint: def.hint,
      category: def.category,
      tier: def.tier,
      isSecret: def.isSecret,
      progressType: def.progressType,
      progressTarget: def.progressTarget ?? null,
      unlocked: isUnlocked,
      unlockedAt: unlockedRow?.unlockedAt ?? null,
      currentProgress: def.progressType === "count" ? (progressMap.get(def.id) ?? 0) : null,
      retroactivelyAwarded: unlockedRow?.retroactive ?? false,
    };
  });

  // Compute summary
  const byTier = {
    bronze:   { total: 0, unlocked: 0 },
    silver:   { total: 0, unlocked: 0 },
    gold:     { total: 0, unlocked: 0 },
    platinum: { total: 0, unlocked: 0 },
  };
  for (const a of achievements) {
    byTier[a.tier].total++;
    if (a.unlocked) byTier[a.tier].unlocked++;
  }

  const response: GetAchievementsResponse = {
    achievements,
    summary: {
      total: ACHIEVEMENTS.length,
      unlocked: unlockedRows.length,
      byTier,
      currentStreak,
      totalPomodoros,
    },
  };

  return NextResponse.json(response);
}
