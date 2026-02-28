"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTimerStore } from "@/store/timer-store";

interface TimerProps {
  // If provided, timer is in "synced room" mode and these callbacks control the room
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

  // Tick the timer every second when running (solo mode only)
  useEffect(() => {
    if (isRoomMode) return; // Room mode is synced from server

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

  const phaseColor = phase === "work" ? "text-red-500" : "text-green-500";
  const progressColor = phase === "work" ? "stroke-red-500" : "stroke-green-500";
  const bgGlow = phase === "work" ? "shadow-red-500/20" : "shadow-green-500/20";

  const handleStart = useCallback(() => {
    if (isRoomMode && onStart) {
      onStart();
    } else {
      start();
    }
  }, [isRoomMode, onStart, start]);

  const handlePause = useCallback(() => {
    if (isRoomMode && onPause) {
      onPause();
    } else {
      pause();
    }
  }, [isRoomMode, onPause, pause]);

  const handleResume = useCallback(() => {
    if (isRoomMode && onStart) {
      onStart();
    } else {
      resume();
    }
  }, [isRoomMode, onStart, resume]);

  const handleReset = useCallback(() => {
    if (isRoomMode && onReset) {
      onReset();
    } else {
      reset();
    }
  }, [isRoomMode, onReset, reset]);

  const handleSkip = useCallback(() => {
    if (isRoomMode && onSkip) {
      onSkip();
    } else {
      skip();
    }
  }, [isRoomMode, onSkip, skip]);

  // Circle SVG parameters
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Phase indicator */}
      <div className={`text-lg font-medium ${phaseColor}`}>{phaseLabel}</div>

      {/* Circular timer */}
      <div className={`relative w-72 h-72 rounded-full shadow-2xl ${bgGlow}`}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 280 280">
          <circle cx="140" cy="140" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-gray-800" />
          <circle
            cx="140"
            cy="140"
            r={radius}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            className={`${progressColor} transition-all duration-1000 ease-linear`}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-6xl font-mono font-bold text-white tabular-nums">
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
          <span className="text-sm text-gray-400 mt-2">Pomodoro #{pomodoroCount + 1}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {status === "idle" && (
          <button onClick={handleStart} className="px-8 py-3 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-colors">
            Start
          </button>
        )}
        {status === "running" && (
          <button onClick={handlePause} className="px-8 py-3 bg-white/10 text-white rounded-full font-semibold hover:bg-white/20 transition-colors border border-white/20">
            Pause
          </button>
        )}
        {status === "paused" && (
          <>
            <button onClick={handleResume} className="px-8 py-3 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-colors">
              Resume
            </button>
            <button onClick={handleReset} className="px-6 py-3 bg-white/10 text-white rounded-full font-semibold hover:bg-white/20 transition-colors border border-white/20">
              Reset
            </button>
          </>
        )}
        <button onClick={handleSkip} className="px-6 py-3 text-gray-400 hover:text-white transition-colors" title="Skip to next phase">
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
                ? "bg-red-500"
                : i === (pomodoroCount % settings.longBreakInterval) && phase === "work"
                ? "bg-red-500/40"
                : "bg-gray-700"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
