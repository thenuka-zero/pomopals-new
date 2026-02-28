"use client";

import { use } from "react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import RoomView from "@/components/RoomView";
import AuthModal from "@/components/AuthModal";

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const { data: session, status } = useSession();
  const [guestName, setGuestName] = useState("");
  const [joinedAsGuest, setJoinedAsGuest] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-57px)]">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  // If authenticated, show room directly
  if (session?.user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <RoomView
          roomId={roomId}
          userId={session.user.id!}
          userName={session.user.name || "Anonymous"}
        />
      </div>
    );
  }

  // If joined as guest, show room
  if (joinedAsGuest && guestName) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <RoomView
          roomId={roomId}
          userId={`guest-${guestName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`}
          userName={guestName}
        />
      </div>
    );
  }

  // Otherwise show join prompt
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-57px)] px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Join Room</h1>
          <p className="text-gray-400 text-sm">
            Room Code: <span className="font-mono text-white">{roomId}</span>
          </p>
        </div>

        {/* Guest join */}
        <div className="space-y-3">
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white text-center focus:outline-none focus:border-red-500"
            placeholder="Your name"
          />
          <button
            onClick={() => setJoinedAsGuest(true)}
            disabled={!guestName.trim()}
            className="w-full py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Join as Guest
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-gray-500 text-sm">or</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        <button
          onClick={() => setShowAuth(true)}
          className="w-full py-3 bg-gray-800 border border-gray-700 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
        >
          Sign In to Join
        </button>
      </div>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
