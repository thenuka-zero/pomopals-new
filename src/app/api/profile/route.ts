import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, pomodoroSessions, friendships, userAchievements } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";
import type { ProfileData } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/profile — fetch current user's profile + quick stats
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const [pomoResult] = await db
    .select({ cnt: count() })
    .from(pomodoroSessions)
    .where(and(eq(pomodoroSessions.userId, userId), eq(pomodoroSessions.completed, true)));

  const [friendsA] = await db.select({ cnt: count() }).from(friendships).where(eq(friendships.userIdA, userId));
  const [friendsB] = await db.select({ cnt: count() }).from(friendships).where(eq(friendships.userIdB, userId));

  const [achResult] = await db
    .select({ cnt: count() })
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));

  const profile: ProfileData = {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    allowFriendRequests: user.allowFriendRequests ?? true,
    emailVerified: user.emailVerified,
    pendingEmail: user.pendingEmail ?? null,
    createdAt: user.createdAt,
    isOAuthOnly: user.passwordHash === "",
    totalPomodoros: pomoResult?.cnt ?? 0,
    totalFriends: (friendsA?.cnt ?? 0) + (friendsB?.cnt ?? 0),
    achievementsUnlocked: achResult?.cnt ?? 0,
  };

  return NextResponse.json({ profile });
}

// PATCH /api/profile — update name, avatarUrl, allowFriendRequests
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await request.json().catch(() => ({}));
  const { name, avatarUrl, allowFriendRequests } = body;

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (!trimmed || trimmed.length > 100) {
      return NextResponse.json({ error: "Name must be 1–100 characters" }, { status: 400 });
    }
    updates.name = trimmed;
  }

  if (avatarUrl !== undefined) {
    if (avatarUrl === null) {
      updates.avatarUrl = null;
    } else {
      const urlStr = String(avatarUrl);
      if (!urlStr.startsWith("data:image/") && !urlStr.startsWith("https://")) {
        return NextResponse.json({ error: "Invalid avatar URL" }, { status: 400 });
      }
      if (urlStr.length > 220_000) {
        return NextResponse.json({ error: "Image is too large" }, { status: 400 });
      }
      updates.avatarUrl = urlStr;
    }
  }

  if (allowFriendRequests !== undefined) {
    updates.allowFriendRequests = Boolean(allowFriendRequests);
  }

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  await db.update(users).set(updates).where(eq(users.id, userId));

  return NextResponse.json({ success: true });
}

// DELETE /api/profile — delete account
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await request.json().catch(() => ({}));
  const { confirmEmail } = body;

  if (!confirmEmail || confirmEmail.toLowerCase().trim() !== session.user.email.toLowerCase()) {
    return NextResponse.json({ error: "Email confirmation does not match" }, { status: 400 });
  }

  await db.delete(users).where(eq(users.id, userId));

  return NextResponse.json({ success: true });
}
