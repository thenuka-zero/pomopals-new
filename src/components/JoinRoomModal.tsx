"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function JoinRoomModal({ isOpen, onClose }: JoinRoomModalProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const roomCode = code.trim().toUpperCase();
    try {
      const res = await fetch(`/api/rooms/${roomCode}`);
      if (!res.ok) {
        setError("Room not found. Check the code and try again.");
        setLoading(false);
        return;
      }
      router.push(`/room/${roomCode}`);
    } catch {
      setError("Failed to find room.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#3D2C2C]/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-[#3D2C2C] mb-6">Join a Room</h2>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm text-[#5C4033] font-semibold mb-1">Room Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full bg-[#FDF6EC] border-2 border-[#F0E6D3] rounded-xl px-4 py-3 text-[#3D2C2C] text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-[#E54B4B] transition-colors"
              placeholder="ABC123"
              maxLength={6}
              required
            />
          </div>

          {error && <p className="text-[#E54B4B] text-sm font-semibold">{error}</p>}

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full py-3 bg-[#E54B4B] text-white rounded-xl font-bold hover:bg-[#D43D3D] transition-colors disabled:opacity-50 shadow-md shadow-[#E54B4B]/20"
          >
            {loading ? "Joining..." : "Join Room"}
          </button>
        </form>
      </div>
    </div>
  );
}
