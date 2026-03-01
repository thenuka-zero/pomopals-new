import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import IntentionsJournal from "@/components/IntentionsJournal";

export default async function IntentionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return <IntentionsJournal />;
}
