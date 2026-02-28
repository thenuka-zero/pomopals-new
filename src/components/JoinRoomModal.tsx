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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-semibold text-white mb-6">Join a Room</h2>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Room Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-red-500"
              placeholder="ABC123"
              maxLength={6}
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {loading ? "Joining..." : "Join Room"}
          </button>
        </form>
      </div>
    </div>
  );
}
