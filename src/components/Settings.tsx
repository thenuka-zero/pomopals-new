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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-semibold text-white mb-6">Timer Settings</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Focus Duration (minutes)</label>
            <input
              type="number"
              min={1}
              max={120}
              value={local.workDuration}
              onChange={(e) => setLocal({ ...local, workDuration: parseInt(e.target.value) || 1 })}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Short Break (minutes)</label>
            <input
              type="number"
              min={1}
              max={60}
              value={local.shortBreakDuration}
              onChange={(e) => setLocal({ ...local, shortBreakDuration: parseInt(e.target.value) || 1 })}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Long Break (minutes)</label>
            <input
              type="number"
              min={1}
              max={60}
              value={local.longBreakDuration}
              onChange={(e) => setLocal({ ...local, longBreakDuration: parseInt(e.target.value) || 1 })}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Long Break After (pomodoros)</label>
            <input
              type="number"
              min={2}
              max={10}
              value={local.longBreakInterval}
              onChange={(e) => setLocal({ ...local, longBreakInterval: parseInt(e.target.value) || 4 })}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {status !== "idle" && (
          <p className="text-yellow-500 text-sm mt-4">Changes will apply when the timer is idle.</p>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="flex-1 px-4 py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition-colors">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
