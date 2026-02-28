"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Room } from "@/lib/types";
import { useTimerStore } from "@/store/timer-store";
import Timer from "./Timer";

interface RoomViewProps {
  roomId: string;
  userId: string;
  userName: string;
}

export default function RoomView({ roomId, userId, userName }: RoomViewProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);
  const [copied, setCopied] = useState(false);
  const syncState = useTimerStore((s) => s.syncState);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${roomId}`);
      if (!res.ok) {
        setError("Room not found. It may have expired.");
        return;
      }
      const data: Room = await res.json();
      setRoom(data);
      syncState(data.timerState.phase, data.timerState.status, data.timerState.timeRemaining, data.timerState.pomodoroCount);
    } catch {
      setError("Failed to connect to room.");
    }
  }, [roomId, syncState]);

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
        } else {
          setError("Room not found.");
        }
      } catch {
        setError("Failed to join room.");
      }
    };
    join();
  }, [roomId, userId, userName, joined, fetchRoom]);

  useEffect(() => {
    if (!joined) return;
    pollRef.current = setInterval(fetchRoom, 1000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [joined, fetchRoom]);

  useEffect(() => {
    return () => {
      fetch(`/api/rooms/${roomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave", userId }),
      });
    };
  }, [roomId, userId]);

  const sendAction = async (action: string) => {
    await fetch(`/api/rooms/${roomId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, userId }),
    });
    fetchRoom();
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
        <a href="/" className="text-[#E54B4B] hover:underline font-bold">Go back home</a>
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
    <div className="flex flex-col items-center gap-8">
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
        className="px-5 py-2.5 bg-white border-2 border-[#F0E6D3] rounded-full text-sm font-bold text-[#5C4033] hover:border-[#E54B4B]/30 hover:bg-[#FFF8F0] transition-all"
      >
        {copied ? "Link Copied!" : "Copy Invite Link"}
      </button>

      {/* Timer */}
      <Timer
        isRoomMode
        onStart={() => sendAction("start")}
        onPause={() => sendAction("pause")}
        onReset={() => sendAction("reset")}
        onSkip={() => sendAction("skip")}
      />

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
              {p.id === room.hostId && (
                <span className="text-xs text-[#E54B4B] font-bold ml-auto">Host</span>
              )}
              {p.id === userId && p.id !== room.hostId && (
                <span className="text-xs text-[#A08060] font-semibold ml-auto">You</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
