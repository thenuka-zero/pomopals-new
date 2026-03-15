"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useTimerStore, MIN_PROMPT_ELAPSED_SECONDS } from "@/store/timer-store";
import { useNotifications, unlockAudioContext, playStartSound, playEndSound } from "@/hooks/useNotifications";
import Settings from "@/components/Settings";
import CreateRoomModal from "@/components/CreateRoomModal";
import JoinRoomModal from "@/components/JoinRoomModal";
import IntentionReflectionModal from "@/components/IntentionReflectionModal";
import InterruptPromptModal from "@/components/InterruptPromptModal";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import { PomodoroSession } from "@/lib/types";

export default function CompactTimer() {
  const { data: session } = useSession();
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [showIntentionInput, setShowIntentionInput] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [intentionId, setIntentionId] = useState<string | null>(null);
  const [intentionsEnabled, setIntentionsEnabled] = useState(true);

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
    completeEarly,
    tick,
    lastTransitionType,
    hydratedAsExpired,
    isRemoteTransition,
    currentSessionStart,
    pendingInterruptPrompt,
    resolveInterruptPrompt,
  } = useTimerStore();

  const sessionRunId = useTimerStore((s) => s.sessionRunId);

  const currentIntention = useTimerStore((s) => s.currentIntention);
  const setCurrentIntention = useTimerStore((s) => s.setCurrentIntention);
  const pendingReflection = useTimerStore((s) => s.pendingReflection);
  const clearCurrentIntention = useTimerStore((s) => s.clearCurrentIntention);
  const setPendingReflection = useTimerStore((s) => s.setPendingReflection);
  const lastCompletedSessionId = useTimerStore((s) => s.lastCompletedSessionId);

  const roomId = useTimerStore((s) => s.roomId);
  const roomParticipantCount = useTimerStore((s) => s.roomParticipantCount);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { requestPermission, notifyPhaseComplete, notifyHydratedExpired } = useNotifications();
  const prevPhase = useRef(phase);
  const [flashPulse, setFlashPulse] = useState(false);

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

  // Phase-completion notification + end sound
  useEffect(() => {
    if (lastTransitionType === "completed" || (lastTransitionType === "skipped" && prevPhase.current === "work")) {
      if (!isRemoteTransition) playEndSound();
      const { showFlash } = notifyPhaseComplete(prevPhase.current, phase, {
        isRemote: isRemoteTransition,
      });
      if (showFlash) {
        setFlashPulse(true);
        setTimeout(() => setFlashPulse(false), 1200);
      }
    }
    prevPhase.current = phase;
  }, [phase, lastTransitionType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hydration late notification (timer expired while tab was closed)
  useEffect(() => {
    if (!hydratedAsExpired) return;
    const justCompleted: import("@/lib/types").TimerPhase =
      phase === "work" ? "shortBreak" : "work";
    notifyHydratedExpired(justCompleted);
    useTimerStore.setState({ hydratedAsExpired: false });
  }, [hydratedAsExpired]); // eslint-disable-line react-hooks/exhaustive-deps

  // Presence: update when status/phase changes
  useEffect(() => {
    if (!session?.user?.id) return;
    if (status === "running" && phase === "work") {
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true, roomId: null, roomName: null, phase: "work" }),
      }).catch(() => {});
    } else if (status === "paused" || status === "idle") {
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      }).catch(() => {});
    }
  }, [status, phase, session?.user?.id]);

  // Presence heartbeat every 60 seconds while running
  useEffect(() => {
    if (status !== "running" || phase !== "work" || !session?.user?.id) return;
    const interval = setInterval(() => {
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true, roomId: null, phase: "work" }),
      }).catch(() => {});
    }, 60_000);
    return () => clearInterval(interval);
  }, [status, phase, session?.user?.id]);

  // Record completed sessions to analytics API
  useEffect(() => {
    if (!session?.user?.id || sessions.length === 0) return;

    const lastSession = sessions[sessions.length - 1];
    if (lastSession.userId === "") {
      lastSession.userId = session.user.id;
      fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...lastSession,
          sessionRunId: sessionRunId,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          roomId: roomId ?? null,
          roomParticipantCount: roomParticipantCount ?? null,
        }),
      });
    }
  }, [sessions, session, sessionRunId, roomId, roomParticipantCount]);

  // Fetch intentionsEnabled setting
  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data?.settings?.intentionsEnabled === "boolean") {
          setIntentionsEnabled(data.settings.intentionsEnabled);
        }
      })
      .catch(() => {});
  }, [session?.user]);

  // Clear intentionId when leaving work phase and not pending reflection
  useEffect(() => {
    if (phase !== "work" && !pendingReflection) {
      setIntentionId(null);
      clearCurrentIntention();
    }
    // If work completed without an intention, clear the stuck pendingReflection
    if (pendingReflection && !intentionId && phase !== "work") {
      setPendingReflection(false);
      clearCurrentIntention();
    }
  }, [phase, pendingReflection, intentionId, setPendingReflection, clearCurrentIntention]);

  // Block browser unload when an interrupt prompt is pending
  useEffect(() => {
    if (!pendingInterruptPrompt) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [pendingInterruptPrompt]);

  // Record partial sessions when user navigates away + clear presence beacon
  useEffect(() => {
    const handleBeforeUnload = () => {
      // If an interrupt prompt is pending, skip the beacon to avoid double-counting
      const s = useTimerStore.getState();
      if (s.pendingInterruptPrompt) return;
      // Read fresh state from the store to avoid stale closures
      if (s.status === "running" && s.phase === "work" && session?.user?.id) {
        const totalDuration = s.settings.workDuration * 60;
        const elapsed = totalDuration - s.timeRemaining;
        if (elapsed > 0 && s.currentSessionStart) {
          const partialSession = {
            id: uuidv4(),
            userId: session.user.id,
            startedAt: new Date(s.currentSessionStart).toISOString(),
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
            new Blob([JSON.stringify({
              ...partialSession,
              sessionRunId: s.sessionRunId,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              roomId: s.roomId ?? null,
              roomParticipantCount: s.roomParticipantCount ?? null,
            })], {
              type: "application/json",
            })
          );
        }
      }
      // Always clear presence on page unload
      if (session?.user?.id) {
        navigator.sendBeacon(
          "/api/presence",
          new Blob([JSON.stringify({ isActive: false })], { type: "application/json" })
        );
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [session]);

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
        return "Pomodoro";
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

  const handleStart = useCallback(() => {
    // Create intention if text is set, user is authenticated, and no intention already created
    if (currentIntention.trim() && session?.user && !intentionId) {
      const newId = crypto.randomUUID();
      setIntentionId(newId);
      // Fire and forget — never block the timer
      fetch("/api/intentions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newId,
          text: currentIntention.trim(),
          startedAt: new Date().toISOString(),
          date: new Date().toISOString().slice(0, 10),
        }),
      }).catch(() => {});
    }
    setShowIntentionInput(false);
    start();
  }, [currentIntention, session?.user, intentionId, start]);

  const handleSkip = useCallback(() => {
    if (intentionId) {
      // Always show reflection modal when there's an active intention
      setPendingReflection(true);
      skip();
      return;
    }
    // No intention: use interrupt prompt for long sessions
    if (
      session?.user?.id &&
      phase === "work" &&
      currentSessionStart !== null &&
      (status === "running" || status === "paused")
    ) {
      const elapsed = settings.workDuration * 60 - timeRemaining;
      if (elapsed >= MIN_PROMPT_ELAPSED_SECONDS) {
        const deferredSession: PomodoroSession = {
          id: uuidv4(),
          userId: "",
          startedAt: new Date(currentSessionStart).toISOString(),
          endedAt: new Date().toISOString(),
          phase: "work",
          plannedDuration: settings.workDuration * 60,
          actualDuration: elapsed,
          completed: false,
          completionPercentage: Math.round((elapsed / (settings.workDuration * 60)) * 100),
          date: new Date().toISOString().split("T")[0],
        };
        skip({ deferAnalytics: true, deferredSession, intentionId: null });
        return;
      }
    }
    skip();
  }, [intentionId, setPendingReflection, skip, session?.user?.id, phase, currentSessionStart, status, settings.workDuration, timeRemaining]);

  const handleReset = useCallback(() => {
    if (intentionId) {
      // Always show reflection modal when there's an active intention
      setPendingReflection(true);
      reset();
      return;
    }
    // No intention: use interrupt prompt for long sessions
    if (
      session?.user?.id &&
      phase === "work" &&
      currentSessionStart !== null &&
      (status === "running" || status === "paused")
    ) {
      const elapsed = settings.workDuration * 60 - timeRemaining;
      if (elapsed >= MIN_PROMPT_ELAPSED_SECONDS) {
        const deferredSession: PomodoroSession = {
          id: uuidv4(),
          userId: "",
          startedAt: new Date(currentSessionStart).toISOString(),
          endedAt: new Date().toISOString(),
          phase: "work",
          plannedDuration: settings.workDuration * 60,
          actualDuration: elapsed,
          completed: false,
          completionPercentage: Math.round((elapsed / (settings.workDuration * 60)) * 100),
          date: new Date().toISOString().split("T")[0],
        };
        reset({ deferAnalytics: true, deferredSession, intentionId: null });
        return;
      }
    }
    reset();
  }, [intentionId, setPendingReflection, reset, session?.user?.id, phase, currentSessionStart, status, settings.workDuration, timeRemaining]);

  const handlePlayPause = useCallback(() => {
    if (status === "idle") {
      requestPermission();
      unlockAudioContext();
      playStartSound();
      handleStart();
    } else if (status === "running") {
      pause();
    } else if (status === "paused") {
      resume();
    }
  }, [status, handleStart, pause, resume, requestPermission]);

  const handleEndEarly = useCallback(() => {
    completeEarly();
  }, [completeEarly]);

  const userId =
    session?.user?.id || "guest-" + Math.random().toString(36).slice(2);
  const userName = session?.user?.name || "Guest";

  // Show intention icon when: user is logged in, intentions enabled, not running, work phase
  const showIntentionIcon =
    session?.user && intentionsEnabled && status !== "running" && phase === "work";

  // Show active intention display whenever an intention is set and the input isn't open
  const showActiveIntention = !!currentIntention && !showIntentionInput;

  const charCount = currentIntention.length;
  const isOverLimit = charCount > 280;

  return (
    <>
      <div className="w-full max-w-lg mx-auto">
        <div
          className={`bg-white border-2 rounded-2xl shadow-md overflow-hidden transition-all duration-300 ${
            flashPulse ? "border-[#E54B4B] shadow-[#E54B4B]/20" : "border-[#F0E6D3] shadow-[#3D2C2C]/5"
          }`}
        >
          {/* Compact bar */}
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
              {/* Tiny phase dot in center */}
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
                  #{isWork ? pomodoroCount + 1 : pomodoroCount}
                </span>
              </div>
            </div>

            {/* Intention icon */}
            {showIntentionIcon && (
              <button
                onClick={() => setShowIntentionInput(!showIntentionInput)}
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  showIntentionInput || currentIntention
                    ? "bg-[#E54B4B]/10 text-[#E54B4B]"
                    : "text-[#A08060] hover:text-[#E54B4B] hover:bg-[#FFF0F0]"
                }`}
                title="Set intention"
                aria-label="Set intention"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}

            {/* Play/Pause button */}
            <button
              onClick={handlePlayPause}
              className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                status === "running"
                  ? "bg-[#FFF0F0] text-[#E54B4B] hover:bg-[#FFE0E0]"
                  : "bg-[#E54B4B] text-white hover:bg-[#D43D3D] shadow-md shadow-[#E54B4B]/20"
              }`}
              title={status === "running" ? "Pause" : "Start"}
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
          </div>

          {/* Intention input — toggled via pencil icon */}
          {showIntentionInput && showIntentionIcon && (
            <div className="px-5 pb-3 -mt-1">
              <div className="flex gap-2 items-start">
                <textarea
                  rows={1}
                  value={currentIntention}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\n/g, "");
                    if (val.length <= 280) {
                      setCurrentIntention(val);
                      const el = e.target;
                      el.style.height = "auto";
                      el.style.height = el.scrollHeight + "px";
                    }
                  }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = el.scrollHeight + "px";
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (currentIntention.trim()) setShowIntentionInput(false);
                    }
                  }}
                  placeholder="What will you focus on?"
                  autoFocus
                  className={`
                    flex-1 px-3 py-2 rounded-lg text-sm
                    bg-[#F0E6D3]/40 border
                    ${isOverLimit ? "border-[#E54B4B]" : "border-[#E8D5C4]"}
                    text-[#3D2C2C] placeholder-[#A08060]
                    focus:outline-none focus:ring-2 focus:ring-[#E54B4B]/20 focus:border-[#E54B4B]/40
                    transition-colors resize-none overflow-hidden
                  `}
                />
                <button
                  onClick={() => setShowIntentionInput(false)}
                  disabled={!currentIntention.trim()}
                  className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#E54B4B]/10 text-[#E54B4B] hover:bg-[#E54B4B]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
                  title="Set intention"
                  aria-label="Confirm intention"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Active intention display when running */}
          {showActiveIntention && (
            <div className="px-5 pb-3 -mt-1">
              <div className="px-3 py-2 rounded-lg bg-[#F0E6D3]/50 text-sm text-[#5C4033] flex items-center justify-center gap-2">
                <span className="text-xs">💭</span>
                <span className="break-words">{currentIntention}</span>
              </div>
            </div>
          )}

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center py-1.5 text-[#B8A080] hover:text-[#E54B4B] transition-colors"
            title={expanded ? "Hide options" : "Show options"}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Collapsible section */}
          {expanded && (
            <>
              {/* Divider */}
              <div className="border-t border-[#F0E6D3] mx-5" />

              {/* Bottom icon row */}
              <div className="flex items-center gap-1 px-5 py-2">
                {/* Settings */}
                <button
                  onClick={() => setShowSettings(true)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#A08060] hover:text-[#E54B4B] hover:bg-[#FFF0F0] transition-all"
                  title="Settings"
                  aria-label="Settings"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>

                {/* Skip */}
                <button
                  onClick={handleSkip}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#A08060] hover:text-[#E54B4B] hover:bg-[#FFF0F0] transition-all"
                  title="Skip to next phase"
                  aria-label="Skip"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 4 15 12 5 20 5 4" />
                    <line x1="19" y1="5" x2="19" y2="19" />
                  </svg>
                </button>

                {/* Reset — always visible */}
                <button
                  onClick={handleReset}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#A08060] hover:text-[#E54B4B] hover:bg-[#FFF0F0] transition-all"
                  title="Reset timer"
                  aria-label="Reset"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                </button>

                {/* Finish Early — visible when running a work phase */}
                {status === "running" && phase === "work" && (
                  <button
                    onClick={handleEndEarly}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[#A08060] hover:text-[#6EAE3E] hover:bg-[#F0FDE4] transition-all"
                    title="Finish early & reflect"
                    aria-label="Finish early"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                )}

                <div className="flex-1" />

                {/* Host a Room — only when signed in */}
                {session && (
                  <button
                    onClick={() => setShowCreateRoom(true)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[#A08060] hover:text-[#E54B4B] hover:bg-[#FFF0F0] transition-all"
                    title="Host a Room"
                    aria-label="Host a Room"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="2" />
                      <path d="M16.24 7.76a6 6 0 0 1 0 8.49" />
                      <path d="M7.76 7.76a6 6 0 0 0 0 8.49" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                      <path d="M4.93 4.93a10 10 0 0 0 0 14.14" />
                    </svg>
                  </button>
                )}

                {/* Join a Room */}
                <button
                  onClick={() => setShowJoinRoom(true)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#A08060] hover:text-[#E54B4B] hover:bg-[#FFF0F0] transition-all"
                  title="Join a Room"
                  aria-label="Join a Room"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                </button>
              </div>

              {/* Sign-in prompt */}
              {!session && (
                <div className="px-5 pb-3 -mt-1">
                  <p className="text-[#A08060] text-xs text-center">
                    Sign in to save analytics and create rooms.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {pendingInterruptPrompt && session?.user && (
        <InterruptPromptModal
          elapsedSeconds={pendingInterruptPrompt.session.actualDuration}
          onCount={() => {
            if (pendingInterruptPrompt.intentionId) {
              fetch(`/api/intentions/${pendingInterruptPrompt.intentionId}/skip`, { method: "POST" }).catch(() => {});
            }
            resolveInterruptPrompt(true);
          }}
          onDiscard={() => resolveInterruptPrompt(false)}
        />
      )}
      {pendingReflection && intentionId && session?.user && intentionsEnabled && (
        <IntentionReflectionModal
          intentionId={intentionId}
          intentionText={currentIntention}
          sessionId={lastCompletedSessionId}
          onClose={() => {
            setPendingReflection(false);
            setIntentionId(null);
            clearCurrentIntention();
          }}
        />
      )}
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
