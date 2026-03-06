"use client";

import { useState, useEffect } from "react";

interface InterruptPromptModalProps {
  elapsedSeconds: number;
  onCount: () => void;
  onDiscard: () => void;
}

export default function InterruptPromptModal({
  elapsedSeconds,
  onCount,
  onDiscard,
}: InterruptPromptModalProps) {
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDiscard();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onDiscard]);

  const minutes = Math.max(1, Math.round(elapsedSeconds / 60));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#3D2C2C]/40 backdrop-blur-sm"
        onClick={onDiscard}
      />

      {/* Modal card */}
      <div className="relative z-10 w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl bg-[#FDF6EC] border border-[#3D2C2C]/10 shadow-2xl overflow-hidden">
        <div className="p-6 flex flex-col gap-4">
          {/* Heading */}
          <h2 className="text-lg font-semibold text-[#3D2C2C]">
            Count this session?
          </h2>

          {/* Body */}
          <p className="text-sm text-[#5C4033]">
            You worked for {minutes} min. Should this count toward your analytics?
          </p>

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={onCount}
              className="w-full py-3 bg-[#E54B4B] text-white rounded-full font-bold hover:bg-[#D43D3D] transition-colors"
            >
              Yes, count it
            </button>
            <button
              onClick={onDiscard}
              className="w-full py-3 bg-white border-2 border-[#F0E6D3] text-[#5C4033] rounded-full font-bold hover:bg-[#FFF8F0] transition-colors"
            >
              Don&apos;t count it
            </button>
          </div>
        </div>

        {/* Countdown progress bar */}
        <div className="h-1 bg-[#F0E6D3] w-full">
          <div
            className="h-1 bg-[#E54B4B] transition-all duration-1000 linear"
            style={{ width: `${(countdown / 15) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
