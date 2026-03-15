"use client";

import { useRef } from "react";
import { useTimerStore } from "@/store/timer-store";

interface IntentionInputProps {
  onConfirm?: (text: string) => void;
}

export default function IntentionInput({ onConfirm }: IntentionInputProps) {
  const currentIntention = useTimerStore((s) => s.roomCurrentIntention);
  const setCurrentIntention = useTimerStore((s) => s.setRoomCurrentIntention);
  const status = useTimerStore((s) => s.status);
  const phase = useTimerStore((s) => s.phase);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // During work phase running: show read-only (can't edit mid-session)
  if (status === "running" && phase === "work") {
    if (currentIntention) {
      return (
        <div className="px-3 py-2 rounded-lg bg-[#F0E6D3]/50 text-sm text-[#5C4033] italic flex items-start gap-2">
          <span className="text-xs mt-0.5">💭</span>
          <span className="break-words">{currentIntention}</span>
        </div>
      );
    }
    return null;
  }

  // During a running break or idle/paused: show the editable UI
  const canShow = status === "idle" || status === "paused" || (status === "running" && phase !== "work");
  if (!canShow) return null;

  const charCount = currentIntention.length;
  const showCounter = charCount > 200;
  const isOverLimit = charCount > 280;

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
              autoResize(e.target);
            }
          }}
          onInput={(e) => autoResize(e.currentTarget)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
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
        <button
          disabled={!currentIntention.trim()}
          onClick={() => onConfirm?.(currentIntention.trim())}
          title="Confirm intention"
          aria-label="Confirm intention"
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all bg-[#E54B4B]/10 text-[#E54B4B] hover:bg-[#E54B4B]/20 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
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
