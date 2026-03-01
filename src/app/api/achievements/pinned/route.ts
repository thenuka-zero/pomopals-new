import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userStats, userAchievements } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.emailVerified) {
    return NextResponse.json({ error: "email_verification_required" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { pinnedAchievementIds } = body;

  if (!Array.isArray(pinnedAchievementIds)) {
    return NextResponse.json({ error: "pinnedAchievementIds must be an array" }, { status: 400 });
  }
  if (pinnedAchievementIds.length > 3) {
    return NextResponse.json({ error: "Maximum 3 pinned achievements" }, { status: 400 });
  }

  // Verify all IDs are unlocked by this user
  if (pinnedAchievementIds.length > 0) {
    const unlocked = await db
      .select({ achievementId: userAchievements.achievementId })
      .from(userAchievements)
      .where(and(
        eq(userAchievements.userId, session.user.id),
        inArray(userAchievements.achievementId, pinnedAchievementIds)
      ));

    const unlockedSet = new Set(unlocked.map((r) => r.achievementId));
    for (const id of pinnedAchievementIds) {
      if (!unlockedSet.has(id)) {
        return NextResponse.json({ error: `Achievement '${id}' not unlocked by this user` }, { status: 400 });
      }
    }
  }

  const now = new Date().toISOString();
  await db
    .insert(userStats)
    .values({
      userId: session.user.id,
      pinnedAchievements: JSON.stringify(pinnedAchievementIds),
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userStats.userId,
      set: { pinnedAchievements: JSON.stringify(pinnedAchievementIds), updatedAt: now },
    });

  return NextResponse.json({ pinnedAchievementIds });
}
