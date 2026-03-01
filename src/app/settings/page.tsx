import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import SettingsPageContent from "@/components/SettingsPageContent";

export default async function SettingsRoute() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return (
    <main className="min-h-screen bg-[#FDF6EC] pt-20">
      <SettingsPageContent />
    </main>
  );
}
