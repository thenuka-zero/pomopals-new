import { NextRequest, NextResponse } from "next/server";
import { createRoom, toRoomResponse } from "@/lib/rooms";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { hostId, hostName, name, settings, timerState } = body;

  if (!hostId || !name) {
    return NextResponse.json({ error: "hostId and name are required" }, { status: 400 });
  }

  const room = createRoom(hostId, hostName || "Anonymous", name, settings, timerState);
  return NextResponse.json(toRoomResponse(room));
}
