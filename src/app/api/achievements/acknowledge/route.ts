import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userAchievements } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { achievementIds } = body;

  if (!Array.isArray(achievementIds) || achievementIds.length === 0) {
    return NextResponse.json({ error: "achievementIds must be a non-empty array" }, { status: 400 });
  }
  if (achievementIds.length > 20) {
    return NextResponse.json({ error: "Maximum 20 achievement IDs per call" }, { status: 400 });
  }

  const now = new Date().toISOString();
  await db
    .update(userAchievements)
    .set({ notifiedAt: now })
    .where(and(
      eq(userAchievements.userId, session.user.id),
      inArray(userAchievements.achievementId, achievementIds)
    ));

  return NextResponse.json({ acknowledged: achievementIds.length });
}
