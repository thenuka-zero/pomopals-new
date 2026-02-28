"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TimerSettings } from "@/lib/types";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

export default function CreateRoomModal({ isOpen, onClose, userId, userName }: CreateRoomModalProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [settings, setSettings] = useState<TimerSettings>({
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    longBreakInterval: 4,
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId: userId, hostName: userName, name: name || "Pomodoro Room", settings }),
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
