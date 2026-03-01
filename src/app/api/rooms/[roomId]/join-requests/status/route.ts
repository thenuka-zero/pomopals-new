import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, roomJoinRequests } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { RoomJoinRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/rooms/[roomId]/join-requests/status
// Auth: Required
// Returns 200: { status: RoomJoinRequestStatus, joinRequest: RoomJoinRequest }
// Returns 404: no request found
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

  // Find the most recent join request for this room by this user
  const [joinRequest] = await db
    .select()
    .from(roomJoinRequests)
    .where(
      and(
        eq(roomJoinRequests.roomId, roomId),
        eq(roomJoinRequests.requesterId, myId)
      )
    )
    .orderBy(desc(roomJoinRequests.createdAt))
    .limit(1);

  if (!joinRequest) {
    return NextResponse.json({ error: "No join request found" }, { status: 404 });
  }

  let status = joinRequest.status;

  // Lazily expire if pending and past expiresAt
  if (status === "pending" && joinRequest.expiresAt < now) {
    await db
      .update(roomJoinRequests)
      .set({ status: "expired" })
      .where(eq(roomJoinRequests.id, joinRequest.id));
    status = "expired";
  }

  // Fetch requester name
  const [requesterUser] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, joinRequest.requesterId))
    .limit(1);

  const joinRequestResponse: RoomJoinRequest = {
    id: joinRequest.id,
    roomId: joinRequest.roomId,
    requesterId: joinRequest.requesterId,
    requesterName: requesterUser?.name ?? "",
    hostId: joinRequest.hostId,
    status: status as RoomJoinRequest["status"],
    createdAt: joinRequest.createdAt,
    respondedAt: joinRequest.respondedAt ?? null,
    expiresAt: joinRequest.expiresAt,
  };

  return NextResponse.json({ status, joinRequest: joinRequestResponse });
}
