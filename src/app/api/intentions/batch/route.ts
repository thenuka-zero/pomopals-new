import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { intentions } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

// POST /api/intentions/batch — create multiple tasks sharing a sessionGroupId
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.emailVerified) {
    return NextResponse.json({ error: "Email not verified" }, { status: 403 });
  }
  const userId = session.user.id;

  let body: { tasks?: unknown; sessionGroupId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { tasks, sessionGroupId } = body;

  if (
    typeof sessionGroupId !== "string" ||
    !sessionGroupId.trim() ||
    !Array.isArray(tasks) ||
    tasks.length === 0 ||
    tasks.length > 50
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Validate each task
  for (const t of tasks) {
    if (
      typeof t !== "object" || t === null ||
      typeof (t as Record<string, unknown>).id !== "string" ||
      typeof (t as Record<string, unknown>).text !== "string" ||
      ((t as Record<string, unknown>).text as string).trim().length === 0 ||
      ((t as Record<string, unknown>).text as string).trim().length > 280 ||
      typeof (t as Record<string, unknown>).startedAt !== "string" ||
      typeof (t as Record<string, unknown>).date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test((t as Record<string, unknown>).date as string)
    ) {
      return NextResponse.json({ error: "Invalid task payload" }, { status: 400 });
    }
  }

  const now = new Date().toISOString();
  const sgId = sessionGroupId.trim();

  // Insert all tasks in a transaction
  const rows = await db.transaction(async (tx) => {
    for (const t of tasks as Array<{ id: string; text: string; startedAt: string; date: string }>) {
      await tx.insert(intentions).values({
        id: t.id.trim(),
        userId,
        text: t.text.trim(),
        status: "pending",
        startedAt: t.startedAt.trim(),
        date: t.date,
        sessionGroupId: sgId,
        createdAt: now,
      });
    }
    return (tasks as Array<{ id: string }>).map((t) => t.id.trim());
  });

  return NextResponse.json({ ids: rows, sessionGroupId: sgId }, { status: 201 });
}
