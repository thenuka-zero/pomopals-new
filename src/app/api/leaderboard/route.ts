import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, friendships, pomodoroSessions } from "@/lib/db/schema";
import { eq, or, and, gte, lte, inArray, sum } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Period = "daily" | "weekly" | "monthly" | "alltime";

function getDateRange(period: Period): { startDate: string; endDate: string } | null {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const today = toDateStr(now);

  if (period === "daily") {
    return { startDate: today, endDate: today };
  }

  if (period === "weekly") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    return { startDate: toDateStr(start), endDate: today };
  }

  if (period === "monthly") {
    const start = new Date(now);
    start.setDate(now.getDate() - 29);
    return { startDate: toDateStr(start), endDate: today };
  }

  return null; // alltime
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const myId = session.user.id;
  const rawPeriod = request.nextUrl.searchParams.get("period") ?? "weekly";
  const validPeriods: Period[] = ["daily", "weekly", "monthly", "alltime"];
  const period: Period = validPeriods.includes(rawPeriod as Period)
    ? (rawPeriod as Period)
    : "weekly";

  // 1. Get friend IDs
  const myFriendships = await db
    .select()
    .from(friendships)
    .where(or(eq(friendships.userIdA, myId), eq(friendships.userIdB, myId)));

  const friendIds = myFriendships.map((f) =>
    f.userIdA === myId ? f.userIdB : f.userIdA
  );

  const allUserIds = [myId, ...friendIds];

  // 2. Build session filter
  const dateRange = getDateRange(period);

  const sessionConditions = [
    inArray(pomodoroSessions.userId, allUserIds),
    eq(pomodoroSessions.phase, "work"),
    eq(pomodoroSessions.completed, true),
  ];

  if (dateRange) {
    sessionConditions.push(gte(pomodoroSessions.date, dateRange.startDate));
    sessionConditions.push(lte(pomodoroSessions.date, dateRange.endDate));
  }

  // 3. Aggregate total seconds per user
  const sessionRows = await db
    .select({
      userId: pomodoroSessions.userId,
      totalSeconds: sum(pomodoroSessions.actualDuration),
    })
    .from(pomodoroSessions)
    .where(and(...sessionConditions))
    .groupBy(pomodoroSessions.userId);

  const secondsMap = new Map<string, number>();
  for (const row of sessionRows) {
    secondsMap.set(row.userId, Number(row.totalSeconds ?? 0));
  }

  // 4. Fetch user details for all participants
  const userRows = await db
    .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl })
    .from(users)
    .where(inArray(users.id, allUserIds));

  // 5. Build and sort entries
  const entries = userRows
    .map((u) => ({
      userId: u.id,
      name: u.name,
      avatarUrl: u.avatarUrl ?? null,
      totalMinutes: Math.floor((secondsMap.get(u.id) ?? 0) / 60),
      isCurrentUser: u.id === myId,
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes)
    .map((entry, i) => ({ rank: i + 1, ...entry }));

  const currentUserEntry = entries.find((e) => e.isCurrentUser);

  return NextResponse.json({
    entries,
    period,
    currentUserRank: currentUserEntry?.rank ?? null,
  });
}
