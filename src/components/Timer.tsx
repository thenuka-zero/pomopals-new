"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTimerStore } from "@/store/timer-store";

interface TimerProps {
  onStart?: () => void;
  onPause?: () => void;
  onReset?: () => void;
  onSkip?: () => void;
  isRoomMode?: boolean;
}

export default function Timer({ onStart, onPause, onReset, onSkip, isRoomMode }: TimerProps) {
  const { phase, status, timeRemaining, pomodoroCount, settings, start, pause, resume, reset, skip, tick } =
    useTimerStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRoomMode) return;
    if (status === "running") {
      intervalRef.current = setInterval(() => {
        tick();
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status, tick, isRoomMode]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  const totalDuration = (() => {
    switch (phase) {
      case "work": return settings.workDuration * 60;
      case "shortBreak": return settings.shortBreakDuration * 60;
      case "longBreak": return settings.longBreakDuration * 60;
    }
  })();

  const progress = ((totalDuration - timeRemaining) / totalDuration) * 100;

  const phaseLabel = (() => {
    switch (phase) {
      case "work": return "Focus Time";
      case "shortBreak": return "Short Break";
      case "longBreak": return "Long Break";
    }
  })();

  const isWork = phase === "work";
  const phaseColor = isWork ? "text-[#E54B4B]" : "text-[#6EAE3E]";
  const progressStroke = isWork ? "#E54B4B" : "#6EAE3E";
  const trackStroke = isWork ? "#F5D0D0" : "#D0EDBC";

  const handleStart = useCallback(() => {
    if (isRoomMode && onStart) onStart(); else start();
  }, [isRoomMode, onStart, start]);

  const handlePause = useCallback(() => {
    if (isRoomMode && onPause) onPause(); else pause();
  }, [isRoomMode, onPause, pause]);

  const handleResume = useCallback(() => {
    if (isRoomMode && onStart) onStart(); else resume();
  }, [isRoomMode, onStart, resume]);

  const handleReset = useCallback(() => {
    if (isRoomMode && onReset) onReset(); else reset();
  }, [isRoomMode, onReset, reset]);

  const handleSkip = useCallback(() => {
    if (isRoomMode && onSkip) onSkip(); else skip();
  }, [isRoomMode, onSkip, skip]);

  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Phase indicator */}
      <div className={`text-lg font-bold ${phaseColor}`}>{phaseLabel}</div>

      {/* Circular timer */}
      <div className="relative w-72 h-72">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 280 280">
          <circle cx="140" cy="140" r={radius} fill="none" stroke={trackStroke} strokeWidth="8" />
          <circle
            cx="140"
            cy="140"
            r={radius}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            stroke={progressStroke}
            className="transition-all duration-1000 ease-linear"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-6xl font-extrabold text-[#3D2C2C] tabular-nums font-mono">
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
          <span className="text-sm text-[#A08060] mt-2 font-semibold">Pomodoro #{pomodoroCount + 1}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {status === "idle" && (
          <button onClick={handleStart} className="px-8 py-3 bg-[#E54B4B] text-white rounded-full font-bold shadow-lg shadow-[#E54B4B]/25 hover:bg-[#D43D3D] hover:-translate-y-0.5 transition-all">
            Start
          </button>
        )}
        {status === "running" && (
          <button onClick={handlePause} className="px-8 py-3 bg-white border-2 border-[#F0E6D3] text-[#5C4033] rounded-full font-bold hover:border-[#E54B4B]/30 transition-all">
            Pause
          </button>
        )}
        {status === "paused" && (
          <>
            <button onClick={handleResume} className="px-8 py-3 bg-[#E54B4B] text-white rounded-full font-bold shadow-lg shadow-[#E54B4B]/25 hover:bg-[#D43D3D] transition-all">
              Resume
            </button>
            <button onClick={handleReset} className="px-6 py-3 bg-white border-2 border-[#F0E6D3] text-[#5C4033] rounded-full font-bold hover:border-[#E54B4B]/30 transition-all">
              Reset
            </button>
          </>
        )}
        <button onClick={handleSkip} className="px-4 py-3 text-[#A08060] hover:text-[#E54B4B] transition-colors" title="Skip to next phase">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 5v14l11-7z" /><path d="M19 5v14h-2V5h2z" />
          </svg>
        </button>
      </div>

      {/* Pomodoro dots */}
      <div className="flex gap-2 mt-2">
        {Array.from({ length: settings.longBreakInterval }, (_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-colors ${
              i < (pomodoroCount % settings.longBreakInterval)
                ? "bg-[#E54B4B]"
                : i === (pomodoroCount % settings.longBreakInterval) && phase === "work"
                ? "bg-[#F5A0A0]"
                : "bg-[#F0E6D3]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
