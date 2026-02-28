import { NextRequest, NextResponse } from "next/server";
import { createRoom, listRooms } from "@/lib/rooms";

export async function GET() {
  const rooms = listRooms();
  return NextResponse.json(rooms);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { hostId, hostName, name, settings } = body;

  if (!hostId || !name) {
    return NextResponse.json({ error: "hostId and name are required" }, { status: 400 });
  }

  const room = createRoom(hostId, hostName || "Anonymous", name, settings);
  return NextResponse.json(room);
}
