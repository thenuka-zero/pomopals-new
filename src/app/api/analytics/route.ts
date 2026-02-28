import { NextRequest, NextResponse } from "next/server";
import { recordSession, getDailyAnalytics } from "@/lib/analytics";
import { PomodoroSession } from "@/lib/types";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  const days = parseInt(request.nextUrl.searchParams.get("days") || "7");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const analytics = getDailyAnalytics(userId, days);
  return NextResponse.json(analytics);
}

export async function POST(request: NextRequest) {
  const session: PomodoroSession = await request.json();

  if (!session.userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  recordSession(session);
  return NextResponse.json({ success: true });
}
