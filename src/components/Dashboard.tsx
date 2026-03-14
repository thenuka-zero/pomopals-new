"use client";

import { useState, useId } from "react";
import { DailyAnalytics, PomodoroSession } from "@/lib/types";
import { format, parseISO } from "date-fns";
import FriendsActivityWidget from "@/components/FriendsActivityWidget";
import JoinRequestModal from "@/components/JoinRequestModal";
import AchievementWidget from "@/components/AchievementWidget";
import { DynamicStyle } from "@/components/DynamicStyle";

interface DashboardProps {
  todayData: DailyAnalytics | null;
  allData: DailyAnalytics[];
}

export default function Dashboard({ todayData, allData }: DashboardProps) {
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinTarget, setJoinTarget] = useState<{
    roomId: string;
    roomName: string;
    hostName: string;
  } | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const handleDiscard = async (sessionId: string) => {
    setDeletedIds((prev) => new Set([...prev, sessionId]));
    try {
      const res = await fetch(`/api/analytics/${sessionId}`, { method: "DELETE" });
      if (!res.ok) {
        setDeletedIds((prev) => { const next = new Set(prev); next.delete(sessionId); return next; });
      }
    } catch {
      setDeletedIds((prev) => { const next = new Set(prev); next.delete(sessionId); return next; });
    }
  };

  // Collect all sessions across all days, newest first
  const allSessions = allData
    .flatMap((d) => d.sessions)
    .filter((s) => !deletedIds.has(s.id))
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
      {/* Friends Activity */}
      <FriendsActivityWidget
        onJoin={(roomId, roomName, hostName) => {
          setJoinTarget({ roomId, roomName, hostName });
          setJoinModalOpen(true);
        }}
      />

      {joinModalOpen && joinTarget && (
        <JoinRequestModal
          isOpen={joinModalOpen}
          onClose={() => setJoinModalOpen(false)}
          roomId={joinTarget.roomId}
          roomName={joinTarget.roomName}
          hostName={joinTarget.hostName}
        />
      )}

      {/* Achievements */}
      <AchievementWidget />

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
                    <SessionRow key={session.id} session={session} onDiscard={handleDiscard} />
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

function SessionRow({ session, onDiscard }: { session: PomodoroSession; onDiscard: (id: string) => void }) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const actualMin = Math.round(session.actualDuration / 60);
  const plannedMin = Math.round(session.plannedDuration / 60);
  const timeStr = format(parseISO(session.startedAt), "h:mm a");
  const barId = `db-${useId().replace(/:/g, "")}`;

  return (
    <div className="flex items-center justify-between py-3 px-4 group">
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
          <DynamicStyle css={`#${barId} { width: ${session.completionPercentage}%; }`} />
          <div id={barId} className={`h-full rounded-full ${session.completed ? "bg-[#6EAE3E]" : "bg-[#E54B4B]"}`} />
        </div>
        <span className="text-xs text-[#8B7355] w-10 text-right font-semibold">
          {session.completionPercentage}%
        </span>
        {confirmDiscard ? (
          <div className="flex items-center gap-1 ml-1">
            <button
              onClick={() => onDiscard(session.id)}
              className="text-[10px] font-bold text-white bg-[#E54B4B] px-2 py-0.5 rounded-full hover:bg-[#D43D3D] transition-colors"
            >
              Discard
            </button>
            <button
              onClick={() => setConfirmDiscard(false)}
              className="text-[10px] font-bold text-[#8B7355] hover:text-[#3D2C2C] transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDiscard(true)}
            className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-[#C0A880] hover:text-[#E54B4B]"
            title="Discard this session"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        )}
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
