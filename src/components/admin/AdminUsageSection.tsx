"use client";

import { useEffect, useState, useCallback } from "react";
import AdminStatCard from "./AdminStatCard";
import AdminSectionHeader from "./AdminSectionHeader";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { format, parseISO } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UsageData {
  pomodoros: {
    totalCompleted: number;
    totalCompletedLast30Days: number;
    totalStarted: number;
    globalCompletionRate: number;
    avgActualDurationSeconds: number;
  };
  activeUsers: {
    dau: number;
    wau: number;
    mau: number;
  };
  featureUsage: {
    distinctRoomsUsed: number;
    intentionsSet: number;
    intentionsReflected: number;
    achievementsUnlocked: number;
    usersWithFriends: number;
  };
  peakHours: { hour: number; count: number }[];
  dailyTrend: {
    date: string;
    sessionsStarted: number;
    sessionsCompleted: number;
    activeUsers: number;
  }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtSeconds(s: number): string {
  const m = Math.round(s / 60);
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${m}m`;
}

function formatHour(h: number): string {
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border-2 border-[#F0E6D3] rounded-xl p-3 shadow-lg text-xs min-w-[160px]">
      <p className="font-bold text-[#5C4033] mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span className="text-[#8B7355]">{p.name}</span>
          <span className="font-bold text-[#3D2C2C]">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function HourTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border-2 border-[#F0E6D3] rounded-xl p-3 shadow-lg text-xs">
      <p className="font-bold text-[#5C4033]">{formatHour(d.hour)}</p>
      <p className="text-[#8B7355]">{d.count} sessions</p>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  refreshKey: number;
}

export default function AdminUsageSection({ refreshKey }: Props) {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (bust = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = bust ? `/api/admin/usage?t=${Date.now()}` : "/api/admin/usage";
      const res = await fetch(url, { cache: bust ? "no-store" : "default" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: UsageData = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load usage data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(refreshKey > 0);
  }, [refreshKey, fetchData]);

  if (error) {
    return (
      <section className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-5 shadow-sm">
        <AdminSectionHeader title="Product Usage" subtitle="Sessions, users, and feature adoption" />
        <div className="flex flex-col items-center justify-center gap-3 py-8">
          <p className="text-[#E54B4B] text-sm font-semibold">{error}</p>
          <button
            onClick={() => fetchData(true)}
            className="px-4 py-2 bg-[#E54B4B] text-white rounded-full text-sm font-bold hover:bg-[#D43D3D] transition-colors"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  const trendChartData = (data?.dailyTrend ?? []).map((d) => ({
    ...d,
    label: format(parseISO(d.date), "MMM d"),
  }));

  const peakHoursData = (data?.peakHours ?? []).map((d) => ({
    ...d,
    label: formatHour(d.hour),
  }));

  const avgMinutes = data ? Math.round(data.pomodoros.avgActualDurationSeconds / 60) : 0;

  return (
    <section className="space-y-5">
      <AdminSectionHeader
        title="Product Usage"
        subtitle="Sessions, users, and feature adoption"
      />

      {/* Stat cards row 1 — Pomodoros */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminStatCard
          loading={loading}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E54B4B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
          label="Total Completed (All Time)"
          value={data?.pomodoros.totalCompleted.toLocaleString() ?? "—"}
          subtitle={`${data?.pomodoros.totalStarted.toLocaleString() ?? "—"} started`}
        />
        <AdminStatCard
          loading={loading}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E54B4B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
          label="Completed (Last 30 days)"
          value={data?.pomodoros.totalCompletedLast30Days.toLocaleString() ?? "—"}
        />
        <AdminStatCard
          loading={loading}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6EAE3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20V10" />
              <path d="M18 20V4" />
              <path d="M6 20v-4" />
            </svg>
          }
          label="Global Completion Rate"
          value={`${data?.pomodoros.globalCompletionRate ?? 0}%`}
          accentColor="#6EAE3E"
        />
        <AdminStatCard
          loading={loading}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E54B4B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
          label="Avg Session Length"
          value={loading ? "—" : fmtSeconds(data?.pomodoros.avgActualDurationSeconds ?? 0)}
          subtitle={`≈ ${avgMinutes} min`}
        />
      </div>

      {/* Stat cards row 2 — Active users */}
      <div className="grid grid-cols-3 gap-3">
        <AdminStatCard
          loading={loading}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E54B4B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          }
          label="DAU (today)"
          value={data?.activeUsers.dau.toLocaleString() ?? "—"}
        />
        <AdminStatCard
          loading={loading}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E54B4B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
          label="WAU (last 7 days)"
          value={data?.activeUsers.wau.toLocaleString() ?? "—"}
        />
        <AdminStatCard
          loading={loading}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E54B4B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
          label="MAU (last 30 days)"
          value={data?.activeUsers.mau.toLocaleString() ?? "—"}
          accentColor="#6EAE3E"
        />
      </div>

      {/* Feature adoption badges */}
      <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-4 shadow-sm">
        <h3 className="text-sm text-[#8B7355] font-semibold mb-3">Feature Adoption</h3>
        {loading ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 w-32 bg-[#F0E6D3] rounded-full animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <FeatureBadge label="Rooms used" value={data?.featureUsage.distinctRoomsUsed ?? 0} color="#E54B4B" />
            <FeatureBadge label="Intentions set" value={data?.featureUsage.intentionsSet ?? 0} color="#E54B4B" />
            <FeatureBadge label="Intentions reflected" value={data?.featureUsage.intentionsReflected ?? 0} color="#6EAE3E" />
            <FeatureBadge label="Achievements unlocked" value={data?.featureUsage.achievementsUnlocked ?? 0} color="#E5A03E" />
            <FeatureBadge label="Users with friends" value={data?.featureUsage.usersWithFriends ?? 0} color="#8B7355" />
          </div>
        )}
      </div>

      {/* 30-day session trend chart */}
      <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm text-[#8B7355] font-semibold mb-4">
          Daily Sessions — Last 30 Days
        </h3>
        {loading ? (
          <div className="h-[220px] flex items-center justify-center">
            <div className="text-[#A08060] text-sm font-semibold animate-pulse">Loading chart...</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E54B4B" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#E54B4B" stopOpacity={0.03} />
                </linearGradient>
                <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6EAE3E" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6EAE3E" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0E6D3" vertical={false} />
              <XAxis dataKey="label" stroke="#A08060" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis stroke="#A08060" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<TrendTooltip />} cursor={{ stroke: "#E54B4B", strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Area type="monotone" dataKey="sessionsCompleted" name="Completed" stroke="#E54B4B" strokeWidth={2} fill="url(#gradCompleted)" dot={false} />
              <Area type="monotone" dataKey="activeUsers" name="Active Users" stroke="#6EAE3E" strokeWidth={1.5} fill="url(#gradUsers)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Peak hours heatmap */}
      <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm text-[#8B7355] font-semibold mb-4">
          Peak Usage Hours (UTC) — Completed Work Sessions
        </h3>
        {loading ? (
          <div className="h-[180px] flex items-center justify-center">
            <div className="text-[#A08060] text-sm font-semibold animate-pulse">Loading chart...</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={peakHoursData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0E6D3" vertical={false} />
              <XAxis dataKey="label" stroke="#A08060" fontSize={9} tickLine={false} axisLine={false} interval={1} />
              <YAxis stroke="#A08060" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<HourTooltip />} cursor={{ fill: "#F0E6D3" }} />
              <Bar dataKey="count" name="Sessions" fill="#E54B4B" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function FeatureBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border"
      style={{
        backgroundColor: `${color}10`,
        borderColor: `${color}30`,
        color: "#3D2C2C",
      }}
    >
      <span className="font-extrabold" style={{ color }}>{value.toLocaleString()}</span>
      <span className="text-[#8B7355]">{label}</span>
    </div>
  );
}
