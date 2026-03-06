import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import {
  pomodoroSessions,
  intentions,
  userAchievements,
  friendships,
} from "@/lib/db/schema";
import { and, count, countDistinct, eq, gte, isNotNull, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

function nDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export async function GET() {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  try {
    // ── Pomodoro totals ─────────────────────────────────────────────────────

    const [totalCompletedRow] = await db
      .select({ count: count() })
      .from(pomodoroSessions)
      .where(
        and(
          eq(pomodoroSessions.phase, "work"),
          eq(pomodoroSessions.completed, true)
        )
      );

    const thirtyDaysAgo = nDaysAgo(30);
    const [completedLast30Row] = await db
      .select({ count: count() })
      .from(pomodoroSessions)
      .where(
        and(
          eq(pomodoroSessions.phase, "work"),
          eq(pomodoroSessions.completed, true),
          gte(pomodoroSessions.date, thirtyDaysAgo)
        )
      );

    const [totalStartedRow] = await db
      .select({ count: count() })
      .from(pomodoroSessions)
      .where(eq(pomodoroSessions.phase, "work"));

    const [avgDurationRow] = await db
      .select({
        avg: sql<number>`COALESCE(AVG(actual_duration), 0)`,
      })
      .from(pomodoroSessions)
      .where(eq(pomodoroSessions.phase, "work"));

    const totalCompleted = totalCompletedRow?.count ?? 0;
    const totalStarted = totalStartedRow?.count ?? 0;
    const globalCompletionRate =
      totalStarted > 0 ? Math.round((totalCompleted / totalStarted) * 100) : 0;

    // ── Active users ─────────────────────────────────────────────────────────

    const today = todayStr();
    const sevenDaysAgo = nDaysAgo(6);
    const twentyNineDaysAgo = nDaysAgo(29);

    const [dauRow] = await db
      .select({ count: countDistinct(pomodoroSessions.userId) })
      .from(pomodoroSessions)
      .where(eq(pomodoroSessions.date, today));

    const [wauRow] = await db
      .select({ count: countDistinct(pomodoroSessions.userId) })
      .from(pomodoroSessions)
      .where(gte(pomodoroSessions.date, sevenDaysAgo));

    const [mauRow] = await db
      .select({ count: countDistinct(pomodoroSessions.userId) })
      .from(pomodoroSessions)
      .where(gte(pomodoroSessions.date, twentyNineDaysAgo));

    // ── Feature usage ────────────────────────────────────────────────────────

    const [distinctRoomsRow] = await db
      .select({ count: countDistinct(pomodoroSessions.roomId) })
      .from(pomodoroSessions)
      .where(isNotNull(pomodoroSessions.roomId));

    const [intentionsSetRow] = await db
      .select({ count: count() })
      .from(intentions);

    const [intentionsReflectedRow] = await db
      .select({ count: count() })
      .from(intentions)
      .where(
        sql`status IN ('completed', 'not_completed')`
      );

    const [achievementsUnlockedRow] = await db
      .select({ count: count() })
      .from(userAchievements);

    const [usersWithFriendsRow] = await db
      .select({ count: countDistinct(friendships.userIdA) })
      .from(friendships);

    // ── Peak usage hours ──────────────────────────────────────────────────────
    // Extract UTC hour from started_at (ISO 8601 text stored in LibSQL)
    const hourRows = await db
      .select({
        hour: sql<number>`CAST(strftime('%H', started_at) AS INTEGER)`,
        count: count(),
      })
      .from(pomodoroSessions)
      .where(
        and(
          eq(pomodoroSessions.phase, "work"),
          eq(pomodoroSessions.completed, true)
        )
      )
      .groupBy(sql`CAST(strftime('%H', started_at) AS INTEGER)`)
      .orderBy(sql`CAST(strftime('%H', started_at) AS INTEGER)`);

    // Fill all 24 hours with 0 for hours with no data
    const hourMap = new Map<number, number>();
    for (const row of hourRows) {
      hourMap.set(row.hour, row.count);
    }
    const peakHours = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      count: hourMap.get(h) ?? 0,
    }));

    // ── 30-day daily trend ────────────────────────────────────────────────────

    const trendRows = await db
      .select({
        date: pomodoroSessions.date,
        sessionsStarted: count(),
        sessionsCompleted: sql<number>`SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END)`,
        activeUsers: countDistinct(pomodoroSessions.userId),
      })
      .from(pomodoroSessions)
      .where(
        and(
          eq(pomodoroSessions.phase, "work"),
          gte(pomodoroSessions.date, thirtyDaysAgo)
        )
      )
      .groupBy(pomodoroSessions.date)
      .orderBy(pomodoroSessions.date);

    // Build a map for O(1) lookup then fill all 30 days
    const trendMap = new Map<
      string,
      { sessionsStarted: number; sessionsCompleted: number; activeUsers: number }
    >();
    for (const row of trendRows) {
      trendMap.set(row.date, {
        sessionsStarted: row.sessionsStarted,
        sessionsCompleted: Number(row.sessionsCompleted),
        activeUsers: row.activeUsers,
      });
    }

    const dailyTrend = Array.from({ length: 30 }, (_, i) => {
      const date = nDaysAgo(29 - i);
      const entry = trendMap.get(date);
      return {
        date,
        sessionsStarted: entry?.sessionsStarted ?? 0,
        sessionsCompleted: entry?.sessionsCompleted ?? 0,
        activeUsers: entry?.activeUsers ?? 0,
      };
    });

    return NextResponse.json({
      pomodoros: {
        totalCompleted,
        totalCompletedLast30Days: completedLast30Row?.count ?? 0,
        totalStarted,
        globalCompletionRate,
        avgActualDurationSeconds: Math.round(avgDurationRow?.avg ?? 0),
      },
      activeUsers: {
        dau: dauRow?.count ?? 0,
        wau: wauRow?.count ?? 0,
        mau: mauRow?.count ?? 0,
      },
      featureUsage: {
        distinctRoomsUsed: distinctRoomsRow?.count ?? 0,
        intentionsSet: intentionsSetRow?.count ?? 0,
        intentionsReflected: intentionsReflectedRow?.count ?? 0,
        achievementsUnlocked: achievementsUnlockedRow?.count ?? 0,
        usersWithFriends: usersWithFriendsRow?.count ?? 0,
      },
      peakHours,
      dailyTrend,
    });
  } catch (err) {
    console.error("[admin/usage] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
