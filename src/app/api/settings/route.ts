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
    ? { broadcastEnabled: row[0].broadcastEnabled === 1 }
    : { broadcastEnabled: true };

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

  if (typeof body.broadcastEnabled !== "boolean") {
    return NextResponse.json(
      { error: "broadcastEnabled must be a boolean" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  // Check if row exists to decide createdAt
  const existing = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  const createdAt = existing.length > 0 ? existing[0].createdAt : now;

  await db
    .insert(userSettings)
    .values({
      userId,
      broadcastEnabled: body.broadcastEnabled ? 1 : 0,
      friendLimit: 50,
      createdAt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: {
        broadcastEnabled: body.broadcastEnabled ? 1 : 0,
        updatedAt: now,
      },
    });

  const settings: UserSettings = { broadcastEnabled: body.broadcastEnabled };
  return NextResponse.json({ settings });
}
