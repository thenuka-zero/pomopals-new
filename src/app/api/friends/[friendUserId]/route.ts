import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { friendships } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

// DELETE /api/friends/[friendUserId]
// Auth: Required
// Returns 200: { message: "Friendship removed" }
// Returns 404: not currently friends
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ friendUserId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const myId = session.user.id;
  const { friendUserId } = await params;

  const [pairA, pairB] = canonicalPair(myId, friendUserId);

  const result = await db
    .delete(friendships)
    .where(
      and(
        eq(friendships.userIdA, pairA),
        eq(friendships.userIdB, pairB)
      )
    );

  // LibSQL returns rowsAffected on delete
  if (!result.rowsAffected || result.rowsAffected === 0) {
    return NextResponse.json(
      { error: "Friendship not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ message: "Friendship removed" });
}
