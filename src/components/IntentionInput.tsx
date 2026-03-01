"use client";

import { useTimerStore } from "@/store/timer-store";

interface IntentionInputProps {
  disabled?: boolean;
}

export default function IntentionInput({ disabled = false }: IntentionInputProps) {
  const currentIntention = useTimerStore((s) => s.currentIntention);
  const setCurrentIntention = useTimerStore((s) => s.setCurrentIntention);
  const status = useTimerStore((s) => s.status);
  const phase = useTimerStore((s) => s.phase);

  // When running, show read-only active intention
  if (status === "running" && currentIntention) {
    return (
      <div className="mt-3 px-4 py-2 rounded-lg bg-[#F0E6D3] border border-[#3D2C2C]/10 text-sm text-[#3D2C2C]/70 italic flex items-center gap-2">
        <span>💭</span>
        <span className="truncate">{currentIntention}</span>
      </div>
    );
  }

  // When running without intention, show nothing
  if (status === "running") return null;

  // Only show in idle/paused during work phase (or when idle and no phase context)
  const showInput =
    (status === "idle" || status === "paused") &&
    (phase === "work" || status === "idle");

  if (!showInput) return null;

  const charCount = currentIntention.length;
  const showCounter = charCount > 200;
  const isOverLimit = charCount > 280;

  return (
    <div className="mt-3 w-full">
      <div className="relative">
        <input
          type="text"
          value={currentIntention}
          onChange={(e) => {
            if (e.target.value.length <= 280) {
              setCurrentIntention(e.target.value);
            }
          }}
          placeholder="What will you focus on? (optional)"
          disabled={disabled}
          maxLength={280}
          className={`
            w-full px-4 py-2.5 rounded-lg text-sm
            bg-[#F0E6D3]/60 border
            ${isOverLimit ? "border-[#E54B4B]" : "border-[#3D2C2C]/20"}
            text-[#3D2C2C] placeholder-[#3D2C2C]/40
            focus:outline-none focus:ring-2 focus:ring-[#E54B4B]/30 focus:border-[#E54B4B]/50
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          `}
        />
        {showCounter && (
          <span
            className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${
              isOverLimit ? "text-[#E54B4B]" : "text-[#3D2C2C]/40"
            }`}
          >
            {280 - charCount}
          </span>
        )}
      </div>
    </div>
  );
}
