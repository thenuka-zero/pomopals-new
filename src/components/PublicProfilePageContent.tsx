"use client";

import { useRouter } from "next/navigation";
import InitialsAvatar from "./InitialsAvatar";
import Image from "next/image";

export interface PublicProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
  memberSince: string;
  totalPomodoros: number;
  totalFocusMinutes: number;
  achievementCount: number;
  recentActivity: { date: string; minutes: number }[];
}

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border-2 border-[#F0E6D3] rounded-2xl p-6 ${className}`}>
      {children}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-5 flex flex-col items-center gap-1 flex-1 min-w-0">
      <span className="text-2xl font-bold text-[#3D2C2C]">{value}</span>
      <span className="text-xs font-semibold text-[#A08060] uppercase tracking-wide text-center">{label}</span>
    </div>
  );
}

function heatmapColor(minutes: number): string {
  if (minutes === 0) return "#F0E6D3";
  // Scale from light to #E54B4B at 50+ minutes
  const intensity = Math.min(minutes / 50, 1);
  // Interpolate from #F0E6D3 → #E54B4B
  const r = Math.round(240 + (229 - 240) * intensity);
  const g = Math.round(230 + (75 - 230) * intensity);
  const b = Math.round(211 + (75 - 211) * intensity);
  return `rgb(${r},${g},${b})`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMemberSince(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long" });
}

export default function PublicProfilePageContent({ profile }: { profile: PublicProfile }) {
  const router = useRouter();
  const focusHours = (profile.totalFocusMinutes / 60).toFixed(1);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
      {/* Back link */}
      <button
        onClick={() => {
          if (window.history.length > 1) {
            router.back();
          } else {
            router.push("/");
          }
        }}
        className="text-sm font-semibold text-[#A08060] hover:text-[#3D2C2C] transition-colors flex items-center gap-1"
      >
        &larr; Back
      </button>

      {/* Header card */}
      <SectionCard className="flex items-center gap-5">
        {profile.avatarUrl ? (
          <Image
            src={profile.avatarUrl}
            alt={profile.name}
            width={72}
            height={72}
            className="rounded-full object-cover flex-shrink-0"
            unoptimized={profile.avatarUrl.startsWith("data:")}
          />
        ) : (
          <InitialsAvatar name={profile.name} size={72} />
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[#3D2C2C] truncate">{profile.name}</h1>
          <p className="text-sm text-[#A08060] mt-0.5">
            Member since {formatMemberSince(profile.memberSince)}
          </p>
        </div>
      </SectionCard>

      {/* Stats row */}
      <div className="flex gap-3">
        <StatCard label="Pomodoros" value={profile.totalPomodoros} />
        <StatCard label="Focus Hours" value={focusHours} />
        <StatCard label="Achievements" value={profile.achievementCount} />
      </div>

      {/* Activity heatmap */}
      <SectionCard>
        <h2 className="text-sm font-bold text-[#8B7355] uppercase tracking-wide mb-4">
          Last 14 Days
        </h2>
        <div className="flex gap-2 flex-wrap">
          {profile.recentActivity.map(({ date, minutes }) => (
            <div key={date} className="flex flex-col items-center gap-1">
              <div
                className="w-9 h-9 rounded-lg"
                style={{ backgroundColor: heatmapColor(minutes) }}
                title={`${formatDate(date)}: ${minutes} min`}
              />
              <span className="text-[10px] text-[#A08060]">
                {new Date(date).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1)}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-4">
          <span className="text-xs text-[#A08060]">Less</span>
          {[0, 10, 25, 40, 50].map((m) => (
            <div
              key={m}
              className="w-4 h-4 rounded"
              style={{ backgroundColor: heatmapColor(m) }}
            />
          ))}
          <span className="text-xs text-[#A08060]">More</span>
        </div>
      </SectionCard>
    </div>
  );
}
