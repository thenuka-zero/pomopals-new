import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const appUrl = process.env.APP_URL || "http://localhost:3000";

  if (!token) {
    return NextResponse.redirect(new URL("/profile?emailChangeError=invalid", appUrl));
  }

  const user = await db.query.users.findFirst({ where: eq(users.pendingEmailToken, token) });

  if (!user || !user.pendingEmail || !user.pendingEmailExpiresAt) {
    return NextResponse.redirect(new URL("/profile?emailChangeError=invalid", appUrl));
  }

  if (new Date(user.pendingEmailExpiresAt).getTime() < Date.now()) {
    return NextResponse.redirect(new URL("/profile?emailChangeError=expired", appUrl));
  }

  // Check pending email is still unique (race condition guard)
  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, user.pendingEmail), ne(users.id, user.id)))
    .limit(1);

  if (taken) {
    await db.update(users).set({
      pendingEmail: null,
      pendingEmailToken: null,
      pendingEmailExpiresAt: null,
      updatedAt: new Date().toISOString(),
    }).where(eq(users.id, user.id));
    return NextResponse.redirect(new URL("/profile?emailChangeError=taken", appUrl));
  }

  await db.update(users).set({
    email: user.pendingEmail,
    emailVerified: true,
    pendingEmail: null,
    pendingEmailToken: null,
    pendingEmailExpiresAt: null,
    updatedAt: new Date().toISOString(),
  }).where(eq(users.id, user.id));

  return NextResponse.redirect(new URL("/profile?emailChanged=true", appUrl));
}
