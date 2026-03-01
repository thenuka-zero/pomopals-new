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
  });
  const [loading, setLoading] = useState(false);
  const [timerInitMode, setTimerInitMode] = useState<"continue" | "fresh">("continue");

  // Timer is active if it's running or paused (not idle)
  const timerActive = timerState.status !== "idle";

  if (!isOpen) return null;

  // Phase label mapping
  const phaseLabel =
    timerState.phase === "work"
      ? "Focus (Work)"
      : timerState.phase === "shortBreak"
      ? "Short Break"
      : "Long Break";

  // Time formatting
  const safeTimeRemaining = Math.max(0, timerState.timeRemaining);
  const minutes = Math.floor(safeTimeRemaining / 60);
  const seconds = safeTimeRemaining % 60;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostId: userId,
          hostName: userName,
          name: name || "Pomodoro Room",
          settings: timerActive && timerInitMode === "continue" ? timerState.settings : settings,
          ...(timerActive && timerInitMode === "continue" ? { timerState } : {}),
        }),
      });
      const room = await res.json();
      router.push(`/room/${room.id}`);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#3D2C2C]/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-[#3D2C2C] mb-6">Create a Room</h2>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm text-[#5C4033] font-semibold mb-1">Room Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#FDF6EC] border-2 border-[#F0E6D3] rounded-xl px-4 py-2.5 text-[#3D2C2C] focus:outline-none focus:border-[#E54B4B] transition-colors"
              placeholder="e.g. Study Session"
              required
            />
          </div>

          {timerActive && (
            <div>
              <label className="block text-sm text-[#5C4033] font-semibold mb-2">Timer initialization</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setTimerInitMode("continue")}
                  className={`flex-1 flex items-center gap-2 border-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                    timerInitMode === "continue"
                      ? "border-[#E54B4B] bg-[#FFF0F0] text-[#E54B4B]"
                      : "border-[#F0E6D3] bg-[#FDF6EC] text-[#5C4033]"
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                    timerInitMode === "continue" ? "border-[#E54B4B] bg-[#E54B4B]" : "border-[#C4A882]"
                  }`} />
                  Continue my session
                </button>
                <button
                  type="button"
                  onClick={() => setTimerInitMode("fresh")}
                  className={`flex-1 flex items-center gap-2 border-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                    timerInitMode === "fresh"
                      ? "border-[#E54B4B] bg-[#FFF0F0] text-[#E54B4B]"
                      : "border-[#F0E6D3] bg-[#FDF6EC] text-[#5C4033]"
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                    timerInitMode === "fresh" ? "border-[#E54B4B] bg-[#E54B4B]" : "border-[#C4A882]"
                  }`} />
                  Start fresh
                </button>
              </div>
            </div>
          )}

          {timerActive && timerInitMode === "continue" && (
            <div className="bg-[#FFF8F0] border-2 border-[#F5D0A0] rounded-xl px-4 py-3 text-sm">
              <div className="flex items-center gap-2 font-semibold text-[#5C4033] mb-2">
                <span>{timerState.phase === "work" ? "🍅" : "☕"}</span>
                <span>Continuing your active session</span>
              </div>
              <div className="space-y-1 text-[#5C4033]">
                <div className="flex gap-2">
                  <span className="w-20 text-[#8B6914] font-medium">Phase:</span>
                  <span>{phaseLabel}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-20 text-[#8B6914] font-medium">Remaining:</span>
                  <span>
                    {timerState.status === "running" ? "▶" : "⏸"} {minutes} min {seconds} sec
                    {timerState.status === "paused" && (
                      <span className="text-[#8B6914] ml-1">(paused — you&apos;ll need to start it in the room)</span>
                    )}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="w-20 text-[#8B6914] font-medium">Pomodoros:</span>
                  <span>{timerState.pomodoroCount} completed</span>
                </div>
              </div>
              {timerState.phase !== "work" && (
                <p className="mt-2 text-xs text-[#8B6914]">
                  Your room will start in break mode. The work phase begins after the break completes.
                </p>
              )}
            </div>
          )}

          {(!timerActive || timerInitMode === "fresh") && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#5C4033] font-semibold mb-1">Focus (min)</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={settings.workDuration}
                  onChange={(e) => setSettings({ ...settings, workDuration: parseInt(e.target.value) || 25 })}
                  className="w-full bg-[#FDF6EC] border-2 border-[#F0E6D3] rounded-xl px-4 py-2.5 text-[#3D2C2C] focus:outline-none focus:border-[#E54B4B] transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-[#5C4033] font-semibold mb-1">Break (min)</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={settings.shortBreakDuration}
                  onChange={(e) => setSettings({ ...settings, shortBreakDuration: parseInt(e.target.value) || 5 })}
                  className="w-full bg-[#FDF6EC] border-2 border-[#F0E6D3] rounded-xl px-4 py-2.5 text-[#3D2C2C] focus:outline-none focus:border-[#6EAE3E] transition-colors"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#E54B4B] text-white rounded-xl font-bold hover:bg-[#D43D3D] transition-colors disabled:opacity-50 shadow-md shadow-[#E54B4B]/20"
          >
            {loading ? "Creating..." : "Create Room"}
          </button>
        </form>
      </div>
    </div>
  );
}
