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
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-[#A08060] font-semibold">Loading...</div>
      </div>
    );
  }

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

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-[#3D2C2C] mb-2">Join Room</h1>
          <p className="text-[#8B7355] text-sm">
            Room Code: <span className="font-mono font-bold text-[#E54B4B]">{roomId}</span>
          </p>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="w-full bg-white border-2 border-[#F0E6D3] rounded-xl px-4 py-3 text-[#3D2C2C] text-center focus:outline-none focus:border-[#E54B4B] transition-colors"
            placeholder="Your name"
          />
          <button
            onClick={() => setJoinedAsGuest(true)}
            disabled={!guestName.trim()}
            className="w-full py-3 bg-[#E54B4B] text-white rounded-xl font-bold hover:bg-[#D43D3D] transition-colors disabled:opacity-50 shadow-md shadow-[#E54B4B]/20"
          >
            Join as Guest
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-[#F0E6D3]" />
          <span className="text-[#A08060] text-sm font-semibold">or</span>
          <div className="flex-1 h-px bg-[#F0E6D3]" />
        </div>

        <button
          onClick={() => setShowAuth(true)}
          className="w-full py-3 bg-white border-2 border-[#F0E6D3] text-[#5C4033] rounded-xl font-bold hover:border-[#E54B4B]/30 hover:bg-[#FFF8F0] transition-all"
        >
          Sign In to Join
        </button>
      </div>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
