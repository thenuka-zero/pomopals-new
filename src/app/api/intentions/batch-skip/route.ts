import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { intentions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// POST /api/intentions/batch-skip — mark all pending tasks in a session group as skipped
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: { sessionGroupId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { sessionGroupId } = body;

  if (typeof sessionGroupId !== "string" || !sessionGroupId.trim()) {
    return NextResponse.json({ error: "sessionGroupId required" }, { status: 400 });
  }

  const now = new Date().toISOString();

  await db
    .update(intentions)
    .set({ status: "skipped", reflectedAt: now })
    .where(
      and(
        eq(intentions.sessionGroupId, sessionGroupId.trim()),
        eq(intentions.userId, userId),
        eq(intentions.status, "pending")
      )
    );

  return NextResponse.json({ success: true });
}
