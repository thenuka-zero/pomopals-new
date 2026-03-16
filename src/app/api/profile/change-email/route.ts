import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, ne, and } from "drizzle-orm";
import { randomBytes } from "crypto";
import { sendEmailChangeVerification } from "@/lib/email";

export const dynamic = "force-dynamic";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await request.json().catch(() => ({}));
  const newEmail = String(body.newEmail ?? "").trim().toLowerCase();

  if (!newEmail || !isValidEmail(newEmail)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (newEmail === user.email.toLowerCase()) {
    return NextResponse.json({ error: "That is already your current email" }, { status: 400 });
  }

  // Rate limit: if there's a pending change with > 55 min remaining, block
  if (user.pendingEmailToken && user.pendingEmailExpiresAt) {
    const expiresAt = new Date(user.pendingEmailExpiresAt).getTime();
    if (expiresAt - Date.now() > 55 * 60 * 1000) {
      return NextResponse.json(
        { error: "A verification email was recently sent. Please check your inbox or wait before requesting again." },
        { status: 429 }
      );
    }
  }

  // Check new email not already taken
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, newEmail), ne(users.id, userId)))
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: "That email is already in use by another account" }, { status: 409 });
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  await db.update(users).set({
    pendingEmail: newEmail,
    pendingEmailToken: token,
    pendingEmailExpiresAt: expiresAt,
    updatedAt: new Date().toISOString(),
  }).where(eq(users.id, userId));

  await sendEmailChangeVerification(newEmail, user.name, token);

  return NextResponse.json({ message: `Verification email sent to ${newEmail}` });
}
