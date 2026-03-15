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
import IntentionInput from "./IntentionInput";
import IntentionReflectionModal from "./IntentionReflectionModal";
import InterruptPromptModal from "./InterruptPromptModal";

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
  const syncState = useTimerStore((s) => s.syncState);
  const setRoomContext = useTimerStore((s) => s.setRoomContext);
  const timerPhase = useTimerStore((s) => s.phase);
  const currentIntention = useTimerStore((s) => s.roomCurrentIntention);
  const pendingReflection = useTimerStore((s) => s.pendingReflection);
  const clearCurrentIntention = useTimerStore((s) => s.clearRoomCurrentIntention);
  const setPendingReflection = useTimerStore((s) => s.setPendingReflection);
  const lastCompletedSessionId = useTimerStore((s) => s.lastCompletedSessionId);
  const pendingInterruptPrompt = useTimerStore((s) => s.pendingInterruptPrompt);
  const resolveInterruptPrompt = useTimerStore((s) => s.resolveInterruptPrompt);
  const [intentionId, setIntentionId] = useState<string | null>(null);
  const intentionIdRef = useRef<string | null>(null);
  const [intentionsEnabled, setIntentionsEnabled] = useState(true);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const { requestPermission, notifyPhaseComplete } = useNotifications();
  const prevRoomPhase = useRef<TimerPhase | null>(null);
  const prevRoomTimeRemaining = useRef<number>(Infinity);
  const prevRoomStatus = useRef<string | null>(null);
  const currentIntentionRef = useRef<string>("");
  const roomWorkSessionStartRef = useRef<number | null>(null);
  const isLeavingRef = useRef(false);

  const isAdmin = room?.hostId === userId;
  const isPrivilegedUser = isAdmin || (room?.coHostIds?.includes(userId) ?? false);
  const isAdminRef = useRef(false);
  isAdminRef.current = isAdmin; // sync during render so beforeunload always sees latest value

  currentIntentionRef.current = currentIntention; // sync during render
  // Keep intentionIdRef in sync for use in callbacks
  useEffect(() => { intentionIdRef.current = intentionId; }, [intentionId]);

  // Set room context in timer store for session recording
  useEffect(() => {
    if (room) {
      setRoomContext(roomId, room.participants.length);
    }
    return () => {
      // Clear room context when leaving the room view
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

  // Clear intentionId and intention text when leaving work phase and not pending reflection
  useEffect(() => {
    if (timerPhase !== "work" && !pendingReflection) {
      setIntentionId(null);
      clearCurrentIntention();
    }
    // Clear stuck pendingReflection if there's no active intention
    if (pendingReflection && !intentionId && timerPhase !== "work") {
      setPendingReflection(false);
      clearCurrentIntention();
    }
  }, [timerPhase, pendingReflection, intentionId, clearCurrentIntention, setPendingReflection]);

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

      const newPhase = data.timerState.phase;
      const newTimeRemaining = data.timerState.timeRemaining;

      // Detect natural phase transition: phase changed AND previous timeRemaining was near-zero.
      // Threshold is 10s (not 3s) to handle polling jitter — with 1s polls the client can
      // easily see 4–8 seconds remaining on its last read before the server transitions.
      if (
        prevRoomPhase.current !== null &&
        prevRoomPhase.current !== newPhase &&
        prevRoomTimeRemaining.current <= 10
      ) {
        notifyPhaseComplete(prevRoomPhase.current, newPhase, { isRemote: false });

        // Natural work session completion — record analytics and trigger reflection
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
          if (intentionIdRef.current) {
            useTimerStore.setState({
              pendingReflection: true,
              lastCompletedSessionId: session?.user?.id ? sessionId : null,
            });
          }
          roomWorkSessionStartRef.current = null;
        }
      }

      // Detect skip: phase changed while time was still > 10s remaining (mirrors threshold above)
      const currentIntentionIdAtPoll = intentionIdRef.current;
      if (
        prevRoomPhase.current === "work" &&
        prevRoomPhase.current !== newPhase &&
        prevRoomTimeRemaining.current > 10 &&
        currentIntentionIdAtPoll
      ) {
        fetch(`/api/intentions/${currentIntentionIdAtPoll}/skip`, { method: "POST" }).catch(() => {});
        intentionIdRef.current = null;
        setIntentionId(null);
        clearCurrentIntention();
        roomWorkSessionStartRef.current = null;
      }

      const newStatus = data.timerState.status;

      // Track work session start for all participants
      if (
        newStatus === "running" &&
        newPhase === "work" &&
        (prevRoomStatus.current !== "running" || prevRoomPhase.current !== "work") &&
        !roomWorkSessionStartRef.current
      ) {
        roomWorkSessionStartRef.current = Date.now();
      }

      // Non-privileged participants: save intention when room timer starts
      if (
        !isAdminRef.current &&
        session?.user &&
        prevRoomStatus.current !== null &&
        prevRoomStatus.current !== "running" &&
        newStatus === "running" &&
        newPhase === "work"
      ) {
        const text = currentIntentionRef.current.trim();
        if (text && !intentionIdRef.current) {
          const newId = crypto.randomUUID();
          intentionIdRef.current = newId;
          setIntentionId(newId);
          fetch("/api/intentions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: newId,
              text,
              startedAt: new Date().toISOString(),
              date: new Date().toISOString().slice(0, 10),
            }),
          }).catch(() => {});
        }
      }

      prevRoomPhase.current = newPhase;
      prevRoomTimeRemaining.current = newTimeRemaining;
      prevRoomStatus.current = newStatus;

      if (isLeavingRef.current) return;
      syncState(newPhase, newStatus, newTimeRemaining, data.timerState.pomodoroCount);

      // Fetch join requests if the current user is the host
      if (data.hostId === userId) {
        fetchJoinRequests();
      }
    } catch {
      setFailCount((c) => c + 1);
    }
  }, [roomId, syncState, notifyPhaseComplete, userId, fetchJoinRequests, clearCurrentIntention]);

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
          // Reclaim host if we were the host before a page refresh
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

  // Leave on unmount / tab close via sendBeacon
  // Gated on `joined` to prevent firing during StrictMode remounts
  useEffect(() => {
    if (!joined) return;

    const HOST_KEY = `pomopals-was-host-${roomId}-${userId}`;

    // Track whether beforeunload already sent the leave beacon, to avoid
    // a double-leave on page refresh (both beforeunload and React cleanup fire).
    let unloadBeaconSent = false;

    const handleBeforeUnload = () => {
      unloadBeaconSent = true;
      // Persist host status so we can reclaim it after a page refresh.
      // sessionStorage survives a refresh but is cleared when the tab closes.
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
      // Only fire the leave beacon for SPA navigation — beforeunload already
      // handles page refresh/tab close, and a second leave would incorrectly
      // strip co-host status by reassigning the temp host.
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
      // Reset timer store so other pages show a clean solo timer
      const s = useTimerStore.getState();
      useTimerStore.setState({
        status: "idle",
        phase: "work",
        timeRemaining: s.settings.workDuration * 60,
        startedAt: null,
        elapsed: 0,
        roomCurrentIntention: "",
        pendingReflection: false,
        lastCompletedSessionId: null,
        pendingInterruptPrompt: null,
        lastTransitionType: null,
        roomId: null,
        roomParticipantCount: null,
      });
    };
  }, [roomId, userId, joined]);

  // Set presence when joined (only for authenticated users)
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
    // Create intention if text is set and user is authenticated
    if (currentIntention.trim() && session?.user) {
      const newId = crypto.randomUUID();
      setIntentionId(newId);
      intentionIdRef.current = newId;
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
    requestPermission();
    unlockAudioContext();
    sendAction("start");
  };

  const handleRoomSkip = () => {
    const currentId = intentionIdRef.current;
    if (currentId) {
      fetch(`/api/intentions/${currentId}/skip`, { method: "POST" }).catch(() => {});
      setIntentionId(null);
      intentionIdRef.current = null;
      clearCurrentIntention();
      roomWorkSessionStartRef.current = null;
    }
    // Check if we should prompt the user to count this interrupted session
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
        useTimerStore.setState({ pendingInterruptPrompt: { session: deferredSession, action: "skip", intentionId: null } });
        return;
      }
    }
    sendAction("skip");
  };

  const handleRoomReset = () => {
    const currentId = intentionIdRef.current;
    if (currentId) {
      fetch(`/api/intentions/${currentId}/skip`, { method: "POST" }).catch(() => {});
      setIntentionId(null);
      intentionIdRef.current = null;
      clearCurrentIntention();
    }
    roomWorkSessionStartRef.current = null;
    // Check if we should prompt the user to count this interrupted session
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
        sendAction("reset");
        useTimerStore.setState({ pendingInterruptPrompt: { session: deferredSession, action: "reset", intentionId: null } });
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

  // Error state
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

  // Loading state
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
              <IntentionInput
                onConfirm={(text) => {
                  fetch(`/api/rooms/${roomId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "set-intention", userId, intention: text }),
                  }).catch(() => {});
                }}
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
            return (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-[#F0E6D3] rounded-xl">
                <div className="w-8 h-8 rounded-full bg-[#E54B4B] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {p.name[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[#3D2C2C] text-sm font-semibold truncate block">{p.name}</span>
                  {p.intention && (
                    <span className="text-xs text-[#8B7355] italic truncate block">💭 {p.intention}</span>
                  )}
                </div>
                <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                  {isParticipantHost && (
                    <span className="text-xs text-[#E54B4B] font-bold">Host</span>
                  )}
                  {isParticipantCoHost && !isParticipantHost && (
                    <span className="text-xs text-[#F5A623] font-bold">Co-Host</span>
                  )}
                  {isMe && (
                    <span className="text-xs text-[#A08060] font-semibold">You</span>
                  )}
                  {/* Host-only actions for other participants */}
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
      {pendingReflection && intentionId && session?.user && intentionsEnabled && (
        <IntentionReflectionModal
          intentionId={intentionId}
          intentionText={currentIntention}
          sessionId={lastCompletedSessionId}
          onClose={() => {
            setPendingReflection(false);
            setIntentionId(null);
            intentionIdRef.current = null;
          }}
        />
      )}
    </>
  );
}

