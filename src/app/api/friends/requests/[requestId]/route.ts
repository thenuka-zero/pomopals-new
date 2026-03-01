import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, friendships, friendRequests } from "@/lib/db/schema";
import { and, eq, count, sql as sqlExpr } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { FriendRequest } from "@/lib/types";
import { checkAchievements } from "@/lib/achievement-checker";

export const dynamic = "force-dynamic";

function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

// PATCH /api/friends/requests/[requestId]
// Body: { action: "accept" | "reject" }
// Auth: Required + emailVerified
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
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

  const { requestId } = await params;
  const myId = session.user.id;

  const [friendRequest] = await db
    .select()
    .from(friendRequests)
    .where(eq(friendRequests.id, requestId))
    .limit(1);

  if (!friendRequest) {
    return NextResponse.json({ error: "Friend request not found" }, { status: 404 });
  }

  if (friendRequest.recipientId !== myId) {
    return NextResponse.json(
      { error: "Only the recipient can accept or reject this request" },
      { status: 403 }
    );
  }

  if (friendRequest.status !== "pending") {
    return NextResponse.json(
      { error: "Friend request is not in pending state" },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { action } = body;

  if (action !== "accept" && action !== "reject") {
    return NextResponse.json(
      { error: "action must be 'accept' or 'reject'" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  if (action === "accept") {
    const [updatedRequest] = await db
      .update(friendRequests)
      .set({ status: "accepted", respondedAt: now })
      .where(eq(friendRequests.id, requestId))
      .returning();

    const [pairA, pairB] = canonicalPair(
      friendRequest.requesterId,
      friendRequest.recipientId
    );

    const [newFriendship] = await db
      .insert(friendships)
      .values({
        id: uuidv4(),
        userIdA: pairA,
        userIdB: pairB,
        createdAt: now,
      })
      .returning();

    // Fetch names
    const [requesterUser] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, updatedRequest.requesterId))
      .limit(1);

    const [recipientUser] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, updatedRequest.recipientId))
      .limit(1);

    // Count total friendships for both users and check achievements
    const [friendCountRow] = await db
      .select({ cnt: count() })
      .from(friendships)
      .where(sqlExpr`${friendships.userIdA} = ${myId} OR ${friendships.userIdB} = ${myId}`);
    const myFriendCount = Number(friendCountRow?.cnt ?? 0);

    checkAchievements({
      event: 'friendship_confirmed',
      userId: myId,
      friendCount: myFriendCount,
    }).catch((err) => console.error('Achievement check failed:', err));

    // Also check for requester
    const [requesterFriendCountRow] = await db
      .select({ cnt: count() })
      .from(friendships)
      .where(sqlExpr`${friendships.userIdA} = ${friendRequest.requesterId} OR ${friendships.userIdB} = ${friendRequest.requesterId}`);
    checkAchievements({
      event: 'friendship_confirmed',
      userId: friendRequest.requesterId,
      friendCount: Number(requesterFriendCountRow?.cnt ?? 0),
    }).catch((err) => console.error('Achievement check failed:', err));

    const requestResponse: FriendRequest = {
      id: updatedRequest.id,
      requesterId: updatedRequest.requesterId,
      requesterName: requesterUser?.name ?? "",
      recipientId: updatedRequest.recipientId,
      recipientName: recipientUser?.name ?? "",
      status: updatedRequest.status as FriendRequest["status"],
      createdAt: updatedRequest.createdAt,
      respondedAt: updatedRequest.respondedAt ?? null,
    };

    return NextResponse.json({ request: requestResponse, friendship: newFriendship });
  }

  // action === "reject"
  const [updatedRequest] = await db
    .update(friendRequests)
    .set({ status: "rejected", respondedAt: now })
    .where(eq(friendRequests.id, requestId))
    .returning();

  const [requesterUser] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, updatedRequest.requesterId))
    .limit(1);

  const [recipientUser] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, updatedRequest.recipientId))
    .limit(1);

  const requestResponse: FriendRequest = {
    id: updatedRequest.id,
    requesterId: updatedRequest.requesterId,
    requesterName: requesterUser?.name ?? "",
    recipientId: updatedRequest.recipientId,
    recipientName: recipientUser?.name ?? "",
    status: updatedRequest.status as FriendRequest["status"],
    createdAt: updatedRequest.createdAt,
    respondedAt: updatedRequest.respondedAt ?? null,
  };

  return NextResponse.json({ request: requestResponse });
}

// DELETE /api/friends/requests/[requestId]
// Auth: Required
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId } = await params;
  const myId = session.user.id;

  const [friendRequest] = await db
    .select()
    .from(friendRequests)
    .where(eq(friendRequests.id, requestId))
    .limit(1);

  if (!friendRequest) {
    return NextResponse.json({ error: "Friend request not found" }, { status: 404 });
  }

  if (friendRequest.requesterId !== myId) {
    return NextResponse.json(
      { error: "Only the requester can cancel this request" },
      { status: 403 }
    );
  }

  if (friendRequest.status !== "pending") {
    return NextResponse.json(
      { error: "Friend request is not in pending state" },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();

  const [updatedRequest] = await db
    .update(friendRequests)
    .set({ status: "cancelled", respondedAt: now })
    .where(eq(friendRequests.id, requestId))
    .returning();

  // Fetch names
  const [requesterUser] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, updatedRequest.requesterId))
    .limit(1);

  const [recipientUser] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, updatedRequest.recipientId))
    .limit(1);

  const requestResponse: FriendRequest = {
    id: updatedRequest.id,
    requesterId: updatedRequest.requesterId,
    requesterName: requesterUser?.name ?? "",
    recipientId: updatedRequest.recipientId,
    recipientName: recipientUser?.name ?? "",
    status: updatedRequest.status as FriendRequest["status"],
    createdAt: updatedRequest.createdAt,
    respondedAt: updatedRequest.respondedAt ?? null,
  };

  return NextResponse.json({ request: requestResponse });
}
