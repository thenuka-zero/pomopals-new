import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProfilePageContent from "@/components/ProfilePageContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Profile | PomoPals",
  description: "Manage your account information and preferences.",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  return (
    <main className="min-h-screen bg-[#FDF6EC]">
      <ProfilePageContent />
    </main>
  );
}
