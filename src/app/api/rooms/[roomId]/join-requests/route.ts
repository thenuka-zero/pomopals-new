import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, friendships, roomJoinRequests } from "@/lib/db/schema";
import { and, eq, lt } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getRoom, MAX_PARTICIPANTS } from "@/lib/rooms";
import { RoomJoinRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

// POST /api/rooms/[roomId]/join-requests
// Auth: Required + emailVerified
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
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

  const myId = session.user.id;
  const { roomId } = await params;

  // Check room exists
  const room = getRoom(roomId);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 400 });
  }

  const hostId = room.hostId;

  // TODO: check blocks table

  // Check friendship with host
  const [pairA, pairB] = canonicalPair(myId, hostId);
  const [friendshipRow] = await db
    .select()
    .from(friendships)
    .where(
      and(
        eq(friendships.userIdA, pairA),
        eq(friendships.userIdB, pairB)
      )
    )
    .limit(1);

  if (!friendshipRow) {
    return NextResponse.json(
      { error: "You must be friends with the room host to request to join" },
      { status: 403 }
    );
  }

  // Check if requester is already in the room
  const isParticipant = room.participants.some((p) => p.id === myId);
  if (isParticipant) {
    return NextResponse.json(
      { error: "You are already in this room" },
      { status: 409 }
    );
  }

  // Check room capacity
  if (room.participants.length >= MAX_PARTICIPANTS) {
    return NextResponse.json(
      { error: "Room is at maximum capacity" },
      { status: 422 }
    );
  }

  // Check for existing pending request
  const [existingRequest] = await db
    .select()
    .from(roomJoinRequests)
    .where(
      and(
        eq(roomJoinRequests.roomId, roomId),
        eq(roomJoinRequests.requesterId, myId),
        eq(roomJoinRequests.status, "pending")
      )
    )
    .limit(1);

  if (existingRequest) {
    return NextResponse.json(
      { error: "You already have a pending join request for this room" },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const [newRequest] = await db
    .insert(roomJoinRequests)
    .values({
      id: uuidv4(),
      roomId,
      requesterId: myId,
      hostId,
      status: "pending",
      createdAt: now,
      respondedAt: null,
      expiresAt,
    })
    .returning();

  const [requesterUser] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, myId))
    .limit(1);

  const joinRequest: RoomJoinRequest = {
    id: newRequest.id,
    roomId: newRequest.roomId,
    requesterId: newRequest.requesterId,
    requesterName: requesterUser?.name ?? "",
    hostId: newRequest.hostId,
    status: newRequest.status as RoomJoinRequest["status"],
    createdAt: newRequest.createdAt,
    respondedAt: newRequest.respondedAt ?? null,
    expiresAt: newRequest.expiresAt,
  };

  return NextResponse.json({ joinRequest }, { status: 201 });
}

// GET /api/rooms/[roomId]/join-requests
// Auth: Required (host only)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const myId = session.user.id;
  const { roomId } = await params;
  const now = new Date().toISOString();

  // Check room exists
  const room = getRoom(roomId);
  if (!room) {
    // Mark all pending requests for this room as expired
    await db
      .update(roomJoinRequests)
      .set({ status: "expired" })
      .where(
        and(
          eq(roomJoinRequests.roomId, roomId),
          eq(roomJoinRequests.status, "pending")
        )
      );
    return NextResponse.json({ joinRequests: [] });
  }

  if (room.hostId !== myId) {
    return NextResponse.json(
      { error: "Only the room host can view join requests" },
      { status: 403 }
    );
  }

  // Lazily expire pending requests past their expiresAt
  await db
    .update(roomJoinRequests)
    .set({ status: "expired" })
    .where(
      and(
        eq(roomJoinRequests.roomId, roomId),
        eq(roomJoinRequests.status, "pending"),
        lt(roomJoinRequests.expiresAt, now)
      )
    );

  // Fetch pending (non-expired) requests for this room
  const pendingRequests = await db
    .select()
    .from(roomJoinRequests)
    .where(
      and(
        eq(roomJoinRequests.roomId, roomId),
        eq(roomJoinRequests.status, "pending")
      )
    );

  const joinRequests: RoomJoinRequest[] = await Promise.all(
    pendingRequests.map(async (r) => {
      const [requesterUser] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, r.requesterId))
        .limit(1);

      return {
        id: r.id,
        roomId: r.roomId,
        requesterId: r.requesterId,
        requesterName: requesterUser?.name ?? "",
        hostId: r.hostId,
        status: r.status as RoomJoinRequest["status"],
        createdAt: r.createdAt,
        respondedAt: r.respondedAt ?? null,
        expiresAt: r.expiresAt,
      };
    })
  );

  return NextResponse.json({ joinRequests });
}
