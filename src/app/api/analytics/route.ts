import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { recordSession, getDailyAnalytics, getAnalyticsByPeriod } from "@/lib/analytics";
import { PomodoroSession, AnalyticsPeriod } from "@/lib/types";

const VALID_PERIODS: AnalyticsPeriod[] = ["day", "week", "month"];

export async function GET(request: NextRequest) {
  // Require authentication — get user from session
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const period = (request.nextUrl.searchParams.get("period") || "day") as AnalyticsPeriod;
  const count = parseInt(request.nextUrl.searchParams.get("count") || "7");

  if (!VALID_PERIODS.includes(period)) {
    return NextResponse.json(
      { error: `Invalid period. Must be one of: ${VALID_PERIODS.join(", ")}` },
      { status: 400 }
    );
  }

  if (isNaN(count) || count < 1 || count > 365) {
    return NextResponse.json(
      { error: "count must be a number between 1 and 365" },
      { status: 400 }
    );
  }

  const analytics = await getAnalyticsByPeriod(userId, period, count);
  return NextResponse.json(analytics);
}

export async function POST(request: NextRequest) {
  // Require authentication — get user from session
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Require email verification to save analytics
  if (!session.user.emailVerified) {
    return NextResponse.json(
      { error: "Please verify your email to save analytics." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const pomodoroSession: PomodoroSession = {
    ...body,
    // Always scope to the authenticated user, ignoring any userId in the body
    userId: session.user.id,
  };

  // Validate required fields
  if (!pomodoroSession.id || !pomodoroSession.startedAt || !pomodoroSession.phase || !pomodoroSession.date) {
    return NextResponse.json(
      { error: "Missing required session fields: id, startedAt, phase, date" },
      { status: 400 }
    );
  }

  // Ensure completionPercentage is within bounds
  if (typeof pomodoroSession.completionPercentage !== "number") {
    pomodoroSession.completionPercentage = pomodoroSession.completed ? 100 : 0;
  }
  pomodoroSession.completionPercentage = Math.max(0, Math.min(100, pomodoroSession.completionPercentage));

  await recordSession(pomodoroSession);
  return NextResponse.json({ success: true, sessionId: pomodoroSession.id });
}
