import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { count, gte, sql, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function nDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  // ISO 8601 full timestamp — used for >= comparison on created_at text column
  return d.toISOString().split("T")[0] + "T00:00:00.000Z";
}

export async function GET() {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  try {
    // ── Totals ───────────────────────────────────────────────────────────────

    const [totalUsersRow] = await db
      .select({ count: count() })
      .from(users);

    const [verifiedRow] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.emailVerified, true));

    const totalUsers = totalUsersRow?.count ?? 0;
    const verifiedUsers = verifiedRow?.count ?? 0;
    const unverifiedUsers = totalUsers - verifiedUsers;
    const verificationRate =
      totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0;

    // ── 90-day daily sign-ups ─────────────────────────────────────────────────
    // created_at is stored as ISO 8601 text e.g. "2025-09-01T14:32:00.000Z"
    // Use SQLite's DATE() function to extract just the date part for grouping.

    const ninetyDaysAgo = nDaysAgo(89); // inclusive of day 90

    const rawSignups = await db
      .select({
        date: sql<string>`DATE(created_at)`,
        newUsers: count(),
      })
      .from(users)
      .where(gte(users.createdAt, ninetyDaysAgo))
      .groupBy(sql`DATE(created_at)`)
      .orderBy(sql`DATE(created_at)`);

    // Build map and fill all 90 days (including days with 0 sign-ups)
    const signupMap = new Map<string, number>();
    for (const row of rawSignups) {
      signupMap.set(row.date, row.newUsers);
    }

    const nDaysAgoDate = (n: number): string => {
      const d = new Date();
      d.setDate(d.getDate() - n);
      return d.toISOString().split("T")[0];
    };

    const dailySignups = Array.from({ length: 90 }, (_, i) => {
      const date = nDaysAgoDate(89 - i);
      return { date, newUsers: signupMap.get(date) ?? 0 };
    });

    return NextResponse.json({
      totals: {
        totalUsers,
        verifiedUsers,
        unverifiedUsers,
        verificationRate,
      },
      dailySignups,
    });
  } catch (err) {
    console.error("[admin/signups] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
