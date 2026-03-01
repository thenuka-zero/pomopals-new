import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { intentions } from "@/lib/db/schema";
import { eq, and, gte, lte, desc, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

// POST /api/intentions — Create a new intention
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: { id?: unknown; text?: unknown; startedAt?: unknown; date?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, text, startedAt, date } = body;

  if (
    typeof id !== "string" ||
    !id.trim() ||
    typeof text !== "string" ||
    text.trim().length === 0 ||
    text.trim().length > 280 ||
    typeof startedAt !== "string" ||
    !startedAt.trim() ||
    typeof date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const now = new Date().toISOString();

  await db.insert(intentions).values({
    id: id.trim(),
    userId,
    text: text.trim(),
    status: "pending",
    startedAt: startedAt.trim(),
    date,
    createdAt: now,
  });

  const [row] = await db
    .select()
    .from(intentions)
    .where(and(eq(intentions.id, id.trim()), eq(intentions.userId, userId)))
    .limit(1);

  return NextResponse.json({ success: true, intention: row }, { status: 201 });
}

// GET /api/intentions — Paginated journal list
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const statusFilter = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const validStatuses = ["pending", "completed", "not_completed", "skipped"];

  // Build where conditions
  const conditions = [eq(intentions.userId, userId)];
  if (statusFilter && validStatuses.includes(statusFilter)) {
    conditions.push(eq(intentions.status, statusFilter));
  }
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    conditions.push(gte(intentions.date, from));
  }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    conditions.push(lte(intentions.date, to));
  }

  const whereClause = and(...conditions);

  const [totalRow] = await db
    .select({ total: count() })
    .from(intentions)
    .where(whereClause);

  const total = totalRow?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;

  const rows = await db
    .select()
    .from(intentions)
    .where(whereClause)
    .orderBy(desc(intentions.startedAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    intentions: rows,
    total,
    page,
    totalPages,
  });
}
