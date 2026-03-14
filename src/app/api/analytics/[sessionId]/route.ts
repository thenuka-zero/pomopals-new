import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pomodoroSessions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// DELETE /api/analytics/[sessionId]
// Deletes a pomodoro session belonging to the authenticated user.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;

  await db
    .delete(pomodoroSessions)
    .where(
      and(
        eq(pomodoroSessions.id, sessionId),
        eq(pomodoroSessions.userId, session.user.id)
      )
    );

  return NextResponse.json({ success: true });
}
