"use client";

import { useState, useEffect } from "react";
import { useTimerStore } from "@/store/timer-store";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Settings({ isOpen, onClose }: SettingsProps) {
  const { settings, updateSettings, status } = useTimerStore();
  const [local, setLocal] = useState(settings);
  const [broadcastEnabled, setBroadcastEnabled] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setBroadcastEnabled(d.settings?.broadcastEnabled ?? true);
        setSettingsLoaded(true);
      })
      .catch(() => setSettingsLoaded(true));
  }, [isOpen]);

  const handleBroadcastToggle = async () => {
    const newVal = !broadcastEnabled;
    setBroadcastEnabled(newVal);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ broadcastEnabled: newVal }),
      });
      if (!newVal) {
        await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: false }),
        });
      }
    } catch {
      // ignore — the toggle is optimistic
    }
  };

  if (!isOpen) return null;

  const handleSave = () => {
    updateSettings(local);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#3D2C2C]/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-[#3D2C2C] mb-6">Timer Settings</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[#5C4033] font-semibold mb-1">Focus Duration (minutes)</label>
            <input
              type="number"
              min={1}
              max={120}
              value={local.workDuration}
              onChange={(e) => setLocal({ ...local, workDuration: parseInt(e.target.value) || 1 })}
              className="w-full bg-[#FDF6EC] border-2 border-[#F0E6D3] rounded-xl px-4 py-2.5 text-[#3D2C2C] focus:outline-none focus:border-[#E54B4B] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-[#5C4033] font-semibold mb-1">Short Break (minutes)</label>
            <input
              type="number"
              min={1}
              max={60}
              value={local.shortBreakDuration}
              onChange={(e) => setLocal({ ...local, shortBreakDuration: parseInt(e.target.value) || 1 })}
              className="w-full bg-[#FDF6EC] border-2 border-[#F0E6D3] rounded-xl px-4 py-2.5 text-[#3D2C2C] focus:outline-none focus:border-[#6EAE3E] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-[#5C4033] font-semibold mb-1">Long Break (minutes)</label>
            <input
              type="number"
              min={1}
              max={60}
              value={local.longBreakDuration}
              onChange={(e) => setLocal({ ...local, longBreakDuration: parseInt(e.target.value) || 1 })}
              className="w-full bg-[#FDF6EC] border-2 border-[#F0E6D3] rounded-xl px-4 py-2.5 text-[#3D2C2C] focus:outline-none focus:border-[#6EAE3E] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-[#5C4033] font-semibold mb-1">Long Break After (pomodoros)</label>
            <input
              type="number"
              min={2}
              max={10}
              value={local.longBreakInterval}
              onChange={(e) => setLocal({ ...local, longBreakInterval: parseInt(e.target.value) || 4 })}
              className="w-full bg-[#FDF6EC] border-2 border-[#F0E6D3] rounded-xl px-4 py-2.5 text-[#3D2C2C] focus:outline-none focus:border-[#E54B4B] transition-colors"
            />
          </div>

          <div className="border-t border-[#F0E6D3] pt-4">
            <h3 className="text-sm font-bold text-[#3D2C2C] mb-3">Notifications</h3>
            <div>
              <label className="block text-sm text-[#5C4033] font-semibold mb-1">
                Notification Sound
              </label>
              <select
                value={local.notificationSound ?? "none"}
                onChange={(e) =>
                  setLocal({
                    ...local,
                    notificationSound: e.target.value as "none" | "bell" | "digital",
                  })
                }
                className="w-full bg-[#FDF6EC] border-2 border-[#F0E6D3] rounded-xl px-4 py-2.5 text-[#3D2C2C] focus:outline-none focus:border-[#E54B4B] transition-colors"
              >
                <option value="none">None (silent)</option>
                <option value="bell">Bell</option>
                <option value="digital">Digital beep</option>
              </select>
            </div>
          </div>
        </div>

        {/* Privacy Section */}
        <div className="mt-4 pt-4 border-t border-[#E8D5C4]">
          <h3 className="font-semibold text-[#3D2C2C] mb-2">Privacy</h3>
          {settingsLoaded ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-[#3D2C2C] font-medium">
                  Share my Pomodoro sessions with friends
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Friends can see when you&apos;re focusing and request to join your rooms.
                </p>
              </div>
              <button
                onClick={handleBroadcastToggle}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                  broadcastEnabled ? "bg-[#6EAE3E]" : "bg-gray-300"
                }`}
                role="switch"
                aria-checked={broadcastEnabled}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                    broadcastEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          ) : (
            <div className="h-10 bg-[#F0E6D3] rounded-xl animate-pulse" />
          )}
        </div>

        {status !== "idle" && (
          <p className="text-[#E54B4B] text-sm mt-4 font-semibold">Changes will apply when the timer is idle.</p>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-[#FDF6EC] border-2 border-[#F0E6D3] text-[#5C4033] rounded-xl font-bold hover:bg-[#F5EDE0] transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="flex-1 px-4 py-2.5 bg-[#E54B4B] text-white rounded-xl font-bold hover:bg-[#D43D3D] transition-colors shadow-md shadow-[#E54B4B]/20">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
