import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userPresence, userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// POST /api/presence
// Auth: Required
// Body: { isActive: boolean, roomId?: string | null, roomName?: string | null, phase?: string | null }
// Returns 200: { expiresAt: string }
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await request.json().catch(() => ({}));

  const { isActive, roomId, roomName, phase } = body;

  if (typeof isActive !== "boolean") {
    return NextResponse.json(
      { error: "isActive must be a boolean" },
      { status: 400 }
    );
  }

  // Fetch user settings for broadcastEnabled
  const [settingsRow] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  const broadcastEnabled =
    settingsRow?.broadcastEnabled !== undefined
      ? settingsRow.broadcastEnabled
      : 1;

  const now = new Date().toISOString();

  if (!isActive) {
    // Mark presence as inactive immediately
    const expiresAt = now;

    await db
      .insert(userPresence)
      .values({
        userId,
        isActive: 0,
        roomId: null,
        roomName: null,
        phase: null,
        startedAt: null,
        expiresAt,
        broadcastEnabled,
      })
      .onConflictDoUpdate({
        target: userPresence.userId,
        set: {
          isActive: 0,
          roomId: null,
          roomName: null,
          phase: null,
          startedAt: null,
          expiresAt,
          broadcastEnabled,
        },
      });

    return NextResponse.json({ expiresAt });
  }

  // isActive = true
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // Check existing presence to decide startedAt
  const [existingPresence] = await db
    .select()
    .from(userPresence)
    .where(eq(userPresence.userId, userId))
    .limit(1);

  // Only set startedAt = now if currently inactive (or no row), otherwise keep existing
  const startedAt =
    existingPresence && existingPresence.isActive === 1
      ? existingPresence.startedAt
      : now;

  await db
    .insert(userPresence)
    .values({
      userId,
      isActive: 1,
      roomId: roomId ?? null,
      roomName: roomName ?? null,
      phase: phase ?? null,
      startedAt,
      expiresAt,
      broadcastEnabled,
    })
    .onConflictDoUpdate({
      target: userPresence.userId,
      set: {
        isActive: 1,
        roomId: roomId ?? null,
        roomName: roomName ?? null,
        phase: phase ?? null,
        startedAt,
        expiresAt,
        broadcastEnabled,
      },
    });

  return NextResponse.json({ expiresAt });
}
