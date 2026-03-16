"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RoomResponse, TimerPhase, RoomJoinRequest, PomodoroSession } from "@/lib/types";
import { useTimerStore, MIN_PROMPT_ELAPSED_SECONDS } from "@/store/timer-store";
import { useNotifications, unlockAudioContext } from "@/hooks/useNotifications";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { v4 as uuidv4 } from "uuid";
import Timer from "./Timer";
import RoomJoinRequestBanner from "./RoomJoinRequestBanner";
import TaskList from "./TaskList";
import IntentionReflectionModal from "./IntentionReflectionModal";
import InterruptPromptModal from "./InterruptPromptModal";
import type { TaskItem } from "@/lib/types";

interface RoomViewProps {
  roomId: string;
  userId: string;
  userName: string;
}

export default function RoomView({ roomId, userId, userName }: RoomViewProps) {
  const { data: session } = useSession();
  const [room, setRoom] = useState<RoomResponse | null>(null);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);
  const [copied, setCopied] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [joinRequests, setJoinRequests] = useState<RoomJoinRequest[]>([]);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [draftSettings, setDraftSettings] = useState<{ workDuration: number; shortBreakDuration: number; longBreakDuration: number; longBreakInterval: number; autoStartBreaks: boolean } | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const syncState = useTimerStore((s) => s.syncState);
  const updateSettings = useTimerStore((s) => s.updateSettings);
  const setRoomContext = useTimerStore((s) => s.setRoomContext);
  const timerPhase = useTimerStore((s) => s.phase);
  const roomTaskList = useTimerStore((s) => s.roomTaskList);
  const roomSessionGroupId = useTimerStore((s) => s.roomSessionGroupId);
  const setRoomSessionGroupId = useTimerStore((s) => s.setRoomSessionGroupId);
  const clearRoomTaskList = useTimerStore((s) => s.clearRoomTaskList);
  const pendingReflection = useTimerStore((s) => s.pendingReflection);
  const setPendingReflection = useTimerStore((s) => s.setPendingReflection);
  const lastCompletedSessionId = useTimerStore((s) => s.lastCompletedSessionId);
  const pendingInterruptPrompt = useTimerStore((s) => s.pendingInterruptPrompt);
  const resolveInterruptPrompt = useTimerStore((s) => s.resolveInterruptPrompt);
  const [intentionsEnabled, setIntentionsEnabled] = useState(true);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const { requestPermission, notifyPhaseComplete } = useNotifications();
  const prevRoomPhase = useRef<TimerPhase | null>(null);
  const prevRoomTimeRemaining = useRef<number>(Infinity);
  const prevRoomStatus = useRef<string | null>(null);
  const roomWorkSessionStartRef = useRef<number | null>(null);
  const isLeavingRef = useRef(false);
  // Track whether we've saved the room session group to the API
  const savedRoomSessionGroupRef = useRef<string | null>(null);

  const isAdmin = room?.hostId === userId;
  const isPrivilegedUser = isAdmin || (room?.coHostIds?.includes(userId) ?? false);
  const isAdminRef = useRef(false);
  isAdminRef.current = isAdmin;

  // Debounce timer for syncing tasks to room
  const syncTasksTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Set room context in timer store for session recording
  useEffect(() => {
    if (room) {
      setRoomContext(roomId, room.participants.length);
    }
    return () => {
      setRoomContext(null, null);
    };
  }, [roomId, room?.participants.length, setRoomContext]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Clear room task list when leaving work phase and not pending reflection
  useEffect(() => {
    if (timerPhase !== "work" && !pendingReflection) {
      // Keep room tasks across phases (tasks persist)
    }
  }, [timerPhase, pendingReflection]);

  const syncRoomTasks = useCallback((tasks: TaskItem[]) => {
    if (!session?.user) return;
    if (syncTasksTimerRef.current) clearTimeout(syncTasksTimerRef.current);
    syncTasksTimerRef.current = setTimeout(() => {
      fetch(`/api/rooms/${roomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set-tasks",
          userId,
          tasks: tasks.map((t) => ({
            text: t.text,
            status: t.status === "done" ? "done" : t.status === "skipped" ? "skipped" : "pending",
          })),
        }),
      }).catch(() => {});
    }, 500);
  }, [roomId, userId, session?.user]);

  const fetchJoinRequests = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`/api/rooms/${roomId}/join-requests`);
      if (!res.ok) return;
      const data = await res.json();
      const pending = (data.joinRequests ?? []).filter(
        (r: RoomJoinRequest) => r.status === "pending"
      );
      setJoinRequests(pending);
    } catch {
      // ignore
    }
  }, [roomId, isAdmin]);

  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${roomId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("This room has ended.");
          return;
        }
        setFailCount((c) => c + 1);
        return;
      }
      const data: RoomResponse = await res.json();
      setRoom(data);
      setFailCount(0);
      updateSettings(data.settings);

      const newPhase = data.timerState.phase;
      const newTimeRemaining = data.timerState.timeRemaining;

      // Detect natural phase transition
      if (
        prevRoomPhase.current !== null &&
        prevRoomPhase.current !== newPhase &&
        prevRoomTimeRemaining.current <= 10
      ) {
        notifyPhaseComplete(prevRoomPhase.current, newPhase, { isRemote: false });

        // Natural work session completion
        if (prevRoomPhase.current === "work") {
          const workDuration = data.settings.workDuration * 60;
          const sessionId = uuidv4();
          if (session?.user?.id) {
            const startedAt = roomWorkSessionStartRef.current
              ? new Date(roomWorkSessionStartRef.current).toISOString()
              : new Date(Date.now() - workDuration * 1000).toISOString();
            fetch("/api/analytics", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: sessionId,
                userId: session.user.id,
                startedAt,
                endedAt: new Date().toISOString(),
                phase: "work",
                plannedDuration: workDuration,
                actualDuration: workDuration,
                completed: true,
                completionPercentage: 100,
                date: new Date().toISOString().split("T")[0],
                sessionRunId: useTimerStore.getState().sessionRunId,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                roomId,
                roomParticipantCount: data.participants.length,
              }),
            }).catch(() => {});
          }
          // Trigger reflection if we have tasks
          const s = useTimerStore.getState();
          if (s.roomTaskList.length > 0 && s.roomSessionGroupId) {
            // Mark in_progress tasks as done
            useTimerStore.setState({
              roomTaskList: s.roomTaskList.map((t) =>
                t.status === "in_progress" ? { ...t, status: "done" as const } : t
              ),
              pendingReflection: true,
              lastCompletedSessionId: session?.user?.id ? sessionId : null,
            });
          }
          roomWorkSessionStartRef.current = null;
        }
      }

      // Detect skip: phase changed while time was still > 10s remaining
      if (
        prevRoomPhase.current === "work" &&
        prevRoomPhase.current !== newPhase &&
        prevRoomTimeRemaining.current > 10
      ) {
        // Batch-skip pending room tasks
        const s = useTimerStore.getState();
        if (s.roomSessionGroupId && session?.user) {
          fetch("/api/intentions/batch-skip", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionGroupId: s.roomSessionGroupId }),
          }).catch(() => {});
          useTimerStore.setState({ roomSessionGroupId: null });
          savedRoomSessionGroupRef.current = null;
        }
        roomWorkSessionStartRef.current = null;
      }

      const newStatus = data.timerState.status;

      // Track work session start
      if (
        newStatus === "running" &&
        newPhase === "work" &&
        (prevRoomStatus.current !== "running" || prevRoomPhase.current !== "work") &&
        !roomWorkSessionStartRef.current
      ) {
        roomWorkSessionStartRef.current = Date.now();
      }

      // Non-privileged participants: save tasks when room timer starts
      if (
        !isAdminRef.current &&
        session?.user &&
        prevRoomStatus.current !== null &&
        prevRoomStatus.current !== "running" &&
        newStatus === "running" &&
        newPhase === "work"
      ) {
        const s = useTimerStore.getState();
        const tasks = s.roomTaskList;
        if (tasks.length > 0) {
          let sgId = s.roomSessionGroupId;
          if (!sgId) {
            sgId = crypto.randomUUID();
            useTimerStore.setState({ roomSessionGroupId: sgId });
          }
          if (savedRoomSessionGroupRef.current !== sgId) {
            savedRoomSessionGroupRef.current = sgId;
            fetch("/api/intentions/batch", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tasks: tasks.map((t) => ({
                  id: t.id,
                  text: t.text,
                  startedAt: new Date().toISOString(),
                  date: new Date().toISOString().slice(0, 10),
                })),
                sessionGroupId: sgId,
              }),
            }).catch(() => {});
          }
        }
      }

      prevRoomPhase.current = newPhase;
      prevRoomTimeRemaining.current = newTimeRemaining;
      prevRoomStatus.current = newStatus;

      if (isLeavingRef.current) return;
      syncState(newPhase, newStatus, newTimeRemaining, data.timerState.pomodoroCount);

      if (data.hostId === userId) {
        fetchJoinRequests();
      }
    } catch {
      setFailCount((c) => c + 1);
    }
  }, [roomId, syncState, updateSettings, notifyPhaseComplete, userId, fetchJoinRequests, session?.user, session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Join on mount
  useEffect(() => {
    if (joined) return;
    const join = async () => {
      const HOST_KEY = `pomopals-was-host-${roomId}-${userId}`;
      const shouldReclaimHost = sessionStorage.getItem(HOST_KEY) === "1";
      if (shouldReclaimHost) sessionStorage.removeItem(HOST_KEY);

      try {
        const res = await fetch(`/api/rooms/${roomId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "join", userId, userName }),
        });
        if (res.ok) {
          setJoined(true);
          if (shouldReclaimHost) {
            await fetch(`/api/rooms/${roomId}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "reclaim-host", userId }),
            }).catch(() => {});
          }
          fetchRoom();
        } else if (res.status === 403) {
          setError("This room is full (max 20 participants).");
        } else {
          setError("Room not found.");
        }
      } catch {
        setError("Failed to join room.");
      }
    };
    join();
  }, [roomId, userId, userName, joined, fetchRoom]);

  // Polling with recursive setTimeout
  useEffect(() => {
    if (!joined) return;
    let cancelled = false;
    const poll = async () => {
      await fetchRoom();
      if (!cancelled) {
        pollTimeoutRef.current = setTimeout(poll, 1000);
      }
    };
    poll();
    return () => {
      cancelled = true;
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
  }, [joined, fetchRoom]);

  // Leave on unmount / tab close
  useEffect(() => {
    if (!joined) return;

    const HOST_KEY = `pomopals-was-host-${roomId}-${userId}`;
    let unloadBeaconSent = false;

    const handleBeforeUnload = () => {
      unloadBeaconSent = true;
      if (isAdminRef.current) {
        sessionStorage.setItem(HOST_KEY, "1");
      }
      navigator.sendBeacon(
        `/api/rooms/${roomId}`,
        new Blob([JSON.stringify({ action: "leave", userId })], { type: "application/json" })
      );
      navigator.sendBeacon(
        "/api/presence",
        new Blob([JSON.stringify({ isActive: false })], { type: "application/json" })
      );
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      isLeavingRef.current = true;
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (!unloadBeaconSent) {
        navigator.sendBeacon(
          `/api/rooms/${roomId}`,
          new Blob([JSON.stringify({ action: "leave", userId })], { type: "application/json" })
        );
        navigator.sendBeacon(
          "/api/presence",
          new Blob([JSON.stringify({ isActive: false })], { type: "application/json" })
        );
      }
      const s = useTimerStore.getState();
      useTimerStore.setState({
        status: "idle",
        phase: "work",
        timeRemaining: s.settings.workDuration * 60,
        startedAt: null,
        elapsed: 0,
        roomTaskList: [],
        roomSessionGroupId: null,
        pendingReflection: false,
        lastCompletedSessionId: null,
        pendingInterruptPrompt: null,
        lastTransitionType: null,
        roomId: null,
        roomParticipantCount: null,
      });
    };
  }, [roomId, userId, joined]);

  // Set presence when joined
  useEffect(() => {
    if (!joined || !session?.user?.id || !room) return;
    const currentPhase = room.timerState.phase;
    const currentStatus = room.timerState.status;
    if (currentStatus === "running" && currentPhase === "work") {
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: true,
          roomId,
          roomName: room.name ?? null,
          phase: "work",
        }),
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined, session?.user?.id]);

  const handleApproveJoinRequest = async (requestId: string) => {
    await fetch(`/api/rooms/${roomId}/join-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    fetchJoinRequests();
    fetchRoom();
  };

  const handleDenyJoinRequest = async (requestId: string) => {
    await fetch(`/api/rooms/${roomId}/join-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deny" }),
    });
    fetchJoinRequests();
  };

  const sendAction = async (action: string) => {
    await fetch(`/api/rooms/${roomId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, userId }),
    });
    fetchRoom();
  };

  const handleParticipantAction = async (action: string, targetUserId: string) => {
    await fetch(`/api/rooms/${roomId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, userId, targetUserId }),
    });
    fetchRoom();
  };

  const handleRoomStart = () => {
    roomWorkSessionStartRef.current = Date.now();
    // Privileged user: generate room session group and batch-save tasks
    if (session?.user && isPrivilegedUser) {
      const s = useTimerStore.getState();
      const tasks = s.roomTaskList;
      if (tasks.length > 0) {
        let sgId = s.roomSessionGroupId;
        if (!sgId) {
          sgId = crypto.randomUUID();
          useTimerStore.setState({ roomSessionGroupId: sgId });
        }
        if (savedRoomSessionGroupRef.current !== sgId) {
          savedRoomSessionGroupRef.current = sgId;
          fetch("/api/intentions/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tasks: tasks.map((t) => ({
                id: t.id,
                text: t.text,
                startedAt: new Date().toISOString(),
                date: new Date().toISOString().slice(0, 10),
              })),
              sessionGroupId: sgId,
            }),
          }).catch(() => {});
        }
      }
    }
    requestPermission();
    unlockAudioContext();
    sendAction("start");
  };

  const handleRoomSkip = () => {
    // No task status changes on skip
    const s = useTimerStore.getState();
    if (
      session?.user?.id &&
      s.phase === "work" &&
      s.currentSessionStart !== null &&
      (s.status === "running" || s.status === "paused")
    ) {
      const elapsed = s.settings.workDuration * 60 - s.timeRemaining;
      if (elapsed >= MIN_PROMPT_ELAPSED_SECONDS) {
        const deferredSession: PomodoroSession = {
          id: uuidv4(),
          userId: "",
          startedAt: new Date(s.currentSessionStart).toISOString(),
          endedAt: new Date().toISOString(),
          phase: "work",
          plannedDuration: s.settings.workDuration * 60,
          actualDuration: elapsed,
          completed: false,
          completionPercentage: Math.round((elapsed / (s.settings.workDuration * 60)) * 100),
          date: new Date().toISOString().split("T")[0],
        };
        sendAction("skip");
        useTimerStore.setState({ pendingInterruptPrompt: { session: deferredSession, action: "skip", sessionGroupId: s.roomSessionGroupId } });
        return;
      }
    }
    sendAction("skip");
  };

  const handleRoomReset = () => {
    // Batch-skip pending room tasks on reset
    const s = useTimerStore.getState();
    if (s.roomSessionGroupId && session?.user) {
      fetch("/api/intentions/batch-skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionGroupId: s.roomSessionGroupId }),
      }).catch(() => {});
      useTimerStore.setState({
        roomSessionGroupId: null,
        roomTaskList: s.roomTaskList.map((t) =>
          t.status === "in_progress" ? { ...t, status: "pending" as const } : t
        ),
      });
      savedRoomSessionGroupRef.current = null;
    }
    roomWorkSessionStartRef.current = null;
    const s2 = useTimerStore.getState();
    if (
      session?.user?.id &&
      s2.phase === "work" &&
      s2.currentSessionStart !== null &&
      (s2.status === "running" || s2.status === "paused")
    ) {
      const elapsed = s2.settings.workDuration * 60 - s2.timeRemaining;
      if (elapsed >= MIN_PROMPT_ELAPSED_SECONDS) {
        const deferredSession: PomodoroSession = {
          id: uuidv4(),
          userId: "",
          startedAt: new Date(s2.currentSessionStart).toISOString(),
          endedAt: new Date().toISOString(),
          phase: "work",
          plannedDuration: s2.settings.workDuration * 60,
          actualDuration: elapsed,
          completed: false,
          completionPercentage: Math.round((elapsed / (s2.settings.workDuration * 60)) * 100),
          date: new Date().toISOString().split("T")[0],
        };
        sendAction("reset");
        useTimerStore.setState({ pendingInterruptPrompt: { session: deferredSession, action: "reset", sessionGroupId: null } });
        return;
      }
    }
    sendAction("reset");
  };

  const handleLeaveRoom = () => {
    router.push("/");
  };

  const handleEndRoom = async () => {
    if (!confirm("End this session? All participants will be disconnected.")) return;
    await fetch(`/api/rooms/${roomId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "end", userId }),
    });
    router.push("/");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-[#E54B4B] text-lg font-semibold">{error}</div>
        <a href="/" className="px-6 py-2.5 bg-[#E54B4B] text-white rounded-full font-bold hover:bg-[#D43D3D] transition-colors">
          Go Home
        </a>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-[#A08060] font-semibold">Joining room...</div>
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col items-center gap-8">
      {/* Join request banner for host */}
      {isAdmin && joinRequests.length > 0 && (
        <div className="w-full max-w-sm">
          <RoomJoinRequestBanner
            requests={joinRequests}
            roomId={roomId}
            onApprove={handleApproveJoinRequest}
            onDeny={handleDenyJoinRequest}
          />
        </div>
      )}

      {/* Reconnecting indicator */}
      {failCount >= 3 && (
        <div className="w-full max-w-sm px-4 py-2 bg-[#FFF8F0] border border-[#F0E6D3] rounded-xl text-center text-sm text-[#A08060] font-semibold">
          {failCount >= 10 ? "Connection lost. Please check your internet." : "Reconnecting..."}
        </div>
      )}

      {/* Room header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#3D2C2C]">{room.name}</h1>
        <p className="text-[#8B7355] text-sm mt-1">
          Room Code: <span className="font-mono font-bold text-[#E54B4B]">{room.id}</span>
        </p>
      </div>

      {/* Share button */}
      <button
        onClick={copyLink}
        className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-[#F0E6D3] rounded-full text-sm font-bold text-[#5C4033] hover:border-[#E54B4B]/30 hover:bg-[#FFF8F0] transition-all"
      >
        {copied ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        )}
        {copied ? "Link Copied!" : "Copy Invite Link"}
      </button>

      {/* Timer */}
      <div className="w-full max-w-sm flex flex-col items-center">
        <Timer
          isRoomMode
          isReadOnly={!isPrivilegedUser}
          onStart={handleRoomStart}
          onPause={() => sendAction("pause")}
          onReset={handleRoomReset}
          onSkip={handleRoomSkip}
          controlSlot={
            session?.user && intentionsEnabled ? (
              <TaskList
                mode="room"
                onSyncTasks={syncRoomTasks}
              />
            ) : undefined
          }
        />
      </div>

      {/* Host controls label for participants */}
      {!isPrivilegedUser && (
        <p className="text-sm text-[#A08060] font-semibold -mt-4">
          The host controls the timer
        </p>
      )}

      {/* Room settings — host/co-host only */}
      {isPrivilegedUser && (
        <div className="w-full max-w-sm">
          <button
            onClick={() => {
              if (!showRoomSettings) {
                setDraftSettings({
                  workDuration: room.settings.workDuration,
                  shortBreakDuration: room.settings.shortBreakDuration,
                  longBreakDuration: room.settings.longBreakDuration,
                  longBreakInterval: room.settings.longBreakInterval,
                  autoStartBreaks: room.settings.autoStartBreaks,
                });
              }
              setShowRoomSettings((v) => !v);
            }}
            className="flex items-center gap-2 text-sm font-semibold text-[#8B7355] hover:text-[#E54B4B] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Room Settings
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showRoomSettings ? "rotate-180" : ""}`}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {showRoomSettings && draftSettings && (
            <div className="mt-3 bg-white border-2 border-[#F0E6D3] rounded-2xl p-4 space-y-3">
              {(
                [
                  { label: "Work", key: "workDuration", min: 1, max: 60 },
                  { label: "Short Break", key: "shortBreakDuration", min: 1, max: 30 },
                  { label: "Long Break", key: "longBreakDuration", min: 1, max: 60 },
                  { label: "Long Break Every", key: "longBreakInterval", min: 1, max: 10, suffix: "sessions" },
                ] as { label: string; key: keyof typeof draftSettings; min: number; max: number; suffix?: string }[]
              ).map(({ label, key, min, max, suffix }) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-[#5C4033] font-semibold w-32 shrink-0">{label}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDraftSettings((d) => d ? { ...d, [key]: Math.max(min, (d[key] as number) - 1) } : d)}
                      className="w-7 h-7 rounded-full bg-[#F0E6D3] text-[#5C4033] font-bold text-base flex items-center justify-center hover:bg-[#E8D5C4] transition-colors"
                    >−</button>
                    <span className="w-8 text-center text-sm font-bold text-[#3D2C2C] tabular-nums">{draftSettings[key] as number}</span>
                    <button
                      onClick={() => setDraftSettings((d) => d ? { ...d, [key]: Math.min(max, (d[key] as number) + 1) } : d)}
                      className="w-7 h-7 rounded-full bg-[#F0E6D3] text-[#5C4033] font-bold text-base flex items-center justify-center hover:bg-[#E8D5C4] transition-colors"
                    >+</button>
                    <span className="text-xs text-[#A08060]">{suffix ?? "min"}</span>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between">
                <span className="text-sm text-[#5C4033] font-semibold">Auto-start Breaks</span>
                <button
                  onClick={() => setDraftSettings((d) => d ? { ...d, autoStartBreaks: !d.autoStartBreaks } : d)}
                  className={`w-10 h-6 rounded-full transition-colors relative ${draftSettings.autoStartBreaks ? "bg-[#E54B4B]" : "bg-[#E8D5C4]"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${draftSettings.autoStartBreaks ? "translate-x-5" : "translate-x-1"}`} />
                </button>
              </div>

              <button
                disabled={savingSettings}
                onClick={async () => {
                  if (!draftSettings) return;
                  setSavingSettings(true);
                  try {
                    await fetch(`/api/rooms/${roomId}`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "update-settings", userId, settings: draftSettings }),
                    });
                    await fetchRoom();
                    setShowRoomSettings(false);
                  } finally {
                    setSavingSettings(false);
                  }
                }}
                className="w-full py-2 rounded-xl bg-[#E54B4B] text-white text-sm font-bold hover:bg-[#D43D3D] transition-colors disabled:opacity-50"
              >
                {savingSettings ? "Saving…" : "Save Settings"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Participants */}
      <div className="w-full max-w-sm">
        <h3 className="text-sm text-[#8B7355] font-semibold mb-3">
          Participants ({room.participants.length})
        </h3>
        <div className="space-y-2">
          {room.participants.map((p) => {
            const isParticipantHost = p.id === room.hostId;
            const isParticipantCoHost = room.coHostIds.includes(p.id);
            const isMe = p.id === userId;
            const tasks = p.tasks ?? [];
            return (
              <div key={p.id} className="flex items-start gap-3 px-4 py-3 bg-white border-2 border-[#F0E6D3] rounded-xl">
                <div className="w-8 h-8 rounded-full bg-[#E54B4B] flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
                  {p.name[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[#3D2C2C] text-sm font-semibold truncate block">{p.name}</span>
                  {tasks.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {tasks.map((t, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className="text-xs">
                            {t.status === "done" ? "✅" : t.status === "skipped" ? "↩️" : "⬜"}
                          </span>
                          <span className={`text-xs ${t.status === "done" ? "line-through text-[#A08060]" : "text-[#5C4033]"}`}>
                            {t.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="ml-auto flex items-center gap-2 flex-shrink-0 mt-0.5">
                  {isParticipantHost && (
                    <span className="text-xs text-[#E54B4B] font-bold">Host</span>
                  )}
                  {isParticipantCoHost && !isParticipantHost && (
                    <span className="text-xs text-[#F5A623] font-bold">Co-Host</span>
                  )}
                  {isMe && (
                    <span className="text-xs text-[#A08060] font-semibold">You</span>
                  )}
                  {isAdmin && !isMe && (
                    <div className="flex items-center gap-1 ml-1">
                      {!isParticipantHost && (
                        <button
                          onClick={() => handleParticipantAction(
                            isParticipantCoHost ? "remove-cohost" : "add-cohost",
                            p.id
                          )}
                          className="text-xs px-2 py-0.5 rounded-full border border-[#F0E6D3] text-[#8B7355] hover:border-[#F5A623] hover:text-[#F5A623] transition-colors"
                          title={isParticipantCoHost ? "Remove co-host" : "Make co-host"}
                        >
                          {isParticipantCoHost ? "−Co-Host" : "+Co-Host"}
                        </button>
                      )}
                      {!isParticipantHost && (
                        <button
                          onClick={() => {
                            if (confirm(`Make ${p.name} the host?`)) {
                              handleParticipantAction("transfer-host", p.id);
                            }
                          }}
                          className="text-xs px-2 py-0.5 rounded-full border border-[#F0E6D3] text-[#8B7355] hover:border-[#E54B4B] hover:text-[#E54B4B] transition-colors"
                          title="Transfer host"
                        >
                          Make Host
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Room actions */}
      <div className="flex items-center gap-3 pb-8">
        <button
          onClick={handleLeaveRoom}
          className="px-5 py-2.5 bg-white border-2 border-[#F0E6D3] rounded-full text-sm font-bold text-[#5C4033] hover:border-[#E54B4B]/30 hover:bg-[#FFF8F0] transition-all"
        >
          Leave Room
        </button>
        {isAdmin && (
          <button
            onClick={handleEndRoom}
            className="px-5 py-2.5 bg-white border-2 border-red-200 rounded-full text-sm font-bold text-[#E54B4B] hover:bg-red-50 transition-all"
          >
            End Room
          </button>
        )}
      </div>
    </div>

      {/* Interrupt prompt modal */}
      {pendingInterruptPrompt && session?.user && (
        <InterruptPromptModal
          elapsedSeconds={pendingInterruptPrompt.session.actualDuration}
          onCount={() => resolveInterruptPrompt(true)}
          onDiscard={() => resolveInterruptPrompt(false)}
        />
      )}

      {/* Intention reflection modal */}
      {pendingReflection && roomTaskList.length > 0 && roomSessionGroupId && session?.user && intentionsEnabled && (
        <IntentionReflectionModal
          tasks={roomTaskList}
          sessionGroupId={roomSessionGroupId}
          sessionId={lastCompletedSessionId}
          mode="room"
          onClose={() => {
            setPendingReflection(false);
            clearRoomTaskList();
            savedRoomSessionGroupRef.current = null;
          }}
        />
      )}
    </>
  );
}
