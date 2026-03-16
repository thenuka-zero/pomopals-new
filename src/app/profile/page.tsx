import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ProfilePageContent from "@/components/ProfilePageContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Profile | PomoPals",
  description: "Manage your account information and preferences.",
};

function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-32 bg-white border-2 border-[#F0E6D3] rounded-2xl animate-pulse" />
      ))}
    </div>
  );
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  return (
    <div className="min-h-screen bg-[#FDF6EC]">
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfilePageContent />
      </Suspense>
    </div>
  );
}
