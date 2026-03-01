import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userAchievements } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { ACHIEVEMENT_MAP } from "@/lib/achievements";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(userAchievements)
    .where(and(
      eq(userAchievements.userId, session.user.id),
      isNull(userAchievements.notifiedAt)
    ));

  const pending = rows
    .map((row) => {
      const def = ACHIEVEMENT_MAP.get(row.achievementId);
      if (!def) return null;
      return {
        id: row.achievementId,
        name: def.name,
        emoji: def.emoji,
        tier: def.tier,
        toastCopy: def.toastCopy,
        unlockedAt: row.unlockedAt,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ pending });
}
