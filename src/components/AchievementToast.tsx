"use client";

import { useState, useEffect, useId } from "react";
import Link from "next/link";
import { PendingAchievement, AchievementTier } from "@/lib/types";
import { DynamicStyle } from "@/components/DynamicStyle";

interface AchievementToastProps {
  achievement: PendingAchievement;
  onDismiss: () => void;
}

function TierBadge({ tier }: { tier: AchievementTier }) {
  const config = {
    bronze:   { label: "Bronze",   bg: "#FFF3E0", color: "#CD7F32", border: "#F4C07A" },
    silver:   { label: "Silver",   bg: "#F5F5F5", color: "#757575", border: "#BDBDBD" },
    gold:     { label: "Gold",     bg: "#FFFDE7", color: "#F9A825", border: "#FDD835" },
    platinum: { label: "Platinum", bg: "#E3F2FD", color: "#1565C0", border: "#90CAF9" },
  }[tier];

  const id = `tb-${useId().replace(/:/g, "")}`;

  return (
    <>
      <DynamicStyle css={`#${id} { background-color: ${config.bg}; color: ${config.color}; border: 1px solid ${config.border}; }`} />
      <span
        id={id}
        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
      >
        {tier === "bronze" ? "🥉" : tier === "silver" ? "🥈" : tier === "gold" ? "🥇" : "💎"} {config.label.toUpperCase()}
      </span>
    </>
  );
}

export default function AchievementToast({ achievement, onDismiss }: AchievementToastProps) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDismiss = () => {
    setLeaving(true);
    setTimeout(onDismiss, 400);
  };

  return (
    <div
      className={`
        w-80 bg-white rounded-2xl shadow-xl border-2 border-sand overflow-hidden
        transition-all duration-[400ms] ease-out
        ${visible && !leaving ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}
      `}
    >
      {/* Header strip */}
      <div
        className="px-4 py-2 flex items-center justify-between bg-cream"
      >
        <span className="text-xs font-bold text-[#8B7355] tracking-wide uppercase flex items-center gap-1">
          🎉 Achievement Unlocked
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
        <div className="flex items-start gap-3">
          <span className="text-3xl leading-none mt-0.5" role="img" aria-label={achievement.name}>
            {achievement.emoji}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-[#3D2C2C] text-sm">{achievement.name}</span>
              <TierBadge tier={achievement.tier} />
            </div>
            <p className="text-xs text-[#8B7355] leading-relaxed line-clamp-2">
              {achievement.toastCopy}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-3">
        <Link
          href="/trophies"
          onClick={handleDismiss}
          className="block w-full text-center py-1.5 text-xs font-bold text-[#E54B4B] border border-[#E54B4B]/30 rounded-full hover:bg-[#E54B4B]/5 transition-colors"
        >
          View Trophy Case →
        </Link>
      </div>

    </div>
  );
}
