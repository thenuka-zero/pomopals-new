import { NextResponse } from "next/server";
import { randomBytes, randomUUID } from "crypto";
import { eq, and, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, emailVerificationTokens } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";

export async function POST() {
  try {
    // Require authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Check if user is already verified
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ message: "Email is already verified." }, { status: 200 });
    }

    // Rate limiting: check for a token created within the last 60 seconds
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const recentToken = await db.query.emailVerificationTokens.findFirst({
      where: and(
        eq(emailVerificationTokens.userId, userId),
        isNull(emailVerificationTokens.usedAt),
        gt(emailVerificationTokens.createdAt, oneMinuteAgo)
      ),
    });

    if (recentToken) {
      return NextResponse.json(
        { error: "Please wait 60 seconds before requesting another email." },
        { status: 429 }
      );
    }

    // Invalidate all existing tokens for this user
    const now = new Date().toISOString();
    await db.update(emailVerificationTokens)
      .set({ usedAt: now })
      .where(and(
        eq(emailVerificationTokens.userId, userId),
        isNull(emailVerificationTokens.usedAt)
      ));

    // Generate new token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await db.insert(emailVerificationTokens).values({
      id: randomUUID(),
      userId,
      token,
      expiresAt,
      createdAt: now,
    });

    // Send verification email
    await sendVerificationEmail(user.email, user.name, token);

    return NextResponse.json(
      { success: true, message: "Verification email sent." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
