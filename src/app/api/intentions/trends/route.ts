import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getIntentionTrends } from "@/lib/analytics";

export const dynamic = "force-dynamic";

// GET /api/intentions/trends — Aggregated trends and streaks
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const trends = await getIntentionTrends(userId);
  return NextResponse.json(trends);
}
