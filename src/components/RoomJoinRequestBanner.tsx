"use client";

import { useState } from "react";
import type { RoomJoinRequest } from "@/lib/types";

interface Props {
  requests: RoomJoinRequest[];
  roomId: string;
  onApprove: (requestId: string) => Promise<void>;
  onDeny: (requestId: string) => Promise<void>;
}

export default function RoomJoinRequestBanner({
  requests,
  roomId: _roomId,
  onApprove,
  onDeny,
}: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (requests.length === 0) return null;

  const primary = requests[0];
  const othersCount = requests.length - 1;

  const handleApprove = async () => {
    setLoadingId(`approve-${primary.id}`);
    try {
      await onApprove(primary.id);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeny = async () => {
    setLoadingId(`deny-${primary.id}`);
    try {
      await onDeny(primary.id);
    } finally {
      setLoadingId(null);
    }
  };

  const isLoading = loadingId !== null;

  return (
    <div className="w-full bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
      {/* Bell icon */}
      <div className="flex-shrink-0 text-amber-500">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </div>

      {/* Message */}
      <p className="flex-1 text-sm font-semibold text-amber-800 min-w-0">
        <span className="font-bold">{primary.requesterName}</span>
        {othersCount > 0 ? ` and ${othersCount} other${othersCount > 1 ? "s" : ""}` : ""}{" "}
        want{requests.length === 1 ? "s" : ""} to join your room.
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleDeny}
          disabled={isLoading}
          className="px-3 py-1.5 text-xs border-2 border-amber-300 text-amber-700 rounded-full font-semibold hover:bg-amber-100 transition-colors disabled:opacity-50"
        >
          {loadingId === `deny-${primary.id}` ? "..." : "Deny"}
        </button>
        <button
          onClick={handleApprove}
          disabled={isLoading}
          className="px-3 py-1.5 text-xs bg-[#6EAE3E] text-white rounded-full font-semibold hover:bg-[#5A9632] transition-colors disabled:opacity-50"
        >
          {loadingId === `approve-${primary.id}` ? "..." : "Approve"}
        </button>
      </div>
    </div>
  );
}
