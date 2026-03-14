"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FriendRequest } from "@/lib/types";

interface FriendRequestToastProps {
  request: FriendRequest;
  onDismiss: () => void;
}

export default function FriendRequestToast({ request, onDismiss }: FriendRequestToastProps) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleDismiss = () => {
    setLeaving(true);
    setTimeout(onDismiss, 400);
  };

  const initial = request.requesterName.charAt(0).toUpperCase();
  const dateSent = new Date(request.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className={`
        w-80 bg-white rounded-2xl shadow-xl border-2 border-sand overflow-hidden
        transition-all duration-[400ms] ease-out
        ${visible && !leaving ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}
      `}
    >
      {/* Header strip */}
      <div className="px-4 py-2 flex items-center justify-between bg-cream">
        <span className="text-xs font-bold text-[#8B7355] tracking-wide uppercase flex items-center gap-1">
          👥 New Friend Request
        </span>
        <button
          onClick={handleDismiss}
          className="text-[#A08060] hover:text-[#E54B4B] transition-colors text-lg leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#E54B4B] flex items-center justify-center text-white font-bold flex-shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#3D2C2C] text-sm">{request.requesterName}</p>
            <p className="text-xs text-[#8B7355]">{dateSent}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-3">
        <Link
          href="/friends"
          onClick={handleDismiss}
          className="block w-full text-center py-1.5 text-xs font-bold text-[#E54B4B] border border-[#E54B4B]/30 rounded-full hover:bg-[#E54B4B]/5 transition-colors"
        >
          View Requests →
        </Link>
      </div>
    </div>
  );
}
