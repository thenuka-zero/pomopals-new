import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { intentions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

// DELETE /api/intentions/[intentionId] — Hard delete an intention
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ intentionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { intentionId } = await params;

  const [existing] = await db
    .select()
    .from(intentions)
    .where(and(eq(intentions.id, intentionId), eq(intentions.userId, userId)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db
    .delete(intentions)
    .where(and(eq(intentions.id, intentionId), eq(intentions.userId, userId)));

  return NextResponse.json({ success: true });
}

// PATCH /api/intentions/[intentionId] — Submit reflection
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ intentionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { intentionId } = await params;

  let body: { status?: unknown; sessionId?: unknown; note?: unknown; reflectedAt?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { status, sessionId, note, reflectedAt } = body;

  if (status !== "completed" && status !== "not_completed" && status !== "skipped") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (note !== undefined && note !== null && (typeof note !== "string" || note.length > 500)) {
    return NextResponse.json({ error: "Note too long" }, { status: 400 });
  }
  if (typeof reflectedAt !== "string" || !reflectedAt.trim()) {
    return NextResponse.json({ error: "reflectedAt required" }, { status: 400 });
  }

  // Fetch existing intention
  const [existing] = await db
    .select()
    .from(intentions)
    .where(and(eq(intentions.id, intentionId), eq(intentions.userId, userId)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Idempotent: if already same status, return existing
  if (existing.status === status) {
    return NextResponse.json({ success: true, intention: existing });
  }

  // Reject status change if already reflected (e.g., completed -> not_completed)
  const isAlreadyReflected = existing.status !== "pending";
  const isChangingStatus = existing.status !== status;
  if (isAlreadyReflected && isChangingStatus) {
    return NextResponse.json(
      { error: "Cannot change reflected status" },
      { status: 409 }
    );
  }

  await db
    .update(intentions)
    .set({
      status: status as string,
      note: typeof note === "string" ? note : null,
      sessionId: typeof sessionId === "string" ? sessionId : null,
      reflectedAt: reflectedAt.trim(),
    })
    .where(and(eq(intentions.id, intentionId), eq(intentions.userId, userId)));

  const [updated] = await db
    .select()
    .from(intentions)
    .where(and(eq(intentions.id, intentionId), eq(intentions.userId, userId)))
    .limit(1);

  return NextResponse.json({ success: true, intention: updated });
}
