import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, friendships } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { Friend } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/friends
// Auth: Required
// Returns: { friends: Friend[] }
export async function GET(_request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const myId = session.user.id;

  // Get all friendships where I am either userIdA or userIdB
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
    return NextResponse.json({ friends: [] });
  }

  // Gather all friend IDs
  const friendIds = myFriendships.map((f) =>
    f.userIdA === myId ? f.userIdB : f.userIdA
  );

  // Fetch user details for all friends
  const friendCreatedAtMap = new Map<string, string>();
  for (const f of myFriendships) {
    const friendId = f.userIdA === myId ? f.userIdB : f.userIdA;
    friendCreatedAtMap.set(friendId, f.createdAt);
  }

  const friendUsers = await Promise.all(
    friendIds.map((id) =>
      db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, id))
        .limit(1)
        .then((rows) => rows[0] ?? null)
    )
  );

  const friends: Friend[] = friendUsers
    .filter((u) => u !== null)
    .map((u) => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      friendsSince: friendCreatedAtMap.get(u.id) ?? "",
    }));

  return NextResponse.json({ friends });
}
