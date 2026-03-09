"use client";

import { useRef, useState } from "react";
import { useTimerStore } from "@/store/timer-store";

export default function IntentionInput() {
  const currentIntention = useTimerStore((s) => s.currentIntention);
  const setCurrentIntention = useTimerStore((s) => s.setCurrentIntention);
  const status = useTimerStore((s) => s.status);
  const phase = useTimerStore((s) => s.phase);
  const [confirmed, setConfirmed] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // When running, show read-only active intention
  if (status === "running" && currentIntention) {
    return (
      <div className="px-3 py-2 rounded-lg bg-[#F0E6D3]/50 text-sm text-[#5C4033] italic flex items-start gap-2">
        <span className="text-xs mt-0.5">💭</span>
        <span className="break-words">{currentIntention}</span>
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

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  return (
    <div className="w-full">
      <div className="flex gap-2 items-start">
        <textarea
          ref={inputRef}
          rows={1}
          value={currentIntention}
          onChange={(e) => {
            const val = e.target.value.replace(/\n/g, "");
            if (val.length <= 280) {
              setCurrentIntention(val);
              setConfirmed(false);
              autoResize(e.target);
            }
          }}
          onInput={(e) => autoResize(e.currentTarget)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleConfirm();
            }
          }}
          placeholder="What will you focus on?"
          className={`
            flex-1 px-3 py-2 rounded-lg text-sm
            bg-[#F0E6D3]/40 border
            ${isOverLimit ? "border-[#E54B4B]" : "border-[#E8D5C4]"}
            text-[#3D2C2C] placeholder-[#A08060]
            focus:outline-none focus:ring-2 focus:ring-[#E54B4B]/20 focus:border-[#E54B4B]/40
            transition-colors resize-none overflow-hidden
          `}
        />
        {currentIntention.trim() && (
          <button
            onClick={handleConfirm}
            title="Set intention"
            aria-label="Set intention"
            className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
              confirmed
                ? "bg-green-100 text-green-700 border border-green-200"
                : "bg-[#E54B4B]/10 text-[#E54B4B] hover:bg-[#E54B4B]/20"
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
      </div>
      {showCounter && (
        <div className="text-right mt-1">
          <span className={`text-xs ${isOverLimit ? "text-[#E54B4B]" : "text-[#3D2C2C]/40"}`}>
            {280 - charCount}
          </span>
        </div>
      )}
    </div>
  );
}
