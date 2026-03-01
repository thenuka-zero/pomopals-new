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
  toRoomResponse,
} from "@/lib/rooms";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const room = getRoom(roomId);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  return NextResponse.json(toRoomResponse(room));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const body = await request.json();
  const { action, userId, userName } = body;

  const ADMIN_ACTIONS = ["start", "pause", "reset", "skip", "end"];

  // For admin actions, verify the user is the host
  if (ADMIN_ACTIONS.includes(action)) {
    const room = getRoom(roomId);
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    if (userId !== room.hostId) {
      return NextResponse.json(
        { error: "Only the room admin can control the timer" },
        { status: 403 }
      );
    }
  }

  switch (action) {
    case "join": {
      const result = joinRoomChecked(roomId, userId, userName || "Anonymous");
      if (result === undefined) return NextResponse.json({ error: "Room not found" }, { status: 404 });
      if (result === "full") return NextResponse.json({ error: "This room is full (max 20 participants)" }, { status: 403 });
      return NextResponse.json(toRoomResponse(result));
    }
    case "leave": {
      leaveRoom(roomId, userId);
      return NextResponse.json({ success: true });
    }
    case "start": {
      const room = startRoomTimer(roomId);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
      return NextResponse.json(toRoomResponse(room));
    }
    case "pause": {
      const room = pauseRoomTimer(roomId);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
      return NextResponse.json(toRoomResponse(room));
    }
    case "reset": {
      const room = resetRoomTimer(roomId);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
      return NextResponse.json(toRoomResponse(room));
    }
    case "skip": {
      const room = skipPhase(roomId);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
      return NextResponse.json(toRoomResponse(room));
    }
    case "end": {
      endRoom(roomId);
      return NextResponse.json({ success: true });
    }
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
}
