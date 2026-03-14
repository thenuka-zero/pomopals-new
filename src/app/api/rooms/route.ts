import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createRoom, toRoomResponse } from "@/lib/rooms";
import { checkAchievements } from "@/lib/achievement-checker";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { hostName, name, settings, timerState } = body;

  // Always use the authenticated user's ID — never trust client-supplied hostId
  const hostId = session.user.id;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const room = await createRoom(hostId, hostName || session.user.name || "Anonymous", name, settings, timerState);

  // Check achievements for room creation (non-blocking)
  checkAchievements({
    event: 'room_created',
    userId: session.user.id,
    roomId: room.id,
  }).catch((err) => console.error('Achievement check failed:', err));

  return NextResponse.json(toRoomResponse(room));
}
