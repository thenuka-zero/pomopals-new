import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminDashboardClient from "./AdminDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL;

  // Hard redirect if not admin — server-side, no flash
  if (!session?.user?.email || !adminEmail || session.user.email !== adminEmail) {
    redirect("/");
  }

  return <AdminDashboardClient />;
}
