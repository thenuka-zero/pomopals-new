import { NextResponse } from "next/server";
import { randomBytes, randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, emailVerificationTokens } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = (body.name as string)?.trim();
    const email = (body.email as string)?.trim()?.toLowerCase();
    const password = body.password as string;

    // ── Validation ──────────────────────────────────────────────────────
    if (!name || name.length === 0) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    if (name.length > 100) {
      return NextResponse.json({ error: "Name must be 100 characters or fewer." }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }
    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    // ── Check email uniqueness ──────────────────────────────────────────
    // Always return the same success response whether or not the email exists,
    // to prevent account enumeration via 409 responses.
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (existingUser) {
      return NextResponse.json(
        { success: true, message: "Account created! Check your email to verify your account." },
        { status: 201 }
      );
    }

    // ── Create user ─────────────────────────────────────────────────────
    const now = new Date().toISOString();
    const userId = randomUUID();
    const passwordHash = await hashPassword(password);

    await db.insert(users).values({
      id: userId,
      name,
      email,
      passwordHash,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    });

    // ── Generate verification token ─────────────────────────────────────
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    await db.insert(emailVerificationTokens).values({
      id: randomUUID(),
      userId,
      token,
      expiresAt,
      createdAt: now,
    });

    // ── Send verification email ─────────────────────────────────────────
    await sendVerificationEmail(email, name, token);

    return NextResponse.json(
      { success: true, message: "Account created! Check your email to verify your account." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
