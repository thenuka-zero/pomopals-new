"use client";

import { useRef, useState } from "react";
import { useTimerStore } from "@/store/timer-store";

export default function IntentionInput() {
  const currentIntention = useTimerStore((s) => s.currentIntention);
  const setCurrentIntention = useTimerStore((s) => s.setCurrentIntention);
  const status = useTimerStore((s) => s.status);
  const phase = useTimerStore((s) => s.phase);
  const [confirmed, setConfirmed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // When running, show read-only active intention
  if (status === "running" && currentIntention) {
    return (
      <div className="px-3 py-2 rounded-lg bg-[#F0E6D3]/50 text-sm text-[#5C4033] italic flex items-center gap-2">
        <span className="text-xs">💭</span>
        <span className="truncate">{currentIntention}</span>
      </div>
    );
  }

  // When running without intention, show nothing
  if (status === "running") return null;

  // Only show in idle/paused during work phase
  const showInput =
    (status === "idle" || status === "paused") &&
    (phase === "work" || status === "idle");

  if (!showInput) return null;

  const charCount = currentIntention.length;
  const showCounter = charCount > 200;
  const isOverLimit = charCount > 280;

  const handleConfirm = () => {
    if (!currentIntention.trim()) return;
    setConfirmed(true);
    inputRef.current?.blur();
  };

  return (
    <div className="w-full">
      <div className="relative flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={currentIntention}
          onChange={(e) => {
            if (e.target.value.length <= 280) {
              setCurrentIntention(e.target.value);
              setConfirmed(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleConfirm();
          }}
          placeholder="What will you focus on?"
          maxLength={280}
          className={`
            flex-1 px-3 py-2 rounded-lg text-sm
            bg-[#F0E6D3]/40 border
            ${isOverLimit ? "border-[#E54B4B]" : "border-[#E8D5C4]"}
            text-[#3D2C2C] placeholder-[#A08060]
            focus:outline-none focus:ring-2 focus:ring-[#E54B4B]/20 focus:border-[#E54B4B]/40
            transition-colors
          `}
        />
        {currentIntention.trim() && (
          <button
            onClick={handleConfirm}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex-shrink-0 ${
              confirmed
                ? "bg-green-100 text-green-700 border border-green-200"
                : "bg-[#E54B4B] text-white hover:bg-[#D43D3D]"
            }`}
          >
            {confirmed ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            ) : "Set"}
          </button>
        )}
        {showCounter && !currentIntention.trim() && (
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
