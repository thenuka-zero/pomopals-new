"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TimerPhase, TimerSettings, TimerStatus } from "@/lib/types";

interface SoloTimerState {
  phase: TimerPhase;
  status: TimerStatus;
  timeRemaining: number;
  pomodoroCount: number;
  settings: TimerSettings;
}

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  timerState: SoloTimerState;
}

export default function CreateRoomModal({ isOpen, onClose, userId, userName, timerState }: CreateRoomModalProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [settings, setSettings] = useState<TimerSettings>({
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    longBreakInterval: 4,
    notificationSound: "bell",
    autoStartBreaks: true,
    autoStartPomodoros: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timerInitMode, setTimerInitMode] = useState<"continue" | "fresh">("continue");

  const timerActive = timerState.status !== "idle";

  if (!isOpen) return null;

  const safeTimeRemaining = Math.max(0, timerState.timeRemaining);
  const minutes = Math.floor(safeTimeRemaining / 60);
  const seconds = safeTimeRemaining % 60;
  const phaseLabel = timerState.phase === "work" ? "Focus" : timerState.phase === "shortBreak" ? "Short Break" : "Long Break";

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostId: userId,
          hostName: userName,
          name: name.trim() || "Pomodoro Room",
          settings: timerActive && timerInitMode === "continue" ? timerState.settings : settings,
          ...(timerActive && timerInitMode === "continue" ? { timerState } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create room. Please try again.");
        setLoading(false);
        return;
      }
      router.push(`/room/${data.id}`);
    } catch {
      setError("Failed to create room. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#3D2C2C]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-5 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-[#3D2C2C] mb-4">Create a Room</h2>

        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="block text-xs text-[#8B7355] font-semibold mb-1">Room Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#FDF6EC] border border-[#F0E6D3] rounded-lg px-3 py-1.5 text-sm text-[#3D2C2C] focus:outline-none focus:border-[#E54B4B] transition-colors"
              placeholder="e.g. Study Session"
            />
          </div>

          {timerActive && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTimerInitMode("continue")}
                className={`flex-1 flex items-center gap-1.5 border rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  timerInitMode === "continue"
                    ? "border-[#E54B4B] bg-[#FFF0F0] text-[#E54B4B]"
                    : "border-[#F0E6D3] bg-[#FDF6EC] text-[#5C4033]"
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full border-2 flex-shrink-0 ${
                  timerInitMode === "continue" ? "border-[#E54B4B] bg-[#E54B4B]" : "border-[#C4A882]"
                }`} />
                Continue session
              </button>
              <button
                type="button"
                onClick={() => setTimerInitMode("fresh")}
                className={`flex-1 flex items-center gap-1.5 border rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  timerInitMode === "fresh"
                    ? "border-[#E54B4B] bg-[#FFF0F0] text-[#E54B4B]"
                    : "border-[#F0E6D3] bg-[#FDF6EC] text-[#5C4033]"
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full border-2 flex-shrink-0 ${
                  timerInitMode === "fresh" ? "border-[#E54B4B] bg-[#E54B4B]" : "border-[#C4A882]"
                }`} />
                Start fresh
              </button>
            </div>
          )}

          {timerActive && timerInitMode === "continue" && (
            <div className="bg-[#FFF8F0] border border-[#F5D0A0] rounded-lg px-3 py-2 text-xs text-[#5C4033]">
              <span className="font-semibold">{timerState.phase === "work" ? "🍅" : "☕"} {phaseLabel}</span>
              <span className="mx-1.5 text-[#C4A882]">·</span>
              <span>{timerState.status === "running" ? "▶" : "⏸"} {minutes}:{String(seconds).padStart(2, "0")}</span>
              <span className="mx-1.5 text-[#C4A882]">·</span>
              <span>{timerState.pomodoroCount} done</span>
            </div>
          )}

          {(!timerActive || timerInitMode === "fresh") && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#8B7355] font-semibold mb-1">Focus (min)</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={settings.workDuration}
                  onChange={(e) => setSettings({ ...settings, workDuration: parseInt(e.target.value) || 25 })}
                  className="w-full bg-[#FDF6EC] border border-[#F0E6D3] rounded-lg px-3 py-1.5 text-sm text-[#3D2C2C] focus:outline-none focus:border-[#E54B4B] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8B7355] font-semibold mb-1">Break (min)</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={settings.shortBreakDuration}
                  onChange={(e) => setSettings({ ...settings, shortBreakDuration: parseInt(e.target.value) || 5 })}
                  className="w-full bg-[#FDF6EC] border border-[#F0E6D3] rounded-lg px-3 py-1.5 text-sm text-[#3D2C2C] focus:outline-none focus:border-[#6EAE3E] transition-colors"
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-[#E54B4B] font-semibold text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-[#E54B4B] text-white rounded-lg text-sm font-bold hover:bg-[#D43D3D] transition-colors disabled:opacity-50 shadow-sm"
          >
            {loading ? "Creating..." : "Create Room"}
          </button>
        </form>
      </div>
    </div>
  );
}
