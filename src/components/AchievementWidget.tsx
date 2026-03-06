"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { AchievementWithStatus } from "@/lib/types";
import { DynamicStyle } from "@/components/DynamicStyle";

export default function AchievementWidget() {
  const { data: session } = useSession();
  const [recent, setRecent] = useState<AchievementWithStatus[]>([]);
  const [unlocked, setUnlocked] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) {
      setLoading(false);
      return;
    }
    fetch("/api/achievements")
      .then((r) => r.json())
      .then((data) => {
        if (data.achievements) {
          const all: AchievementWithStatus[] = data.achievements;
          const unlockedOnes = all
            .filter((a) => a.unlocked)
            .sort((a, b) =>
              (b.unlockedAt ?? "").localeCompare(a.unlockedAt ?? "")
            )
            .slice(0, 5);
          setRecent(unlockedOnes);
          setUnlocked(data.summary?.unlocked ?? 0);
          setTotal(data.summary?.total ?? 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session?.user]);

  if (!session?.user) return null;
  if (loading) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm text-[#8B7355] font-semibold uppercase tracking-wide">
          Trophies
        </h2>
        <Link
          href="/trophies"
          className="text-xs text-[#E54B4B] font-semibold hover:underline"
        >
          View all
        </Link>
      </div>
      <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-[#3D2C2C] font-medium">
            {unlocked} / {total} unlocked
          </span>
          <span className="text-xs text-[#3D2C2C]/40">
            {total > 0 ? Math.round((unlocked / total) * 100) : 0}%
          </span>
        </div>
        <div className="w-full h-2 bg-[#F0E6D3] rounded-full overflow-hidden mb-3">
          <DynamicStyle css={`#aw-progress { width: ${total > 0 ? (unlocked / total) * 100 : 0}%; }`} />
          <div id="aw-progress" className="h-full bg-[#E54B4B] rounded-full transition-all" />
        </div>
        {recent.length > 0 ? (
          <div className="flex gap-2 flex-wrap">
            {recent.map((a) => (
              <span
                key={a.id}
                title={a.name}
                className="text-xl cursor-default"
              >
                {a.emoji}
              </span>
            ))}
            {unlocked > 5 && (
              <span className="text-xs text-[#3D2C2C]/40 self-center ml-1">
                +{unlocked - 5} more
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-[#A08060]">
            Complete Pomodoros to unlock achievements!
          </p>
        )}
      </div>
    </section>
  );
}
