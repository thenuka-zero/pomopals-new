"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RoomResponse } from "@/lib/types";
import { useTimerStore } from "@/store/timer-store";
import { useRouter } from "next/navigation";
import Timer from "./Timer";

interface RoomViewProps {
  roomId: string;
  userId: string;
  userName: string;
}

export default function RoomView({ roomId, userId, userName }: RoomViewProps) {
  const [room, setRoom] = useState<RoomResponse | null>(null);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const syncState = useTimerStore((s) => s.syncState);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const isAdmin = room?.hostId === userId;

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
      syncState(data.timerState.phase, data.timerState.status, data.timerState.timeRemaining, data.timerState.pomodoroCount);
    } catch {
      setFailCount((c) => c + 1);
    }
  }, [roomId, syncState]);

  // Join on mount
  useEffect(() => {
    if (joined) return;
    const join = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "join", userId, userName }),
        });
        if (res.ok) {
          setJoined(true);
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

    const handleBeforeUnload = () => {
      navigator.sendBeacon(
        `/api/rooms/${roomId}`,
        new Blob([JSON.stringify({ action: "leave", userId })], { type: "application/json" })
      );
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Also fire on component unmount (navigating away within SPA)
      navigator.sendBeacon(
        `/api/rooms/${roomId}`,
        new Blob([JSON.stringify({ action: "leave", userId })], { type: "application/json" })
      );
    };
  }, [roomId, userId, joined]);

  const sendAction = async (action: string) => {
    await fetch(`/api/rooms/${roomId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, userId }),
    });
    fetchRoom();
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

  const copyCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
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
    <div className="flex flex-col items-center gap-8">
      {/* Reconnecting indicator */}
      {failCount >= 3 && (
        <div className="w-full max-w-sm px-4 py-2 bg-[#FFF8F0] border border-[#F0E6D3] rounded-xl text-center text-sm text-[#A08060] font-semibold">
          {failCount >= 10 ? "Connection lost. Please check your internet." : "Reconnecting..."}
        </div>
      )}

      {/* Room header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#3D2C2C]">{room.name}</h1>
        <div className="flex items-center justify-center gap-2 mt-1">
          <p className="text-[#8B7355] text-sm">
            Room Code: <span className="font-mono font-bold text-[#E54B4B]">{room.id}</span>
          </p>
          <button
            onClick={copyCode}
            className="text-xs text-[#A08060] hover:text-[#E54B4B] transition-colors"
            title="Copy code"
          >
            {copiedCode ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Share button */}
      <button
        onClick={copyLink}
        className="px-5 py-2.5 bg-white border-2 border-[#F0E6D3] rounded-full text-sm font-bold text-[#5C4033] hover:border-[#E54B4B]/30 hover:bg-[#FFF8F0] transition-all"
      >
        {copied ? "Link Copied!" : "Copy Invite Link"}
      </button>

      {/* Timer */}
      <Timer
        isRoomMode
        isReadOnly={!isAdmin}
        onStart={() => sendAction("start")}
        onPause={() => sendAction("pause")}
        onReset={() => sendAction("reset")}
        onSkip={() => sendAction("skip")}
      />

      {/* Host controls label for participants */}
      {!isAdmin && (
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
          {room.participants.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-[#F0E6D3] rounded-xl">
              <div className="w-8 h-8 rounded-full bg-[#E54B4B] flex items-center justify-center text-white text-sm font-bold">
                {p.name[0].toUpperCase()}
              </div>
              <span className="text-[#3D2C2C] text-sm font-semibold">{p.name}</span>
              <div className="ml-auto flex items-center gap-2">
                {p.id === room.hostId && (
                  <span className="text-xs text-[#E54B4B] font-bold">Host</span>
                )}
                {p.id === userId && (
                  <span className="text-xs text-[#A08060] font-semibold">You</span>
                )}
              </div>
            </div>
          ))}
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
  );
}
