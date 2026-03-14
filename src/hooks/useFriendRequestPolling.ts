"use client";

import { useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useTimerStore } from "@/store/timer-store";
import { FriendRequest } from "@/lib/types";

export function useFriendRequestPolling(onNewRequest: (request: FriendRequest) => void) {
  const { data: session } = useSession();
  const timerStatus = useTimerStore((s) => s.status);
  const onNewRequestRef = useRef(onNewRequest);
  onNewRequestRef.current = onNewRequest;

  const fetchPending = useCallback(async () => {
    if (!session?.user?.id || !session.user.emailVerified) return;
    if (timerStatus === "running") return;

    try {
      const res = await fetch("/api/friends/requests?direction=incoming&status=pending");
      if (!res.ok) return;
      const data = await res.json();
      const requests: FriendRequest[] = data.incoming ?? [];
      if (requests.length === 0) return;

      const notifiedIds: string[] = JSON.parse(localStorage.getItem("pomo-notified-req-ids") ?? "[]");
      const notifiedSet = new Set(notifiedIds);

      const newRequests = requests.filter((r) => !notifiedSet.has(r.id));
      if (newRequests.length === 0) return;

      // Save new IDs to both localStorage keys
      const allNotified = [...notifiedIds, ...newRequests.map((r) => r.id)];
      localStorage.setItem("pomo-notified-req-ids", JSON.stringify(allNotified));

      const existingNewReqIds: string[] = JSON.parse(localStorage.getItem("pomo-new-req-ids") ?? "[]");
      const allNewReqIds = [...new Set([...existingNewReqIds, ...newRequests.map((r) => r.id)])];
      localStorage.setItem("pomo-new-req-ids", JSON.stringify(allNewReqIds));

      for (const request of newRequests.slice(0, 5)) {
        onNewRequestRef.current(request);
      }
    } catch {
      // Silent
    }
  }, [session?.user?.id, session?.user?.emailVerified, timerStatus]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const initialTimeout = setTimeout(fetchPending, 3000);
    const interval = setInterval(fetchPending, 30_000);
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [session?.user?.id, fetchPending]);

  const prevStatus = useRef(timerStatus);
  useEffect(() => {
    if (prevStatus.current === "running" && timerStatus !== "running") {
      setTimeout(fetchPending, 1500);
    }
    prevStatus.current = timerStatus;
  }, [timerStatus, fetchPending]);
}
