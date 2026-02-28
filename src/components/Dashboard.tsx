"use client";

import { DailyAnalytics, PomodoroSession } from "@/lib/types";
import { format, parseISO } from "date-fns";

interface DashboardProps {
  todayData: DailyAnalytics | null;
  allData: DailyAnalytics[];
}

export default function Dashboard({ todayData, allData }: DashboardProps) {
  // Collect all sessions across all days, newest first
  const allSessions = allData
    .flatMap((d) => d.sessions)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  // Group sessions by date
  const groupedByDate: Map<string, PomodoroSession[]> = new Map();
  for (const session of allSessions) {
    const dateKey = session.date;
    if (!groupedByDate.has(dateKey)) {
      groupedByDate.set(dateKey, []);
    }
    groupedByDate.get(dateKey)!.push(session);
  }

  return (
    <div className="space-y-8">
      {/* Today's Stats */}
      <section>
        <h2 className="text-sm text-[#8B7355] font-semibold mb-3 uppercase tracking-wide">Today</h2>
        {todayData && todayData.totalPomodoros > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Completed" value={todayData.completedPomodoros.toString()} />
            <StatCard label="Partial" value={todayData.partialPomodoros.toString()} />
            <StatCard label="Focus Time" value={`${Math.round(todayData.totalFocusMinutes)}m`} />
            <StatCard
              label="Completion"
              value={`${todayData.completionRate}%`}
            />
          </div>
        ) : (
          <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-6 text-center">
            <p className="text-[#A08060] text-sm">No Pomodoros yet today. Start one from the Timer!</p>
          </div>
        )}
      </section>

      {/* Full Pomodoro Log */}
      <section>
        <h2 className="text-sm text-[#8B7355] font-semibold mb-3 uppercase tracking-wide">Pomodoro Log</h2>
        {allSessions.length === 0 ? (
          <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-6 text-center">
            <p className="text-[#A08060] text-sm">No sessions recorded yet. Complete a Pomodoro to see it here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from(groupedByDate.entries()).map(([dateKey, sessions]) => (
              <div key={dateKey}>
                {/* Date header */}
                <h3 className="text-xs font-bold text-[#A08060] mb-2 uppercase tracking-wide">
                  {formatDateHeader(dateKey)}
                </h3>
                <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl overflow-hidden divide-y divide-[#F0E6D3]">
                  {sessions.map((session) => (
                    <SessionRow key={session.id} session={session} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SessionRow({ session }: { session: PomodoroSession }) {
  const actualMin = Math.round(session.actualDuration / 60);
  const plannedMin = Math.round(session.plannedDuration / 60);
  const timeStr = format(parseISO(session.startedAt), "h:mm a");

  return (
    <div className="flex items-center justify-between py-3 px-4">
      <div className="flex items-center gap-3">
        <div
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
            session.completed ? "bg-[#6EAE3E]" : "bg-[#E54B4B]"
          }`}
        />
        <div>
          <span className="text-sm text-[#3D2C2C] font-semibold">
            {actualMin}m / {plannedMin}m
          </span>
          <span className="text-xs text-[#A08060] ml-2">{timeStr}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-16 h-2.5 bg-[#F0E6D3] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${session.completed ? "bg-[#6EAE3E]" : "bg-[#E54B4B]"}`}
            style={{ width: `${session.completionPercentage}%` }}
          />
        </div>
        <span className="text-xs text-[#8B7355] w-10 text-right font-semibold">
          {session.completionPercentage}%
        </span>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-4 text-center">
      <div className="text-2xl font-extrabold text-[#E54B4B]">{value}</div>
      <div className="text-xs text-[#8B7355] mt-1 font-semibold">{label}</div>
    </div>
  );
}

function formatDateHeader(dateStr: string): string {
  const date = parseISO(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === today.toISOString().split("T")[0]) return "Today";
  if (dateStr === yesterday.toISOString().split("T")[0]) return "Yesterday";
  return format(date, "EEEE, MMM d");
}
