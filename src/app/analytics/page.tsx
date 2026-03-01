"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PeriodAnalytics, AnalyticsPeriod, PomodoroSession } from "@/lib/types";
import AnalyticsChart from "@/components/AnalyticsChart";
import AchievementDashboardWidget from "@/components/AchievementDashboardWidget";
import IntentionsDashboardWidget from "@/components/IntentionsDashboardWidget";
import { format, parseISO } from "date-fns";

const PERIOD_OPTIONS: { label: string; value: AnalyticsPeriod; count: number }[] = [
  { label: "Daily", value: "day", count: 14 },
  { label: "Weekly", value: "week", count: 8 },
  { label: "Monthly", value: "month", count: 6 },
];

export default function AnalyticsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<PeriodAnalytics[]>([]);
  const [period, setPeriod] = useState<AnalyticsPeriod>("day");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentOption = PERIOD_OPTIONS.find((o) => o.value === period)!;

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/analytics?period=${period}&count=${currentOption.count}`
      );
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/");
          return;
        }
        throw new Error("Failed to fetch analytics");
      }
      const data: PeriodAnalytics[] = await res.json();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [period, currentOption.count, router]);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (!session) {
      router.push("/");
      return;
    }
    fetchAnalytics();
  }, [session, authStatus, router, fetchAnalytics]);

  // Compute summary stats
  const totalFocusMinutes = analytics.reduce(
    (sum, d) => sum + d.totalFocusMinutes,
    0
  );
  const totalPomodoros = analytics.reduce((sum, d) => sum + d.totalPomodoros, 0);
  const completedPomodoros = analytics.reduce(
    (sum, d) => sum + d.completedPomodoros,
    0
  );
  const overallCompletionRate =
    totalPomodoros > 0 ? Math.round((completedPomodoros / totalPomodoros) * 100) : 0;

  // Compute streak: consecutive days with at least 1 completed pomodoro (from most recent backward)
  const streak = computeStreak(analytics);

  const focusHours = Math.floor(totalFocusMinutes / 60);
  const focusMins = Math.round(totalFocusMinutes % 60);

  // Gather all sessions for the recent list
  const allSessions = analytics
    .flatMap((d) => d.sessions)
    .sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    )
    .slice(0, 25);

  if (authStatus === "loading") {
    return <LoadingScreen />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#3D2C2C]">Dashboard</h1>
        <p className="text-[#8B7355] text-sm mt-1">
          Track your Pomodoro history and focus patterns.
        </p>
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-1 mb-6 bg-[#F0E6D3]/50 rounded-full p-1 w-fit">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 ${
              period === opt.value
                ? "bg-white text-[#E54B4B] shadow-sm"
                : "text-[#8B7355] hover:text-[#5C4033]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E54B4B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
          label="Focus Time"
          value={
            focusHours > 0
              ? `${focusHours}h ${focusMins}m`
              : `${focusMins}m`
          }
          color="#E54B4B"
        />
        <StatCard
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E54B4B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
          label="Pomodoros"
          value={totalPomodoros.toString()}
          subtitle={`${completedPomodoros} completed`}
          color="#E54B4B"
        />
        <StatCard
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6EAE3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20V10" />
              <path d="M18 20V4" />
              <path d="M6 20v-4" />
            </svg>
          }
          label="Completion Rate"
          value={`${overallCompletionRate}%`}
          color="#6EAE3E"
        />
        <StatCard
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E54B4B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          }
          label="Current Streak"
          value={`${streak} day${streak !== 1 ? "s" : ""}`}
          color="#E54B4B"
        />
      </div>

      {/* Chart */}
      {loading ? (
        <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-5 shadow-sm">
          <div className="h-[260px] flex items-center justify-center">
            <div className="text-[#A08060] font-semibold animate-pulse">
              Loading chart...
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-5 shadow-sm">
          <div className="h-[260px] flex flex-col items-center justify-center gap-3">
            <p className="text-[#E54B4B] font-semibold text-sm">{error}</p>
            <button
              onClick={fetchAnalytics}
              className="px-4 py-2 bg-[#E54B4B] text-white rounded-full text-sm font-bold hover:bg-[#D43D3D] transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      ) : (
        <AnalyticsChart data={analytics} period={period} />
      )}

      {/* Recent Sessions */}
      <div className="mt-6 bg-white border-2 border-[#F0E6D3] rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm text-[#8B7355] font-semibold mb-4">
          Recent Sessions
        </h3>
        {allSessions.length === 0 ? (
          <p className="text-[#A08060] text-sm py-4 text-center">
            No sessions recorded yet. Start a Pomodoro to see your history!
          </p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {allSessions.map((s) => (
              <SessionRow key={s.id} session={s} />
            ))}
          </div>
        )}
      </div>

      {/* Intentions + Achievements widgets */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <IntentionsDashboardWidget />
        <AchievementDashboardWidget />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  subtitle,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  color: string;
}) {
  return (
    <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}10` }}
        >
          {icon}
        </div>
      </div>
      <div className="text-2xl font-extrabold text-[#3D2C2C] leading-tight">
        {value}
      </div>
      <div className="text-xs text-[#8B7355] mt-0.5 font-semibold">{label}</div>
      {subtitle && (
        <div className="text-[10px] text-[#A08060] mt-0.5">{subtitle}</div>
      )}
    </div>
  );
}

function SessionRow({ session }: { session: PomodoroSession }) {
  const phaseLabel =
    session.phase === "work"
      ? "Work"
      : session.phase === "shortBreak"
      ? "Short Break"
      : "Long Break";

  const phaseColor =
    session.phase === "work" ? "#E54B4B" : "#6EAE3E";

  const durationMin = Math.round(session.actualDuration / 60);
  const plannedMin = Math.round(session.plannedDuration / 60);

  const isCompleted = session.completed;
  const pct = session.completionPercentage;

  return (
    <div className="flex items-center justify-between py-3 px-4 bg-[#FDF6EC] border border-[#F0E6D3] rounded-xl hover:border-[#E0D0B8] transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        {/* Phase badge */}
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: phaseColor }}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-[#3D2C2C] font-semibold">
              {durationMin}m / {plannedMin}m
            </span>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: `${phaseColor}15`,
                color: phaseColor,
              }}
            >
              {phaseLabel}
            </span>
          </div>
          <span className="text-xs text-[#A08060]">
            {format(parseISO(session.startedAt), "MMM d, h:mm a")}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        {/* Completion indicator */}
        {isCompleted ? (
          <div className="flex items-center gap-1.5">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6EAE3E"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-xs font-bold text-[#6EAE3E]">Done</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-16 h-2.5 bg-[#F0E6D3] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  backgroundColor: pct >= 50 ? "#E5A03E" : "#E54B4B",
                }}
              />
            </div>
            <span className="text-xs text-[#8B7355] w-10 text-right font-semibold">
              {pct}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-[#F0E6D3] border-t-[#E54B4B] rounded-full animate-spin" />
        <div className="text-[#A08060] font-semibold text-sm">Loading...</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute a streak of consecutive days (from most recent going backward)
 * that had at least one completed pomodoro.
 * Only meaningful when period === "day", otherwise returns 0.
 */
function computeStreak(analytics: PeriodAnalytics[]): number {
  // We work over all the sessions to compute day-level streaks regardless of period view
  const daySet = new Set<string>();
  for (const period of analytics) {
    for (const s of period.sessions) {
      if (s.completed) {
        daySet.add(s.date);
      }
    }
  }

  if (daySet.size === 0) return 0;

  // Walk backward from today
  let streak = 0;
  const today = new Date();
  for (let i = 0; i <= 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    if (daySet.has(dateStr)) {
      streak++;
    } else {
      // If today has no data, keep looking (day not over yet), but only for day 0
      if (i === 0) continue;
      break;
    }
  }

  return streak;
}
