import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, friendships, friendRequests } from "@/lib/db/schema";
import { and, eq, like, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

// GET /api/users/search?q=<term>&limit=10
// Auth: Required + emailVerified
// Returns: { users: Array<{ id, name, email?, isFriend, hasPendingRequest }> }
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.emailVerified) {
    return NextResponse.json(
      { error: "Email verification required" },
      { status: 403 }
    );
  }

  const myId = session.user.id;
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const limitParam = parseInt(request.nextUrl.searchParams.get("limit") ?? "10");

  if (q.length < 3) {
    return NextResponse.json(
      { error: "Search query must be at least 3 characters" },
      { status: 400 }
    );
  }

  if (q.length > 100) {
    return NextResponse.json(
      { error: "Search query must be at most 100 characters" },
      { status: 400 }
    );
  }

  const limit = isNaN(limitParam) ? 10 : Math.min(limitParam, 20);
  const qLower = q.toLowerCase();
  // Escape LIKE special characters so user input can't expand the match pattern
  const qEscaped = q.replace(/[\\%_]/g, "\\$&");

  const results = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(
      and(
        or(
          like(users.name, `%${qEscaped}%`),
          eq(users.email, qLower)
        )
      )
    )
    .limit(limit + 1); // fetch one extra to handle self-exclusion

  const filtered = results
    .filter((u) => u.id !== myId)
    .slice(0, limit);

  // For each result, determine isFriend and hasPendingRequest
  const enriched = await Promise.all(
    filtered.map(async (u) => {
      const [pairA, pairB] = canonicalPair(myId, u.id);

      const [friendRow] = await db
        .select()
        .from(friendships)
        .where(
          and(
            eq(friendships.userIdA, pairA),
            eq(friendships.userIdB, pairB)
          )
        )
        .limit(1);

      const [pendingRow] = await db
        .select()
        .from(friendRequests)
        .where(
          and(
            eq(friendRequests.status, "pending"),
            or(
              and(
                eq(friendRequests.requesterId, myId),
                eq(friendRequests.recipientId, u.id)
              ),
              and(
                eq(friendRequests.requesterId, u.id),
                eq(friendRequests.recipientId, myId)
              )
            )
          )
        )
        .limit(1);

      // Only include email in results if the query exactly matched the email
      const includeEmail = u.email.toLowerCase() === qLower;

      return {
        id: u.id,
        name: u.name,
        ...(includeEmail ? { email: u.email } : {}),
        isFriend: !!friendRow,
        hasPendingRequest: !!pendingRow,
        // TODO: check blocks table
      };
    })
  );

  return NextResponse.json({ users: enriched });
}
