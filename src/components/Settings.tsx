"use client";

import { useState, useEffect, useId } from "react";
import { useTimerStore } from "@/store/timer-store";
import { DynamicStyle } from "@/components/DynamicStyle";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Settings({ isOpen, onClose }: SettingsProps) {
  const { settings, updateSettings, status } = useTimerStore();
  const [local, setLocal] = useState(settings);
  const [broadcastEnabled, setBroadcastEnabled] = useState(true);
  const [intentionsEnabled, setIntentionsEnabled] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setBroadcastEnabled(d.settings?.broadcastEnabled ?? true);
        setIntentionsEnabled(d.settings?.intentionsEnabled ?? true);
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

  const handleIntentionsToggle = async () => {
    const newVal = !intentionsEnabled;
    setIntentionsEnabled(newVal);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentionsEnabled: newVal }),
      });
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
    <div className="fixed inset-0 bg-[#3D2C2C]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-5 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-[#3D2C2C] mb-4">Settings</h2>

        {/* Timer durations — 2x2 grid */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-[#8B7355] font-semibold mb-1">Focus (min)</label>
            <input
              type="number"
              min={1}
              max={120}
              value={local.workDuration}
              onChange={(e) => setLocal({ ...local, workDuration: parseInt(e.target.value) || 1 })}
              className="w-full bg-[#FDF6EC] border border-[#F0E6D3] rounded-lg px-3 py-1.5 text-sm text-[#3D2C2C] focus:outline-none focus:border-[#E54B4B] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-[#8B7355] font-semibold mb-1">Short break (min)</label>
            <input
              type="number"
              min={1}
              max={60}
              value={local.shortBreakDuration}
              onChange={(e) => setLocal({ ...local, shortBreakDuration: parseInt(e.target.value) || 1 })}
              className="w-full bg-[#FDF6EC] border border-[#F0E6D3] rounded-lg px-3 py-1.5 text-sm text-[#3D2C2C] focus:outline-none focus:border-[#6EAE3E] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-[#8B7355] font-semibold mb-1">Long break (min)</label>
            <input
              type="number"
              min={1}
              max={60}
              value={local.longBreakDuration}
              onChange={(e) => setLocal({ ...local, longBreakDuration: parseInt(e.target.value) || 1 })}
              className="w-full bg-[#FDF6EC] border border-[#F0E6D3] rounded-lg px-3 py-1.5 text-sm text-[#3D2C2C] focus:outline-none focus:border-[#6EAE3E] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-[#8B7355] font-semibold mb-1">Long break after</label>
            <input
              type="number"
              min={2}
              max={10}
              value={local.longBreakInterval}
              onChange={(e) => setLocal({ ...local, longBreakInterval: parseInt(e.target.value) || 4 })}
              className="w-full bg-[#FDF6EC] border border-[#F0E6D3] rounded-lg px-3 py-1.5 text-sm text-[#3D2C2C] focus:outline-none focus:border-[#E54B4B] transition-colors"
            />
          </div>
        </div>

        {/* Sound */}
        <div className="mb-3">
          <label className="block text-xs text-[#8B7355] font-semibold mb-1">Sound</label>
          <select
            value={local.notificationSound ?? "none"}
            onChange={(e) =>
              setLocal({ ...local, notificationSound: e.target.value as "none" | "bell" | "digital" })
            }
            className="w-full bg-[#FDF6EC] border border-[#F0E6D3] rounded-lg px-3 py-1.5 text-sm text-[#3D2C2C] focus:outline-none focus:border-[#E54B4B] transition-colors"
          >
            <option value="none">None (silent)</option>
            <option value="bell">Bell</option>
            <option value="digital">Digital beep</option>
          </select>
        </div>

        {/* Toggles */}
        <div className="space-y-2.5 border-t border-[#F0E6D3] pt-3">
          <ToggleRow
            label="Auto-start next phase"
            checked={local.autoStartBreaks}
            onChange={() => setLocal({ ...local, autoStartBreaks: !local.autoStartBreaks })}
          />
          {settingsLoaded ? (
            <>
              <ToggleRow label="Share sessions with friends" checked={broadcastEnabled} onChange={handleBroadcastToggle} />
              <ToggleRow label="Intentions" checked={intentionsEnabled} onChange={handleIntentionsToggle} color="#E54B4B" />
            </>
          ) : (
            <div className="h-16 bg-[#F0E6D3] rounded-lg animate-pulse" />
          )}
        </div>

        {status !== "idle" && (
          <p className="text-[#E54B4B] text-xs mt-3 font-semibold">Changes apply when the timer is idle.</p>
        )}

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 px-3 py-2 bg-[#FDF6EC] border border-[#F0E6D3] text-[#5C4033] rounded-lg text-sm font-bold hover:bg-[#F5EDE0] transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="flex-1 px-3 py-2 bg-[#E54B4B] text-white rounded-lg text-sm font-bold hover:bg-[#D43D3D] transition-colors shadow-sm">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange, color = "#6EAE3E" }: { label: string; checked: boolean; onChange: () => void; color?: string }) {
  const id = `tr-${useId().replace(/:/g, "")}`;
  const bg = checked ? color : "#D1D5DB";
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[#3D2C2C] font-medium">{label}</span>
      <>
        <DynamicStyle css={`#${id} { background-color: ${bg}; }`} />
        <button
          id={id}
          onClick={onChange}
          className="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors"
          role="switch"
          aria-checked={checked}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${
              checked ? "translate-x-[18px]" : "translate-x-[2px]"
            }`}
          />
        </button>
      </>
    </div>
  );
}
