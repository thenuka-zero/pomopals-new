import { NextRequest, NextResponse } from "next/server";
import { getRoom, joinRoom, leaveRoom, startRoomTimer, pauseRoomTimer, resetRoomTimer, skipPhase } from "@/lib/rooms";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const room = getRoom(roomId);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  return NextResponse.json(room);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const body = await request.json();
  const { action, userId, userName } = body;

  switch (action) {
    case "join": {
      const room = joinRoom(roomId, userId, userName || "Anonymous");
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
      return NextResponse.json(room);
    }
    case "leave": {
      leaveRoom(roomId, userId);
      return NextResponse.json({ success: true });
    }
    case "start": {
      const room = startRoomTimer(roomId);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
      return NextResponse.json(room);
    }
    case "pause": {
      const room = pauseRoomTimer(roomId);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
      return NextResponse.json(room);
    }
    case "reset": {
      const room = resetRoomTimer(roomId);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
      return NextResponse.json(room);
    }
    case "skip": {
      const room = skipPhase(roomId);
      if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
      return NextResponse.json(room);
    }
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
}
