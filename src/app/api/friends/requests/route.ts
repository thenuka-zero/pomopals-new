import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, friendships, friendRequests } from "@/lib/db/schema";
import { and, eq, or, count, aliasedTable } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { FriendRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// POST /api/friends/requests
// Body: { recipientEmail: string }
// Auth: Required + emailVerified
export async function POST(request: NextRequest) {
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
  const body = await request.json().catch(() => ({}));
  const { recipientEmail } = body;

  if (!recipientEmail || typeof recipientEmail !== "string") {
    return NextResponse.json(
      { error: "recipientEmail is required" },
      { status: 400 }
    );
  }

  if (!isValidEmail(recipientEmail)) {
    return NextResponse.json(
      { error: "Invalid email address" },
      { status: 400 }
    );
  }

  // Self-request check
  if (recipientEmail.toLowerCase() === session.user.email?.toLowerCase()) {
    return NextResponse.json(
      { error: "You cannot send a friend request to yourself" },
      { status: 422 }
    );
  }

  // Find recipient
  const [recipient] = await db
    .select()
    .from(users)
    .where(eq(users.email, recipientEmail.toLowerCase()))
    .limit(1);

  if (!recipient) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const theirId = recipient.id;

  // Check if already friends
  const [pairA, pairB] = canonicalPair(myId, theirId);
  const [existingFriendship] = await db
    .select()
    .from(friendships)
    .where(
      and(
        eq(friendships.userIdA, pairA),
        eq(friendships.userIdB, pairB)
      )
    )
    .limit(1);

  if (existingFriendship) {
    return NextResponse.json(
      { error: "You are already friends" },
      { status: 409 }
    );
  }

  // Check for existing friend request rows (any direction)
  const [existingRequest] = await db
    .select()
    .from(friendRequests)
    .where(
      or(
        and(
          eq(friendRequests.requesterId, myId),
          eq(friendRequests.recipientId, theirId)
        ),
        and(
          eq(friendRequests.requesterId, theirId),
          eq(friendRequests.recipientId, myId)
        )
      )
    )
    .limit(1);

  if (existingRequest) {
    // Already sent by me — pending
    if (
      existingRequest.status === "pending" &&
      existingRequest.requesterId === myId &&
      existingRequest.recipientId === theirId
    ) {
      return NextResponse.json(
        { error: "Friend request already sent" },
        { status: 409 }
      );
    }

    // They sent a request to me — auto-accept
    if (
      existingRequest.status === "pending" &&
      existingRequest.requesterId === theirId &&
      existingRequest.recipientId === myId
    ) {
      const now = new Date().toISOString();

      // Accept their request
      const [updatedRequest] = await db
        .update(friendRequests)
        .set({ status: "accepted", respondedAt: now })
        .where(eq(friendRequests.id, existingRequest.id))
        .returning();

      // Create friendship
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

      return NextResponse.json(
        { request: requestResponse, autoAccepted: true, friendship: newFriendship },
        { status: 201 }
      );
    }

    // Cooldown check for rejected requests
    if (existingRequest.status === "rejected" && existingRequest.respondedAt) {
      const respondedAt = new Date(existingRequest.respondedAt).getTime();
      const cooldownEnd = respondedAt + 24 * 60 * 60 * 1000;
      if (Date.now() < cooldownEnd) {
        const retryAfter = new Date(cooldownEnd).toISOString();
        return NextResponse.json(
          {
            error: "You must wait 24 hours before sending another request to this user",
            retryAfter,
          },
          { status: 429 }
        );
      }
    }

    // Rejected (cooldown passed) or cancelled — delete old row, create new one
    if (
      existingRequest.status === "rejected" ||
      existingRequest.status === "cancelled"
    ) {
      await db
        .delete(friendRequests)
        .where(eq(friendRequests.id, existingRequest.id));
    }
  }

  // Check friend limit for both users
  const [myFriendCountA] = await db
    .select({ cnt: count() })
    .from(friendships)
    .where(eq(friendships.userIdA, myId));
  const [myFriendCountB] = await db
    .select({ cnt: count() })
    .from(friendships)
    .where(eq(friendships.userIdB, myId));
  const myFriendCount = (myFriendCountA?.cnt ?? 0) + (myFriendCountB?.cnt ?? 0);

  if (myFriendCount >= 50) {
    return NextResponse.json(
      { error: "Friend limit reached" },
      { status: 422 }
    );
  }

  const [theirFriendCountA] = await db
    .select({ cnt: count() })
    .from(friendships)
    .where(eq(friendships.userIdA, theirId));
  const [theirFriendCountB] = await db
    .select({ cnt: count() })
    .from(friendships)
    .where(eq(friendships.userIdB, theirId));
  const theirFriendCount = (theirFriendCountA?.cnt ?? 0) + (theirFriendCountB?.cnt ?? 0);

  if (theirFriendCount >= 50) {
    return NextResponse.json(
      { error: "Friend limit reached" },
      { status: 422 }
    );
  }

  // Create new friend request
  const now = new Date().toISOString();
  const [newRequest] = await db
    .insert(friendRequests)
    .values({
      id: uuidv4(),
      requesterId: myId,
      recipientId: theirId,
      status: "pending",
      createdAt: now,
      respondedAt: null,
    })
    .returning();

  const [requesterUser] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, myId))
    .limit(1);

  const requestResponse: FriendRequest = {
    id: newRequest.id,
    requesterId: newRequest.requesterId,
    requesterName: requesterUser?.name ?? "",
    recipientId: newRequest.recipientId,
    recipientName: recipient.name,
    status: newRequest.status as FriendRequest["status"],
    createdAt: newRequest.createdAt,
    respondedAt: newRequest.respondedAt ?? null,
  };

  return NextResponse.json({ request: requestResponse }, { status: 201 });
}

// GET /api/friends/requests
// Query: ?direction=incoming|outgoing|all (default: all), ?status=pending|... (default: pending)
// Auth: Required
// Returns: { incoming: FriendRequest[], outgoing: FriendRequest[] }
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const myId = session.user.id;
  const direction = request.nextUrl.searchParams.get("direction") ?? "all";
  const statusParam = request.nextUrl.searchParams.get("status") ?? "pending";

  const requesterUsers = aliasedTable(users, "requester_users");
  const recipientUsers = aliasedTable(users, "recipient_users");

  // Fetch incoming requests (I am the recipient)
  let incoming: FriendRequest[] = [];
  if (direction === "incoming" || direction === "all") {
    const incomingRows = await db
      .select({
        id: friendRequests.id,
        requesterId: friendRequests.requesterId,
        requesterName: requesterUsers.name,
        recipientId: friendRequests.recipientId,
        recipientName: recipientUsers.name,
        status: friendRequests.status,
        createdAt: friendRequests.createdAt,
        respondedAt: friendRequests.respondedAt,
      })
      .from(friendRequests)
      .innerJoin(requesterUsers, eq(friendRequests.requesterId, requesterUsers.id))
      .innerJoin(recipientUsers, eq(friendRequests.recipientId, recipientUsers.id))
      .where(
        statusParam === "all"
          ? eq(friendRequests.recipientId, myId)
          : and(
              eq(friendRequests.recipientId, myId),
              eq(friendRequests.status, statusParam)
            )
      );

    incoming = incomingRows.map((r) => ({
      id: r.id,
      requesterId: r.requesterId,
      requesterName: r.requesterName,
      recipientId: r.recipientId,
      recipientName: r.recipientName,
      status: r.status as FriendRequest["status"],
      createdAt: r.createdAt,
      respondedAt: r.respondedAt ?? null,
    }));
  }

  // Fetch outgoing requests (I am the requester)
  let outgoing: FriendRequest[] = [];
  if (direction === "outgoing" || direction === "all") {
    const outgoingRows = await db
      .select({
        id: friendRequests.id,
        requesterId: friendRequests.requesterId,
        requesterName: requesterUsers.name,
        recipientId: friendRequests.recipientId,
        recipientName: recipientUsers.name,
        status: friendRequests.status,
        createdAt: friendRequests.createdAt,
        respondedAt: friendRequests.respondedAt,
      })
      .from(friendRequests)
      .innerJoin(requesterUsers, eq(friendRequests.requesterId, requesterUsers.id))
      .innerJoin(recipientUsers, eq(friendRequests.recipientId, recipientUsers.id))
      .where(
        statusParam === "all"
          ? eq(friendRequests.requesterId, myId)
          : and(
              eq(friendRequests.requesterId, myId),
              eq(friendRequests.status, statusParam)
            )
      );

    outgoing = outgoingRows.map((r) => ({
      id: r.id,
      requesterId: r.requesterId,
      requesterName: r.requesterName,
      recipientId: r.recipientId,
      recipientName: r.recipientName,
      status: r.status as FriendRequest["status"],
      createdAt: r.createdAt,
      respondedAt: r.respondedAt ?? null,
    }));
  }

  return NextResponse.json({ incoming, outgoing });
}
