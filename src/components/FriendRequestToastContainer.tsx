"use client";

import { useState, useCallback } from "react";
import { FriendRequest } from "@/lib/types";
import FriendRequestToast from "./FriendRequestToast";
import { useFriendRequestPolling } from "@/hooks/useFriendRequestPolling";

export default function FriendRequestToastContainer() {
  const [queue, setQueue] = useState<FriendRequest[]>([]);

  const handleNewRequest = useCallback((request: FriendRequest) => {
    setQueue((prev) => [...prev, request]);
  }, []);

  useFriendRequestPolling(handleNewRequest);

  const dismiss = useCallback((id: string) => {
    setQueue((prev) => prev.filter((r) => r.id !== id));
  }, []);

  if (queue.length === 0) return null;

  const current = queue[0];

  return (
    <div className="pointer-events-auto">
      <FriendRequestToast
        key={current.id}
        request={current}
        onDismiss={() => dismiss(current.id)}
      />
    </div>
  );
}
