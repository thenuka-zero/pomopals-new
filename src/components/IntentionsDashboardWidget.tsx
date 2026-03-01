"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { Intention, IntentionTrends } from "@/lib/types";

const STATUS_ICONS: Record<string, string> = {
  completed: "✅",
  not_completed: "❌",
  skipped: "↩️",
  pending: "⏳",
};

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function IntentionsDashboardWidget() {
  const { data: session } = useSession();
  const [intentions, setIntentions] = useState<Intention[]>([]);
  const [trends, setTrends] = useState<IntentionTrends | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [intentionsRes, trendsRes] = await Promise.all([
        fetch("/api/intentions?page=1&limit=5"),
        fetch("/api/intentions/trends"),
      ]);
      if (intentionsRes.ok) {
        const data = await intentionsRes.json();
        setIntentions(data.intentions ?? []);
      }
      if (trendsRes.ok) {
        const data = await trendsRes.json();
        setTrends(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session?.user?.emailVerified) return;
    fetchData();
  }, [session?.user?.emailVerified, fetchData]);

  if (!session?.user || !session.user.emailVerified) return null;

  if (loading) {
    return (
      <div className="rounded-2xl border-2 border-[#F0E6D3] p-4" style={{ backgroundColor: "#FDF6EC" }}>
        <div className="h-24 animate-pulse bg-[#F0E6D3] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-[#F0E6D3] p-4" style={{ backgroundColor: "#FDF6EC" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-[#3D2C2C] text-sm flex items-center gap-1.5">
          🎯 Intentions
        </span>
        <Link href="/intentions" className="text-xs text-[#E54B4B] font-semibold hover:underline">
          View all →
        </Link>
      </div>

      {/* Stats strip */}
      {trends && (
        <div className="flex items-center gap-3 text-xs text-[#8B7355] mb-3">
          <span className="font-semibold text-[#3D2C2C]">{trends.totalIntentions} total</span>
          <span>·</span>
          <span>{trends.completionRate}% completed</span>
          <span>·</span>
          <span>🔥 {trends.currentStreak} streak</span>
        </div>
      )}

      {/* Recent intentions */}
      {intentions.length === 0 ? (
        <p className="text-xs text-[#A08060]">
          Set an intention before your next session to start tracking.
        </p>
      ) : (
        <div className="space-y-1.5">
          {intentions.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-2 py-1.5"
            >
              <span className="text-sm mt-0.5 shrink-0">
                {STATUS_ICONS[item.status]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#3D2C2C] leading-relaxed truncate">
                  {item.text}
                </p>
                <span className="text-[10px] text-[#A08060]">
                  {formatTime(item.startedAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
