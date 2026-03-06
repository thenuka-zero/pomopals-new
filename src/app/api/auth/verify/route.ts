import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, emailVerificationTokens } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  const appUrl = process.env.APP_URL || request.nextUrl.origin;
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${appUrl}/?error=invalid-token`);
  }

  try {
    // Look up the token (unused only)
    const tokenRecord = await db.query.emailVerificationTokens.findFirst({
      where: and(
        eq(emailVerificationTokens.token, token),
        isNull(emailVerificationTokens.usedAt)
      ),
    });

    if (!tokenRecord) {
      return NextResponse.redirect(`${appUrl}/?error=invalid-token`);
    }

    // Check expiry
    if (new Date(tokenRecord.expiresAt) < new Date()) {
      return NextResponse.redirect(`${appUrl}/?error=token-expired`);
    }

    // Check if user is already verified (graceful handling for double-clicks)
    const user = await db.query.users.findFirst({
      where: eq(users.id, tokenRecord.userId),
    });

    const now = new Date().toISOString();

    if (user && user.emailVerified) {
      // Already verified — mark token as used and redirect gracefully
      await db.update(emailVerificationTokens)
        .set({ usedAt: now })
        .where(eq(emailVerificationTokens.id, tokenRecord.id));
      return NextResponse.redirect(`${appUrl}/?verified=true`);
    }

    // Verify the user
    await db.update(users)
      .set({ emailVerified: true, updatedAt: now })
      .where(eq(users.id, tokenRecord.userId));

    // Mark the token as used
    await db.update(emailVerificationTokens)
      .set({ usedAt: now })
      .where(eq(emailVerificationTokens.id, tokenRecord.id));

    return NextResponse.redirect(`${appUrl}/?verified=true`);
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.redirect(`${appUrl}/?error=invalid-token`);
  }
}
