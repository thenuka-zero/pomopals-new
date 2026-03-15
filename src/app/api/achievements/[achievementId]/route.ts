import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userAchievements, achievementProgress } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// DELETE /api/achievements/[achievementId]
// Resets an achievement for the current user (removes unlock + resets progress)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ achievementId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.emailVerified) {
    return NextResponse.json({ error: "Email verification required" }, { status: 403 });
  }

  const userId = session.user.id;
  const { achievementId } = await params;

  await db
    .delete(userAchievements)
    .where(and(eq(userAchievements.userId, userId), eq(userAchievements.achievementId, achievementId)));

  await db
    .update(achievementProgress)
    .set({ currentValue: 0 })
    .where(and(eq(achievementProgress.userId, userId), eq(achievementProgress.achievementId, achievementId)));

  return NextResponse.json({ success: true });
}
