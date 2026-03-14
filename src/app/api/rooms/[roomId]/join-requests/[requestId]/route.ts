import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, roomJoinRequests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getRoom, joinRoom, toRoomResponse, MAX_PARTICIPANTS } from "@/lib/rooms";
import { RoomJoinRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

// PATCH /api/rooms/[roomId]/join-requests/[requestId]
// Body: { action: "approve" | "deny" }
// Auth: Required (host only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; requestId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const myId = session.user.id;
  const { roomId, requestId } = await params;

  // Fetch the join request
  const [joinRequest] = await db
    .select()
    .from(roomJoinRequests)
    .where(eq(roomJoinRequests.id, requestId))
    .limit(1);

  if (!joinRequest) {
    return NextResponse.json({ error: "Join request not found" }, { status: 404 });
  }

  if (joinRequest.hostId !== myId) {
    return NextResponse.json(
      { error: "Only the room host can approve or deny join requests" },
      { status: 403 }
    );
  }

  if (joinRequest.status !== "pending") {
    return NextResponse.json(
      { error: "Join request is not in pending state" },
      { status: 409 }
    );
  }

  // Check room still exists
  const room = await getRoom(roomId);
  if (!room) {
    await db
      .update(roomJoinRequests)
      .set({ status: "expired" })
      .where(eq(roomJoinRequests.id, requestId));

    return NextResponse.json(
      { error: "Room no longer exists" },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { action } = body;

  if (action !== "approve" && action !== "deny") {
    return NextResponse.json(
      { error: "action must be 'approve' or 'deny'" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  if (action === "approve") {
    // Re-check capacity
    if (room.participants.length >= MAX_PARTICIPANTS) {
      return NextResponse.json(
        { error: "Room is at maximum capacity" },
        { status: 422 }
      );
    }

    const [updatedRequest] = await db
      .update(roomJoinRequests)
      .set({ status: "approved", respondedAt: now })
      .where(eq(roomJoinRequests.id, requestId))
      .returning();

    // Fetch requester name
    const [requesterUser] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, joinRequest.requesterId))
      .limit(1);

    const requesterName = requesterUser?.name ?? "Unknown";

    // Add participant to room — may throw if full (race condition)
    try {
      const updatedRoom = await joinRoom(roomId, joinRequest.requesterId, requesterName);
      if (!updatedRoom) {
        return NextResponse.json(
          { error: "Room no longer exists" },
          { status: 422 }
        );
      }

      const joinRequestResponse: RoomJoinRequest = {
        id: updatedRequest.id,
        roomId: updatedRequest.roomId,
        requesterId: updatedRequest.requesterId,
        requesterName,
        hostId: updatedRequest.hostId,
        status: updatedRequest.status as RoomJoinRequest["status"],
        createdAt: updatedRequest.createdAt,
        respondedAt: updatedRequest.respondedAt ?? null,
        expiresAt: updatedRequest.expiresAt,
      };

      return NextResponse.json({
        joinRequest: joinRequestResponse,
        room: toRoomResponse(updatedRoom),
      });
    } catch {
      return NextResponse.json(
        { error: "Room is at maximum capacity" },
        { status: 422 }
      );
    }
  }

  // action === "deny"
  const [updatedRequest] = await db
    .update(roomJoinRequests)
    .set({ status: "denied", respondedAt: now })
    .where(eq(roomJoinRequests.id, requestId))
    .returning();

  // Fetch requester name for response
  const [requesterUser] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, joinRequest.requesterId))
    .limit(1);

  const joinRequestResponse: RoomJoinRequest = {
    id: updatedRequest.id,
    roomId: updatedRequest.roomId,
    requesterId: updatedRequest.requesterId,
    requesterName: requesterUser?.name ?? "",
    hostId: updatedRequest.hostId,
    status: updatedRequest.status as RoomJoinRequest["status"],
    createdAt: updatedRequest.createdAt,
    respondedAt: updatedRequest.respondedAt ?? null,
    expiresAt: updatedRequest.expiresAt,
  };

  return NextResponse.json({ joinRequest: joinRequestResponse });
}
