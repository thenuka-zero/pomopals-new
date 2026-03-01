import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createRoom, toRoomResponse } from "@/lib/rooms";
import { checkAchievements } from "@/lib/achievement-checker";

export async function POST(request: NextRequest) {
  const session = await auth();
  const body = await request.json();
  const { hostId, hostName, name, settings, timerState } = body;

  if (!hostId || !name) {
    return NextResponse.json({ error: "hostId and name are required" }, { status: 400 });
  }

  const room = createRoom(hostId, hostName || "Anonymous", name, settings, timerState);

  // Check achievements for room creation (non-blocking)
  if (session?.user?.id) {
    checkAchievements({
      event: 'room_created',
      userId: session.user.id,
      roomId: room.id,
    }).catch((err) => console.error('Achievement check failed:', err));
  }

  return NextResponse.json(toRoomResponse(room));
}
