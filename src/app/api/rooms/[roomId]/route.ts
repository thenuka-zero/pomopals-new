import { NextRequest, NextResponse } from "next/server";
import {
  getRoom,
  joinRoomChecked,
  leaveRoom,
  endRoom,
  startRoomTimer,
  pauseRoomTimer,
  resetRoomTimer,
  skipPhase,
  reclaimHost,
  toRoomResponse,
  transferHost,
  addCoHost,
  removeCoHost,
  isPrivileged,
  setParticipantIntention,
} from "@/lib/rooms";
import { auth } from "@/lib/auth";
import { checkAchievements } from "@/lib/achievement-checker";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const room = await getRoom(roomId);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  return NextResponse.json(toRoomResponse(room));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const session = await auth();
  const { roomId } = await params;
  const body = await request.json();
  const { action, userId, userName } = body;

  const HOST_ONLY_ACTIONS = ["end", "transfer-host", "add-cohost", "remove-cohost"];
  const PRIVILEGED_ACTIONS = ["start", "pause", "reset", "skip"];
  // Actions that require the request body's userId to match the authenticated session
  const SESSION_VERIFIED_ACTIONS = [...HOST_ONLY_ACTIONS, ...PRIVILEGED_ACTIONS, "reclaim-host", "set-intention"];

  if (SESSION_VERIFIED_ACTIONS.includes(action)) {
    if (!session?.user?.id || session.user.id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (HOST_ONLY_ACTIONS.includes(action) || PRIVILEGED_ACTIONS.includes(action)) {
    const room = await getRoom(roomId);
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    if (HOST_ONLY_ACTIONS.includes(action) && userId !== room.hostId) {
      return NextResponse.json(
        { error: "Only the room host can perform this action" },
        { status: 403 }
      );
    }
    if (PRIVILEGED_ACTIONS.includes(action) && !isPrivileged(room, userId)) {
      return NextResponse.json(
        { error: "Only the host or co-host can control the timer" },
        { status: 403 }
      );
    }
  }

  switch (action) {
    case "join": {
      const result = await joinRoomChecked(roomId, userId, userName || "Anonymous");
      if (result === undefined) return NextResponse.json({ error: "Room not found" }, { status: 404 });
      if (result === "full") return NextResponse.json({ error: "This room is full (max 20 participants)" }, { status: 403 });
      // Check achievements for room join (non-blocking)
      if (session?.user?.id) {
        const participantCount = result.participants.length;
        const isHost = result.hostId === session.user.id;
        checkAchievements({
          event: 'room_joined',
          userId: session.user.id,
          roomId,
          hostId: result.hostId,
          participantCount,
          isUserHost: isHost,
        }).catch((err) => console.error('Achievement check failed:', err));
      }
      return NextResponse.json(toRoomResponse(result));
    }
    case "leave": {
      await leaveRoom(roomId, userId);
      return NextResponse.json({ success: true });
    }
    case "start": {
      const room = await startRoomTimer(roomId);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
      return NextResponse.json(toRoomResponse(room));
    }
    case "pause": {
      const room = await pauseRoomTimer(roomId);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
      return NextResponse.json(toRoomResponse(room));
    }
    case "reset": {
      const room = await resetRoomTimer(roomId);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
      return NextResponse.json(toRoomResponse(room));
    }
    case "skip": {
      const room = await skipPhase(roomId);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
      return NextResponse.json(toRoomResponse(room));
    }
    case "end": {
      await endRoom(roomId);
      return NextResponse.json({ success: true });
    }
    case "reclaim-host": {
      const room = await reclaimHost(roomId, userId);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
      return NextResponse.json(toRoomResponse(room));
    }
    case "transfer-host": {
      const { targetUserId } = body;
      const room = await transferHost(roomId, userId, targetUserId);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
      return NextResponse.json(toRoomResponse(room));
    }
    case "add-cohost": {
      const { targetUserId } = body;
      const room = await addCoHost(roomId, userId, targetUserId);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
      return NextResponse.json(toRoomResponse(room));
    }
    case "remove-cohost": {
      const { targetUserId } = body;
      const room = await removeCoHost(roomId, userId, targetUserId);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
      return NextResponse.json(toRoomResponse(room));
    }
    case "set-intention": {
      const { intention } = body;
      const room = await setParticipantIntention(roomId, userId, intention ?? "");
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
      return NextResponse.json(toRoomResponse(room));
    }
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
}
