"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { GetAchievementsResponse, AchievementWithStatus } from "@/lib/types";

export default function AchievementDashboardWidget() {
  const { data: session } = useSession();
  const [data, setData] = useState<GetAchievementsResponse | null>(null);

  useEffect(() => {
    if (!session?.user?.emailVerified) return;
    fetch("/api/achievements")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [session?.user?.emailVerified]);

  if (!session?.user || !session.user.emailVerified || !data) return null;

  const bronzeStats = data.summary.byTier.bronze;

  // Find 3 closest-to-unlocking bronze counted achievements
  const closest = data.achievements
    .filter(
      (a): a is AchievementWithStatus =>
        !a.unlocked &&
        a.tier === "bronze" &&
        a.progressType === "count" &&
        a.progressTarget != null &&
        (a.currentProgress ?? 0) > 0
    )
    .sort((a, b) => {
      const ratioA = (a.currentProgress ?? 0) / (a.progressTarget ?? 1);
      const ratioB = (b.currentProgress ?? 0) / (b.progressTarget ?? 1);
      return ratioB - ratioA;
    })
    .slice(0, 3);

  return (
    <div
      className="rounded-2xl border-2 border-[#F0E6D3] p-4"
      style={{ backgroundColor: "#FDF6EC" }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-[#3D2C2C] text-sm flex items-center gap-1.5">
          🏆 Achievements
        </span>
        <Link href="/trophies" className="text-xs text-[#E54B4B] font-semibold hover:underline">
          View all →
        </Link>
      </div>

      {/* Summary line */}
      <div className="flex items-center gap-2 text-xs text-[#8B7355] mb-3">
        <span className="font-semibold text-[#3D2C2C]">{bronzeStats.unlocked} / {bronzeStats.total} bronze</span>
      </div>

      {/* Closest to unlocking */}
      {closest.length > 0 && (
        <div>
          <p className="text-[10px] text-[#A08060] uppercase tracking-wide font-semibold mb-2">Closest to unlocking</p>
          <div className="flex flex-col gap-2">
            {closest.map((a) => {
              const pct = Math.min(100, Math.round(((a.currentProgress ?? 0) / (a.progressTarget ?? 1)) * 100));
              return (
                <div key={a.id}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs text-[#3D2C2C] font-medium flex items-center gap-1">
                      {a.emoji} {a.name}
                    </span>
                    <span className="text-[10px] text-[#8B7355]">
                      {a.currentProgress} / {a.progressTarget}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-[#F0E6D3] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#E54B4B]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {closest.length === 0 && bronzeStats.unlocked < bronzeStats.total && (
        <p className="text-xs text-[#A08060]">
          Complete more sessions to make progress on achievements!
        </p>
      )}
    </div>
  );
}
