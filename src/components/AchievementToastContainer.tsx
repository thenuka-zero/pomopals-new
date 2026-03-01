"use client";

import { useState, useCallback } from "react";
import { PendingAchievement } from "@/lib/types";
import AchievementToast from "./AchievementToast";
import { useAchievementPolling } from "@/hooks/useAchievementPolling";

export default function AchievementToastContainer() {
  const [queue, setQueue] = useState<PendingAchievement[]>([]);

  const handleUnlock = useCallback((achievement: PendingAchievement) => {
    setQueue((prev) => [...prev, achievement]);
  }, []);

  useAchievementPolling(handleUnlock);

  const dismiss = useCallback((id: string) => {
    setQueue((prev) => prev.filter((a) => a.id !== id));
  }, []);

  if (queue.length === 0) return null;

  // Show only the first toast at a time
  const current = queue[0];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      <div className="pointer-events-auto">
        <AchievementToast
          key={current.id}
          achievement={current}
          onDismiss={() => dismiss(current.id)}
        />
      </div>
    </div>
  );
}
