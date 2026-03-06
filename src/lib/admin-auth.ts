import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Verifies that the current request is from the admin user.
 * Returns the session on success, or a 403 NextResponse on failure.
 *
 * Usage in API routes:
 *   const result = await requireAdmin();
 *   if (result instanceof NextResponse) return result;
 *   // result is the session
 */
export async function requireAdmin() {
  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    console.error("ADMIN_EMAIL env var is not set");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!session?.user?.email || session.user.email !== adminEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return session;
}
