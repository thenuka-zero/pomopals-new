"use client";

import { useState, useEffect, useId } from "react";
import { useSession } from "next-auth/react";
import { AchievementWithStatus, AchievementTier, GetAchievementsResponse } from "@/lib/types";
import { DynamicStyle } from "@/components/DynamicStyle";

// ── Tier helpers ─────────────────────────────────────────────────────────────

function tierColor(tier: AchievementTier) {
  return {
    bronze:   { text: "#CD7F32", bg: "#FFF3E0", border: "#F4C07A", badge: "🥉" },
    silver:   { text: "#757575", bg: "#F5F5F5", border: "#BDBDBD", badge: "🥈" },
    gold:     { text: "#F9A825", bg: "#FFFDE7", border: "#FDD835", badge: "🥇" },
    platinum: { text: "#1565C0", bg: "#E3F2FD", border: "#90CAF9", badge: "💎" },
  }[tier];
}

function TierBadge({ tier }: { tier: AchievementTier }) {
  const c = tierColor(tier);
  const id = `tb-${useId().replace(/:/g, "")}`;
  return (
    <>
      <DynamicStyle css={`#${id} { background-color: ${c.bg}; color: ${c.text}; border: 1px solid ${c.border}; }`} />
      <span id={id} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase">
        {c.badge} {tier}
      </span>
    </>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ current, target, color = "#E54B4B" }: { current: number; target: number; color?: string }) {
  const displayCurrent = Math.min(current, target);
  const pct = Math.min(100, Math.round((displayCurrent / target) * 100));
  const id = `pb-${useId().replace(/:/g, "")}`;
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-brown-muted mb-1">
        <span>{displayCurrent.toLocaleString()} / {target.toLocaleString()}</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-1.5 bg-sand rounded-full overflow-hidden">
        <DynamicStyle css={`#${id} { width: ${pct}%; background-color: ${color}; }`} />
        <div id={id} className="h-full rounded-full transition-all duration-500" />
      </div>
    </div>
  );
}

// ── Individual Achievement Card ────────────────────────────────────────────────

function AchievementCard({ achievement, isNew }: { achievement: AchievementWithStatus; isNew?: boolean }) {
  const isLocked = !achievement.unlocked;
  const isSecretLocked = achievement.isSecret && isLocked;
  const tierC = tierColor(achievement.tier);
  const id = `ac-${useId().replace(/:/g, "")}`;

  const borderColor = isLocked ? "#F0E6D3" : tierC.border;
  const filterVal = isLocked && !isSecretLocked ? "grayscale(0.6)" : "";
  const emojiFilter = isSecretLocked ? "grayscale(1) opacity(0.3)" : "";

  return (
    <>
      <DynamicStyle css={`
        #${id} { border-color: ${borderColor}; ${filterVal ? `filter: ${filterVal};` : ""} }
        #${id} .emoji-span { ${emojiFilter ? `filter: ${emojiFilter};` : ""} }
      `} />
      <div
        id={id}
        className={`relative rounded-2xl border-2 p-4 flex flex-col gap-2 transition-all duration-300 ${isLocked ? "opacity-70" : ""} ${isSecretLocked ? "bg-[#2A1F1F]" : "bg-white"}`}
      >
        {/* Tier badge */}
        <div className="flex items-center justify-between">
          <TierBadge tier={achievement.tier} />
          <div className="flex items-center gap-1">
            {isNew && achievement.unlocked && (
              <span className="text-[9px] font-bold bg-[#E54B4B] text-white px-1.5 py-0.5 rounded-full leading-none">New</span>
            )}
            {achievement.retroactivelyAwarded && (
              <span className="text-[9px] text-[#A08060] font-medium">★ Retroactive</span>
            )}
          </div>
        </div>

        {/* Emoji + name */}
        <div className="flex flex-col items-center text-center gap-1 py-1">
          <span
            className="text-3xl emoji-span"
            role="img"
            aria-label={achievement.name}
          >
            {achievement.emoji}
          </span>
          <span
            className={`text-sm font-bold leading-tight ${isSecretLocked ? "text-[#6B5555]" : "text-[#3D2C2C]"}`}
          >
            {achievement.name}
          </span>
        </div>

        {/* Description / hint */}
        <p className={`text-[11px] text-center leading-snug ${isSecretLocked ? "text-[#6B5555]" : "text-[#8B7355]"}`}>
          {isSecretLocked ? achievement.hint : isLocked ? achievement.hint : (achievement.description ?? achievement.hint)}
        </p>

        {/* Progress bar (count achievements) */}
        {achievement.progressType === "count" && achievement.progressTarget != null && !isSecretLocked && (
          <ProgressBar
            current={achievement.unlocked ? achievement.progressTarget : (achievement.currentProgress ?? 0)}
            target={achievement.progressTarget}
            color={achievement.unlocked ? "#6EAE3E" : "#E54B4B"}
          />
        )}

        {/* Unlock date */}
        {achievement.unlocked && achievement.unlockedAt && (
          <div className="flex items-center justify-center gap-1">
            <span className="text-[10px] text-[#6EAE3E] font-semibold">
              ✓ Unlocked {new Date(achievement.unlockedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
        )}
      </div>
    </>
  );
}

// ── Summary header ────────────────────────────────────────────────────────────

function SummaryHeader({ summary }: { summary: GetAchievementsResponse["summary"] }) {
  const bronzeStats = summary.byTier.bronze;
  const pct = bronzeStats.total > 0 ? Math.round((bronzeStats.unlocked / bronzeStats.total) * 100) : 0;
  const id = `sh-${useId().replace(/:/g, "")}`;
  return (
    <div className="bg-white rounded-2xl border-2 border-[#F0E6D3] p-5 mb-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
        <span className="text-lg font-bold text-[#3D2C2C]">
          {bronzeStats.unlocked} / {bronzeStats.total} bronze achievements
        </span>
      </div>
      <div className="w-full h-2 bg-[#F0E6D3] rounded-full overflow-hidden">
        <DynamicStyle css={`#${id} { width: ${pct}%; }`} />
        <div id={id} className="h-full rounded-full bg-[#CD7F32] transition-all duration-700" />
      </div>
    </div>
  );
}

// ── Coming Soon card ──────────────────────────────────────────────────────────

function ComingSoonSection({ tier }: { tier: AchievementTier }) {
  const c = tierColor(tier);
  const id = `cs-${useId().replace(/:/g, "")}`;
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  return (
    <>
      <DynamicStyle css={`#${id} { border-color: ${c.border}; background-color: ${c.bg}; } #${id} .tier-label { color: ${c.text}; }`} />
      <div id={id} className="rounded-2xl border-2 p-6 text-center">
        <span className="text-3xl block mb-2">{c.badge}</span>
        <p className="text-sm font-bold mb-1 tier-label">{tierLabel} Achievements</p>
        <p className="text-xs text-brown-muted">Coming soon — keep collecting bronze to prepare!</p>
      </div>
    </>
  );
}

// ── Main TrophyCase component ──────────────────────────────────────────────────

type TierFilter = "bronze" | "silver" | "gold" | "platinum";

export default function TrophyCase() {
  const { data: session } = useSession();
  const [data, setData] = useState<GetAchievementsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<TierFilter>("bronze");
  const [retroactiveBannerDismissed, setRetroactiveBannerDismissed] = useState(true);
  const [newAchievementIds, setNewAchievementIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const dismissed = localStorage.getItem("trophy-case-retroactive-banner-dismissed") === "true";
    setRetroactiveBannerDismissed(dismissed);
  }, []);

  useEffect(() => {
    if (!session?.user?.emailVerified) return;
    setLoading(true);
    fetch("/api/achievements")
      .then((r) => r.json())
      .then((d: GetAchievementsResponse) => {
        setData(d);
        setLoading(false);

        // Compute "New" ribbons
        const unlockedIds = d.achievements.filter((a) => a.unlocked).map((a) => a.id);
        const prevSeen = new Set<string>(
          JSON.parse(localStorage.getItem("pomo-seen-achievement-ids") ?? "[]")
        );
        const newIds = new Set(unlockedIds.filter((id) => !prevSeen.has(id)));
        setNewAchievementIds(newIds);
        // Mark all currently-unlocked as seen
        localStorage.setItem("pomo-seen-achievement-ids", JSON.stringify(unlockedIds));
      })
      .catch(() => {
        setError("Failed to load achievements");
        setLoading(false);
      });
  }, [session?.user?.emailVerified]);

  if (!session?.user) {
    return (
      <div className="text-center py-16 text-[#8B7355]">
        <span className="text-4xl mb-4 block">🏆</span>
        <p className="text-lg font-semibold text-[#3D2C2C] mb-2">Sign in to view your Trophy Case</p>
        <p className="text-sm">Achievements are saved with your account.</p>
      </div>
    );
  }

  if (!session.user.emailVerified) {
    return (
      <div className="text-center py-16">
        <span className="text-4xl mb-4 block">📧</span>
        <p className="text-lg font-semibold text-[#3D2C2C] mb-2">Verify your email to unlock achievements</p>
        <p className="text-sm text-[#8B7355]">Please check your inbox and verify your email address.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-48 bg-[#F0E6D3] rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return <div className="text-center py-8 text-[#E54B4B]">{error ?? "Something went wrong"}</div>;
  }

  const hasRetroactive = data.achievements.some((a) => a.retroactivelyAwarded);
  const showRetroactiveBanner = hasRetroactive && !retroactiveBannerDismissed;
  const retroactiveCount = data.achievements.filter((a) => a.retroactivelyAwarded).length;

  const tiers: { value: TierFilter; label: string }[] = [
    { value: "bronze", label: "🥉 Bronze" },
    { value: "silver", label: "🥈 Silver" },
    { value: "gold", label: "🥇 Gold" },
    { value: "platinum", label: "💎 Platinum" },
  ];

  // Only show cards for bronze tier; others show "coming soon"
  const isBronze = tierFilter === "bronze";

  let filtered = isBronze
    ? data.achievements.filter((a) => a.tier === "bronze")
    : [];

  if (isBronze) {
    // Sort: unlocked first (by unlockedAt desc), then locked
    filtered = [...filtered].sort((a, b) => {
      if (a.unlocked && !b.unlocked) return -1;
      if (!a.unlocked && b.unlocked) return 1;
      if (a.unlocked && b.unlocked) {
        return new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime();
      }
      return 0;
    });
  }

  const bronzeTotal = data.achievements.filter((a) => a.tier === "bronze").length;

  return (
    <div>
      {/* Summary */}
      <SummaryHeader summary={data.summary} />

      {/* Retroactive banner */}
      {showRetroactiveBanner && (
        <div
          className="rounded-2xl border-2 border-[#F0E6D3] px-5 py-4 mb-5 flex items-start justify-between gap-3 bg-cream-warm-2"
        >
          <div>
            <p className="font-bold text-[#3D2C2C] text-sm mb-1">✨ We looked back at your history</p>
            <p className="text-xs text-[#8B7355] leading-relaxed">
              Based on your previous sessions and friendships, we awarded you {retroactiveCount} achievement{retroactiveCount !== 1 ? "s" : ""}. These are marked with a ★ badge.
            </p>
          </div>
          <button
            onClick={() => {
              setRetroactiveBannerDismissed(true);
              localStorage.setItem("trophy-case-retroactive-banner-dismissed", "true");
            }}
            className="flex-shrink-0 text-sm font-semibold text-[#E54B4B] hover:underline whitespace-nowrap"
          >
            Got it
          </button>
        </div>
      )}

      {/* Tier filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex flex-wrap gap-1">
          {tiers.map((t) => (
            <button
              key={t.value}
              onClick={() => setTierFilter(t.value)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                tierFilter === t.value
                  ? "bg-[#E54B4B] text-white"
                  : "bg-white border border-[#F0E6D3] text-[#8B7355] hover:text-[#E54B4B]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isBronze ? (
        <>
          {/* Count */}
          <p className="text-xs text-[#A08060] mb-4">
            Showing {filtered.length} of {bronzeTotal} bronze achievements
          </p>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-[#A08060]">
              No achievements match this filter.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((achievement) => (
                <AchievementCard key={achievement.id} achievement={achievement} isNew={newAchievementIds.has(achievement.id)} />
              ))}
            </div>
          )}
        </>
      ) : (
        <ComingSoonSection tier={tierFilter} />
      )}
    </div>
  );
}
