import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import FriendsPage from "@/components/FriendsPage";

export default async function FriendsPageRoute() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return (
    <main className="min-h-screen bg-[#FDF6EC] pt-20">
      <FriendsPage />
    </main>
  );
}
