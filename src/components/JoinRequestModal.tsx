"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

type ModalPhase = "confirm" | "waiting" | "approved" | "denied" | "expired" | "error";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
  hostName: string;
}

export default function JoinRequestModal({
  isOpen,
  onClose,
  roomId,
  roomName,
  hostName,
}: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<ModalPhase>("confirm");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const navigateTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Clean up on unmount or close
  useEffect(() => {
    if (!isOpen) {
      clearPolling();
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
      // Reset to confirm when closed (with a tiny delay to avoid flash)
      const t = setTimeout(() => setPhase("confirm"), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen, clearPolling]);

  useEffect(() => {
    return () => {
      clearPolling();
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
    };
  }, [clearPolling]);

  const startPolling = useCallback(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomId}/join-requests/status`);
        if (!res.ok) return; // network blip, keep polling
        const data = await res.json();
        const status: string = data.status;

        if (status === "approved") {
          clearPolling();
          setPhase("approved");
          navigateTimerRef.current = setTimeout(() => {
            router.push(`/room/${roomId}`);
          }, 1000);
        } else if (status === "denied") {
          clearPolling();
          setPhase("denied");
        } else if (status === "expired" || status === "not_found") {
          clearPolling();
          setPhase("expired");
        }
        // If still "pending", keep polling
      } catch {
        // network error — keep polling
      }
    };

    pollIntervalRef.current = setInterval(poll, 3000);
  }, [roomId, router, clearPolling]);

  const handleSendRequest = async () => {
    setIsSending(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/rooms/${roomId}/join-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.status === 201) {
        setPhase("waiting");
        startPolling();
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(data.error ?? "Failed to send request. Please try again.");
      }
    } catch {
      setErrorMessage("Failed to send request. Please check your connection.");
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    clearPolling();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-[#3D2C2C]/40 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {phase === "confirm" && (
          <ConfirmPhase
            hostName={hostName}
            roomName={roomName}
            isSending={isSending}
            errorMessage={errorMessage}
            onSend={handleSendRequest}
            onClose={handleClose}
          />
        )}

        {phase === "waiting" && (
          <WaitingPhase hostName={hostName} onClose={handleClose} />
        )}

        {phase === "approved" && (
          <ApprovedPhase />
        )}

        {phase === "denied" && (
          <DeniedPhase hostName={hostName} onClose={handleClose} />
        )}

        {phase === "expired" && (
          <ExpiredPhase onClose={handleClose} />
        )}

        {phase === "error" && (
          <ErrorPhase message={errorMessage} onClose={handleClose} />
        )}
      </div>
    </div>
  );
}

function ConfirmPhase({
  hostName,
  roomName,
  isSending,
  errorMessage,
  onSend,
  onClose,
}: {
  hostName: string;
  roomName: string;
  isSending: boolean;
  errorMessage: string;
  onSend: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <h2 className="text-lg font-bold text-[#3D2C2C] mb-1">
        Join {hostName}&apos;s Room?
      </h2>
      <p className="text-sm text-[#8B7355] mb-1">{roomName}</p>
      <p className="text-sm text-[#A08060] mb-5">
        They&apos;ll see a notification and can approve or deny your request.
      </p>
      {errorMessage && (
        <p className="text-sm text-[#E54B4B] font-semibold mb-4">{errorMessage}</p>
      )}
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2.5 bg-[#FDF6EC] border-2 border-[#F0E6D3] text-[#5C4033] rounded-xl font-bold hover:bg-[#F5EDE0] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSend}
          disabled={isSending}
          className="flex-1 px-4 py-2.5 bg-[#E54B4B] text-white rounded-xl font-bold hover:bg-[#D43D3D] transition-colors shadow-md shadow-[#E54B4B]/20 disabled:opacity-50"
        >
          {isSending ? "Sending..." : "Send Join Request"}
        </button>
      </div>
    </>
  );
}

function WaitingPhase({
  hostName,
  onClose,
}: {
  hostName: string;
  onClose: () => void;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-[#F0E6D3] border-t-[#E54B4B] rounded-full animate-spin mx-auto mb-4" />
      <h2 className="text-base font-bold text-[#3D2C2C] mb-1">
        Waiting for {hostName} to respond...
      </h2>
      <p className="text-sm text-[#A08060] mb-5">This request will expire in 5 minutes.</p>
      <button
        onClick={onClose}
        className="w-full px-4 py-2.5 bg-[#FDF6EC] border-2 border-[#F0E6D3] text-[#5C4033] rounded-xl font-bold hover:bg-[#F5EDE0] transition-colors"
      >
        Close
      </button>
    </div>
  );
}

function ApprovedPhase() {
  return (
    <div className="text-center py-2">
      <div className="text-4xl mb-3">&#10003;</div>
      <h2 className="text-base font-bold text-[#6EAE3E] mb-1">Request approved!</h2>
      <p className="text-sm text-[#A08060]">Joining room...</p>
    </div>
  );
}

function DeniedPhase({
  hostName,
  onClose,
}: {
  hostName: string;
  onClose: () => void;
}) {
  return (
    <div className="text-center">
      <div className="text-4xl mb-3">&#10007;</div>
      <h2 className="text-base font-bold text-[#E54B4B] mb-1">Request declined</h2>
      <p className="text-sm text-[#A08060] mb-5">{hostName} declined your request.</p>
      <button
        onClick={onClose}
        className="w-full px-4 py-2.5 bg-[#FDF6EC] border-2 border-[#F0E6D3] text-[#5C4033] rounded-xl font-bold hover:bg-[#F5EDE0] transition-colors"
      >
        Close
      </button>
    </div>
  );
}

function ExpiredPhase({ onClose }: { onClose: () => void }) {
  return (
    <div className="text-center">
      <div className="text-4xl mb-3">&#9202;</div>
      <h2 className="text-base font-bold text-[#3D2C2C] mb-1">Request expired</h2>
      <p className="text-sm text-[#A08060] mb-5">
        The request expired or the room no longer exists.
      </p>
      <button
        onClick={onClose}
        className="w-full px-4 py-2.5 bg-[#FDF6EC] border-2 border-[#F0E6D3] text-[#5C4033] rounded-xl font-bold hover:bg-[#F5EDE0] transition-colors"
      >
        Close
      </button>
    </div>
  );
}

function ErrorPhase({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="text-center">
      <h2 className="text-base font-bold text-[#E54B4B] mb-2">Something went wrong</h2>
      <p className="text-sm text-[#A08060] mb-5">{message}</p>
      <button
        onClick={onClose}
        className="w-full px-4 py-2.5 bg-[#FDF6EC] border-2 border-[#F0E6D3] text-[#5C4033] rounded-xl font-bold hover:bg-[#F5EDE0] transition-colors"
      >
        Close
      </button>
    </div>
  );
}
