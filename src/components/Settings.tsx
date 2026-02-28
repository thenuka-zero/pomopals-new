"use client";

import { useState } from "react";
import { useTimerStore } from "@/store/timer-store";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Settings({ isOpen, onClose }: SettingsProps) {
  const { settings, updateSettings, status } = useTimerStore();
  const [local, setLocal] = useState(settings);

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
