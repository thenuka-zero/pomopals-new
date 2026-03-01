"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useTimerStore } from "@/store/timer-store";
import Settings from "@/components/Settings";
import CreateRoomModal from "@/components/CreateRoomModal";
import JoinRoomModal from "@/components/JoinRoomModal";
import { v4 as uuidv4 } from "uuid";

export default function CompactTimer() {
  const { data: session } = useSession();
  const [expanded, setExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);

  const {
    phase,
    status,
    timeRemaining,
    pomodoroCount,
    settings,
    sessions,
    start,
    pause,
    resume,
    reset,
    skip,
    tick,
  } = useTimerStore();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Tick the timer
  useEffect(() => {
    if (status === "running") {
      intervalRef.current = setInterval(() => {
        tick();
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status, tick]);

  // Record completed sessions to analytics API
  useEffect(() => {
    if (!session?.user?.id || sessions.length === 0) return;

    const lastSession = sessions[sessions.length - 1];
    if (lastSession.userId === "") {
      lastSession.userId = session.user.id;
      fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lastSession),
      });
    }
  }, [sessions, session]);

  // Record partial sessions when user navigates away
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (status === "running" && phase === "work" && session?.user?.id) {
        const totalDuration = settings.workDuration * 60;
        const elapsed = totalDuration - timeRemaining;
        if (elapsed > 0) {
          const partialSession = {
            id: uuidv4(),
            userId: session.user.id,
            startedAt: new Date(Date.now() - elapsed * 1000).toISOString(),
            endedAt: new Date().toISOString(),
            phase: "work",
            plannedDuration: totalDuration,
            actualDuration: elapsed,
            completed: false,
            completionPercentage: Math.round((elapsed / totalDuration) * 100),
            date: new Date().toISOString().split("T")[0],
          };
          navigator.sendBeacon(
            "/api/analytics",
            new Blob([JSON.stringify(partialSession)], {
              type: "application/json",
            })
          );
        }
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [status, phase, settings, timeRemaining, session]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  const totalDuration = (() => {
    switch (phase) {
      case "work":
        return settings.workDuration * 60;
      case "shortBreak":
        return settings.shortBreakDuration * 60;
      case "longBreak":
        return settings.longBreakDuration * 60;
    }
  })();

  const progress = ((totalDuration - timeRemaining) / totalDuration) * 100;

  const phaseLabel = (() => {
    switch (phase) {
      case "work":
        return "Focus Time";
      case "shortBreak":
        return "Short Break";
      case "longBreak":
        return "Long Break";
    }
  })();

  const isWork = phase === "work";
  const progressStroke = isWork ? "#E54B4B" : "#6EAE3E";
  const trackStroke = isWork ? "#F5D0D0" : "#D0EDBC";
  const phaseColorClass = isWork ? "text-[#E54B4B]" : "text-[#6EAE3E]";

  // Small circular progress for compact view
  const compactRadius = 28;
  const compactCircumference = 2 * Math.PI * compactRadius;
  const compactStrokeDashoffset =
    compactCircumference - (progress / 100) * compactCircumference;

  // Large circular progress for expanded view
  const expandedRadius = 110;
  const expandedCircumference = 2 * Math.PI * expandedRadius;
  const expandedStrokeDashoffset =
    expandedCircumference - (progress / 100) * expandedCircumference;

  const handlePlayPause = useCallback(() => {
    if (status === "idle") start();
    else if (status === "running") pause();
    else if (status === "paused") resume();
  }, [status, start, pause, resume]);

  const userId =
    session?.user?.id || "guest-" + Math.random().toString(36).slice(2);
  const userName = session?.user?.name || "Guest";

  return (
    <>
      <div className="w-full max-w-lg mx-auto">
        {/* --- COMPACT VIEW --- */}
        <div
          className={`bg-white border-2 border-[#F0E6D3] rounded-2xl shadow-md shadow-[#3D2C2C]/5 overflow-hidden transition-all duration-500 ease-in-out ${
            expanded ? "max-h-[700px]" : "max-h-[120px]"
          }`}
        >
          {/* Compact bar - always visible */}
          <div className="flex items-center gap-4 px-5 py-4">
            {/* Mini circular progress */}
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg
                className="w-full h-full -rotate-90"
                viewBox="0 0 64 64"
              >
                <circle
                  cx="32"
                  cy="32"
                  r={compactRadius}
                  fill="none"
                  stroke={trackStroke}
                  strokeWidth="5"
                />
                <circle
                  cx="32"
                  cy="32"
                  r={compactRadius}
                  fill="none"
                  stroke={progressStroke}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={compactCircumference}
                  strokeDashoffset={compactStrokeDashoffset}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              {/* Tiny tomato or phase dot in center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isWork ? "bg-[#E54B4B]" : "bg-[#6EAE3E]"
                  }`}
                />
              </div>
            </div>

            {/* Time and phase label */}
            <div className="flex-1 min-w-0">
              <div className="text-3xl font-extrabold text-[#3D2C2C] tabular-nums font-mono leading-tight">
                {String(minutes).padStart(2, "0")}:
                {String(seconds).padStart(2, "0")}
              </div>
              <div
                className={`text-sm font-semibold ${phaseColorClass} leading-tight mt-0.5`}
              >
                {phaseLabel}
                <span className="text-[#B8A080] font-normal ml-2">
                  #{pomodoroCount + 1}
                </span>
              </div>
            </div>

            {/* Play/Pause button */}
            <button
              onClick={handlePlayPause}
              className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                status === "running"
                  ? "bg-[#FFF0F0] text-[#E54B4B] hover:bg-[#FFE0E0]"
                  : "bg-[#E54B4B] text-white hover:bg-[#D43D3D] shadow-md shadow-[#E54B4B]/20"
              }`}
              aria-label={status === "running" ? "Pause" : "Start"}
            >
              {status === "running" ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Expand/Collapse toggle */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#A08060] hover:text-[#E54B4B] hover:bg-[#FFF0F0] transition-all flex-shrink-0"
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-300 ${
                  expanded ? "rotate-180" : ""
                }`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          {/* --- EXPANDED VIEW --- */}
          <div
            className={`transition-all duration-500 ease-in-out ${
              expanded
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-4 pointer-events-none"
            }`}
          >
            <div className="px-5 pb-6">
              {/* Divider */}
              <div className="border-t border-[#F0E6D3] mb-6" />

              {/* Full circular timer */}
              <div className="flex flex-col items-center gap-5">
                <div className="relative w-60 h-60 sm:w-64 sm:h-64">
                  <svg
                    className="w-full h-full -rotate-90"
                    viewBox="0 0 256 256"
                  >
                    <circle
                      cx="128"
                      cy="128"
                      r={expandedRadius}
                      fill="none"
                      stroke={trackStroke}
                      strokeWidth="7"
                    />
                    <circle
                      cx="128"
                      cy="128"
                      r={expandedRadius}
                      fill="none"
                      stroke={progressStroke}
                      strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={expandedCircumference}
                      strokeDashoffset={expandedStrokeDashoffset}
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl sm:text-6xl font-extrabold text-[#3D2C2C] tabular-nums font-mono">
                      {String(minutes).padStart(2, "0")}:
                      {String(seconds).padStart(2, "0")}
                    </span>
                    <span className="text-sm text-[#A08060] mt-1 font-semibold">
                      Pomodoro #{pomodoroCount + 1}
                    </span>
                  </div>
                </div>

                {/* Pomodoro dots */}
                <div className="flex gap-2">
                  {Array.from(
                    { length: settings.longBreakInterval },
                    (_, i) => (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-full transition-colors ${
                          i < pomodoroCount % settings.longBreakInterval
                            ? "bg-[#E54B4B]"
                            : i ===
                                pomodoroCount % settings.longBreakInterval &&
                              phase === "work"
                            ? "bg-[#F5A0A0]"
                            : "bg-[#F0E6D3]"
                        }`}
                      />
                    )
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3 mt-1">
                  {status === "idle" && (
                    <button
                      onClick={start}
                      className="px-8 py-3 bg-[#E54B4B] text-white rounded-full font-bold shadow-lg shadow-[#E54B4B]/25 hover:bg-[#D43D3D] hover:-translate-y-0.5 transition-all"
                    >
                      Start
                    </button>
                  )}
                  {status === "running" && (
                    <button
                      onClick={pause}
                      className="px-8 py-3 bg-white border-2 border-[#F0E6D3] text-[#5C4033] rounded-full font-bold hover:border-[#E54B4B]/30 transition-all"
                    >
                      Pause
                    </button>
                  )}
                  {status === "paused" && (
                    <>
                      <button
                        onClick={resume}
                        className="px-8 py-3 bg-[#E54B4B] text-white rounded-full font-bold shadow-lg shadow-[#E54B4B]/25 hover:bg-[#D43D3D] transition-all"
                      >
                        Resume
                      </button>
                      <button
                        onClick={reset}
                        className="px-6 py-3 bg-white border-2 border-[#F0E6D3] text-[#5C4033] rounded-full font-bold hover:border-[#E54B4B]/30 transition-all"
                      >
                        Reset
                      </button>
                    </>
                  )}
                  <button
                    onClick={skip}
                    className="px-4 py-3 text-[#A08060] hover:text-[#E54B4B] transition-colors"
                    title="Skip to next phase"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M5 5v14l11-7z" />
                      <path d="M19 5v14h-2V5h2z" />
                    </svg>
                  </button>
                </div>

                {/* Action buttons row */}
                <div className="flex flex-wrap justify-center gap-2.5 mt-2">
                  <button
                    onClick={() => setShowSettings(true)}
                    className="px-4 py-2 bg-[#FDF6EC] border-2 border-[#F0E6D3] rounded-full text-sm font-semibold text-[#5C4033] hover:bg-[#F5EDE0] hover:border-[#E54B4B]/30 transition-all flex items-center gap-1.5"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    Settings
                  </button>

                  {session && (
                    <button
                      onClick={() => setShowCreateRoom(true)}
                      className="px-4 py-2 bg-[#FDF6EC] border-2 border-[#F0E6D3] rounded-full text-sm font-semibold text-[#5C4033] hover:bg-[#F5EDE0] hover:border-[#E54B4B]/30 transition-all flex items-center gap-1.5"
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Create Room
                    </button>
                  )}

                  <button
                    onClick={() => setShowJoinRoom(true)}
                    className="px-4 py-2 bg-[#FDF6EC] border-2 border-[#F0E6D3] rounded-full text-sm font-semibold text-[#5C4033] hover:bg-[#F5EDE0] hover:border-[#E54B4B]/30 transition-all flex items-center gap-1.5"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    Join Room
                  </button>
                </div>

                {!session && (
                  <p className="text-[#A08060] text-xs text-center mt-1">
                    Sign in to save analytics and create rooms.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <Settings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
      {session && (
        <CreateRoomModal
          isOpen={showCreateRoom}
          onClose={() => setShowCreateRoom(false)}
          userId={userId}
          userName={userName}
          timerState={{ phase, status, timeRemaining, pomodoroCount, settings }}
        />
      )}
      <JoinRoomModal
        isOpen={showJoinRoom}
        onClose={() => setShowJoinRoom(false)}
      />
    </>
  );
}
