"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Timer from "@/components/Timer";
import Settings from "@/components/Settings";
import CreateRoomModal from "@/components/CreateRoomModal";
import JoinRoomModal from "@/components/JoinRoomModal";
import { useTimerStore } from "@/store/timer-store";
import { v4 as uuidv4 } from "uuid";

export default function Home() {
  const { data: session } = useSession();
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const { sessions, status, phase, settings, timeRemaining } = useTimerStore();

  // Record completed sessions to analytics API
  useEffect(() => {
    if (!session?.user?.id || sessions.length === 0) return;

    const lastSession = sessions[sessions.length - 1];
    if (lastSession.userId === "") {
      // Mark with user ID and send to server
      lastSession.userId = session.user.id;
      fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lastSession),
      });
    }
  }, [sessions, session]);

  // Record partial sessions when user navigates away
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (status === "running" && phase === "work" && session?.user?.id) {
        const totalDuration = settings.workDuration * 60;
        const elapsed = totalDuration - timeRemaining;
        if (elapsed > 0) {
          const partialSession = {
            id: uuidv4(),
            userId: session.user.id,
            startedAt: new Date(Date.now() - elapsed * 1000).toISOString(),
            endedAt: new Date().toISOString(),
            phase: "work",
            plannedDuration: totalDuration,
            actualDuration: elapsed,
            completed: false,
            completionPercentage: Math.round((elapsed / totalDuration) * 100),
            date: new Date().toISOString().split("T")[0],
          };
          navigator.sendBeacon(
            "/api/analytics",
            new Blob([JSON.stringify(partialSession)], { type: "application/json" })
          );
        }
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [status, phase, settings, timeRemaining, session]);

  const userId = session?.user?.id || "guest-" + Math.random().toString(36).slice(2);
  const userName = session?.user?.name || "Guest";

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-57px)] px-4 py-8">
      <div className="w-full max-w-lg flex flex-col items-center gap-8">
        {/* Timer */}
        <Timer />

        {/* Action buttons */}
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Settings
          </button>

          {session && (
            <button
              onClick={() => setShowCreateRoom(true)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Create Room
            </button>
          )}

          <button
            onClick={() => setShowJoinRoom(true)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Join Room
          </button>
        </div>

        {/* Tip */}
        {!session && (
          <p className="text-gray-500 text-sm text-center">
            Sign in to save your analytics and create rooms for friends.
          </p>
        )}
      </div>

      {/* Modals */}
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      {session && (
        <CreateRoomModal
          isOpen={showCreateRoom}
          onClose={() => setShowCreateRoom(false)}
          userId={userId}
          userName={userName}
        />
      )}
      <JoinRoomModal isOpen={showJoinRoom} onClose={() => setShowJoinRoom(false)} />
    </div>
  );
}
