import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req: NextRequest & { auth?: { user?: { email?: string | null } } | null }) => {
  const { pathname } = req.nextUrl;
  const isAdminRoute =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  if (isAdminRoute) {
    const userEmail = req.auth?.user?.email;
    const adminEmail = process.env.ADMIN_EMAIL;

    const isAdmin =
      !!userEmail && !!adminEmail && userEmail === adminEmail;

    if (!isAdmin) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
