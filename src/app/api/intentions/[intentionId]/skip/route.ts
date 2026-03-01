import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { intentions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

// POST /api/intentions/[intentionId]/skip — Mark intention as skipped
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ intentionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { intentionId } = await params;

  // Fetch existing intention
  const [existing] = await db
    .select()
    .from(intentions)
    .where(and(eq(intentions.id, intentionId), eq(intentions.userId, userId)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Idempotent: only transition pending -> skipped
  if (existing.status !== "pending") {
    return NextResponse.json({ success: true });
  }

  await db
    .update(intentions)
    .set({ status: "skipped" })
    .where(and(eq(intentions.id, intentionId), eq(intentions.userId, userId)));

  return NextResponse.json({ success: true });
}
