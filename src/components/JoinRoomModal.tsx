"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RoomResponse } from "@/lib/types";

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function JoinRoomModal({ isOpen, onClose }: JoinRoomModalProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<RoomResponse | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const resetState = useCallback(() => {
    setCode("");
    setError("");
    setPreview(null);
    setPreviewing(false);
    setLoading(false);
  }, []);

  // Auto-lookup room when code reaches 6 characters
  useEffect(() => {
    if (code.length !== 6) {
      setPreview(null);
      setError("");
      return;
    }

    let cancelled = false;
    const lookup = async () => {
      setPreviewing(true);
      setError("");
      try {
        const res = await fetch(`/api/rooms/${code}`);
        if (cancelled) return;
        if (!res.ok) {
          setError("Room not found. Check the code and try again.");
          setPreview(null);
        } else {
          const data: RoomResponse = await res.json();
          setPreview(data);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to find room.");
          setPreview(null);
        }
      } finally {
        if (!cancelled) setPreviewing(false);
      }
    };
    lookup();
    return () => { cancelled = true; };
  }, [code]);

  if (!isOpen) return null;

  const handleJoin = () => {
    if (!preview) return;
    setLoading(true);
    router.push(`/room/${code}`);
  };

  const handleCodeChange = (value: string) => {
    setCode(value.toUpperCase().slice(0, 6));
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#3D2C2C]/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={handleClose}>
      <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-[#3D2C2C] mb-6">Join a Room</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[#5C4033] font-semibold mb-1">Room Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              className="w-full bg-[#FDF6EC] border-2 border-[#F0E6D3] rounded-xl px-4 py-3 text-[#3D2C2C] text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-[#E54B4B] transition-colors"
              placeholder="ABC123"
              maxLength={6}
              autoFocus
            />
          </div>

          {/* Loading indicator */}
          {previewing && (
            <div className="text-center text-sm text-[#A08060] font-semibold">
              Looking up room...
            </div>
          )}

          {/* Room preview */}
          {preview && (
            <div className="bg-[#FDF6EC] border-2 border-[#F0E6D3] rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-[#3D2C2C]">{preview.name}</p>
                  <p className="text-sm text-[#8B7355] mt-0.5">
                    {preview.participants.length} participant{preview.participants.length !== 1 ? "s" : ""}
                    {" · "}
                    Hosted by {preview.hostName}
                  </p>
                </div>
                <div className="flex -space-x-2">
                  {preview.participants.slice(0, 4).map((p) => (
                    <div
                      key={p.id}
                      className="w-8 h-8 rounded-full bg-[#E54B4B] flex items-center justify-center text-white text-xs font-bold border-2 border-white"
                      title={p.name}
                    >
                      {p.name[0].toUpperCase()}
                    </div>
                  ))}
                  {preview.participants.length > 4 && (
                    <div className="w-8 h-8 rounded-full bg-[#F0E6D3] flex items-center justify-center text-[#8B7355] text-xs font-bold border-2 border-white">
                      +{preview.participants.length - 4}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-[#E54B4B] text-sm font-semibold">{error}</p>}

          <button
            onClick={handleJoin}
            disabled={loading || !preview}
            className="w-full py-3 bg-[#E54B4B] text-white rounded-xl font-bold hover:bg-[#D43D3D] transition-colors disabled:opacity-50 shadow-md shadow-[#E54B4B]/20"
          >
            {loading ? "Joining..." : "Join Room"}
          </button>
        </div>
      </div>
    </div>
  );
}
