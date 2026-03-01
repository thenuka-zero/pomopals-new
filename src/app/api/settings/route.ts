import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { UserSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/settings
// Returns: { settings: UserSettings }
export async function GET(_request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const row = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  const settings: UserSettings = row.length > 0
    ? {
        broadcastEnabled: row[0].broadcastEnabled === 1,
        intentionsEnabled: row[0].intentionsEnabled ?? true,
      }
    : { broadcastEnabled: true, intentionsEnabled: true };

  return NextResponse.json({ settings });
}

// PATCH /api/settings
// Body: { broadcastEnabled?: boolean }
// Returns: { settings: UserSettings }
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await request.json();

  if (
    body.broadcastEnabled !== undefined &&
    typeof body.broadcastEnabled !== "boolean"
  ) {
    return NextResponse.json(
      { error: "broadcastEnabled must be a boolean" },
      { status: 400 }
    );
  }

  if (
    body.intentionsEnabled !== undefined &&
    typeof body.intentionsEnabled !== "boolean"
  ) {
    return NextResponse.json(
      { error: "intentionsEnabled must be a boolean" },
      { status: 400 }
    );
  }

  if (
    body.broadcastEnabled === undefined &&
    body.intentionsEnabled === undefined
  ) {
    return NextResponse.json(
      { error: "At least one setting field must be provided" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  // Check if row exists to decide createdAt and current values
  const existing = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  const createdAt = existing.length > 0 ? existing[0].createdAt : now;
  const currentBroadcastEnabled =
    existing.length > 0 ? existing[0].broadcastEnabled === 1 : true;
  const currentIntentionsEnabled =
    existing.length > 0 ? (existing[0].intentionsEnabled ?? true) : true;

  const newBroadcastEnabled =
    body.broadcastEnabled !== undefined ? body.broadcastEnabled : currentBroadcastEnabled;
  const newIntentionsEnabled =
    body.intentionsEnabled !== undefined ? body.intentionsEnabled : currentIntentionsEnabled;

  // Build the update set — only include fields that were provided
  const updateSet: Record<string, unknown> = { updatedAt: now };
  if (body.broadcastEnabled !== undefined) {
    updateSet.broadcastEnabled = body.broadcastEnabled ? 1 : 0;
  }
  if (body.intentionsEnabled !== undefined) {
    updateSet.intentionsEnabled = body.intentionsEnabled;
  }

  await db
    .insert(userSettings)
    .values({
      userId,
      broadcastEnabled: newBroadcastEnabled ? 1 : 0,
      intentionsEnabled: newIntentionsEnabled,
      friendLimit: 50,
      createdAt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: updateSet,
    });

  const settings: UserSettings = {
    broadcastEnabled: newBroadcastEnabled,
    intentionsEnabled: newIntentionsEnabled,
  };
  return NextResponse.json({ settings });
}
