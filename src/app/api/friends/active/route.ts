import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, friendships, userPresence } from "@/lib/db/schema";
import { and, eq, lt, or } from "drizzle-orm";
import { FriendPresence, TimerPhase } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/friends/active
// Auth: Required + emailVerified
// Returns: { activeFriends: FriendPresence[] }
export async function GET(_request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.emailVerified) {
    return NextResponse.json(
      { error: "Email verification required" },
      { status: 403 }
    );
  }

  const myId = session.user.id;
  const now = new Date().toISOString();

  // Get all friend IDs
  const myFriendships = await db
    .select()
    .from(friendships)
    .where(
      or(
        eq(friendships.userIdA, myId),
        eq(friendships.userIdB, myId)
      )
    );

  if (myFriendships.length === 0) {
    return NextResponse.json({ activeFriends: [] });
  }

  const friendIds = myFriendships.map((f) =>
    f.userIdA === myId ? f.userIdB : f.userIdA
  );

  // Lazily clean up stale presence rows for friends
  // We update isActive = 0 for expired rows
  for (const friendId of friendIds) {
    await db
      .update(userPresence)
      .set({ isActive: 0 })
      .where(
        and(
          eq(userPresence.userId, friendId),
          lt(userPresence.expiresAt, now)
        )
      );
  }

  // Fetch active, broadcasting, non-expired, work-phase presence rows for friends
  const activeFriends: FriendPresence[] = [];

  for (const friendId of friendIds) {
    const [presence] = await db
      .select({
        userId: userPresence.userId,
        isActive: userPresence.isActive,
        roomId: userPresence.roomId,
        roomName: userPresence.roomName,
        phase: userPresence.phase,
        startedAt: userPresence.startedAt,
        broadcastEnabled: userPresence.broadcastEnabled,
        expiresAt: userPresence.expiresAt,
        name: users.name,
      })
      .from(userPresence)
      .innerJoin(users, eq(userPresence.userId, users.id))
      .where(
        and(
          eq(userPresence.userId, friendId),
          eq(userPresence.isActive, 1),
          eq(userPresence.broadcastEnabled, 1),
          eq(userPresence.phase, "work")
        )
      )
      .limit(1);

    if (presence && presence.expiresAt > now) {
      activeFriends.push({
        userId: presence.userId,
        name: presence.name,
        isActive: presence.isActive === 1,
        roomId: presence.roomId ?? null,
        roomName: presence.roomName ?? null,
        phase: (presence.phase as TimerPhase) ?? null,
        startedAt: presence.startedAt ?? null,
      });
    }
  }

  return NextResponse.json({ activeFriends });
}
