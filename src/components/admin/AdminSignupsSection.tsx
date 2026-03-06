"use client";

import { useEffect, useState, useCallback } from "react";
import AdminStatCard from "./AdminStatCard";
import AdminSectionHeader from "./AdminSectionHeader";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format, parseISO, formatDistanceToNow } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecentSignup {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
}

interface SignupsData {
  totals: {
    totalUsers: number;
    verifiedUsers: number;
    unverifiedUsers: number;
    verificationRate: number;
  };
  dailySignups: { date: string; newUsers: number }[];
  recentSignups: RecentSignup[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function SignupTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border-2 border-[#F0E6D3] rounded-xl p-3 shadow-lg text-xs">
      <p className="font-bold text-[#5C4033] mb-1">{label}</p>
      <p className="text-[#8B7355]">
        <span className="font-bold text-[#E54B4B]">{payload[0]?.value}</span> new users
      </p>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

interface Props {
  refreshKey: number;
}

export default function AdminSignupsSection({ refreshKey }: Props) {
  const [data, setData] = useState<SignupsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (bust = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = bust ? `/api/admin/signups?t=${Date.now()}` : "/api/admin/signups";
      const res = await fetch(url, { cache: bust ? "no-store" : "default" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: SignupsData = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sign-up data");
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
        <AdminSectionHeader title="Sign-ups" subtitle="User registration trends" />
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

  const chartData = (data?.dailySignups ?? []).map((d) => ({
    ...d,
    label: format(parseISO(d.date), "MMM d"),
  }));

  // Compute peak sign-up day for the subtitle
  const peakDay = data?.dailySignups.reduce(
    (best, d) => (d.newUsers > best.newUsers ? d : best),
    { date: "", newUsers: 0 }
  );

  return (
    <section className="space-y-5">
      <AdminSectionHeader
        title="Sign-ups"
        subtitle="User registration trends — last 90 days"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminStatCard
          loading={loading}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E54B4B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          }
          label="Total Registered Users"
          value={data?.totals.totalUsers.toLocaleString() ?? "—"}
        />
        <AdminStatCard
          loading={loading}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6EAE3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
          label="Verified Emails"
          value={data?.totals.verifiedUsers.toLocaleString() ?? "—"}
          accentColor="#6EAE3E"
        />
        <AdminStatCard
          loading={loading}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E54B4B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          }
          label="Unverified Emails"
          value={data?.totals.unverifiedUsers.toLocaleString() ?? "—"}
          accentColor="#E5A03E"
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
          label="Verification Rate"
          value={`${data?.totals.verificationRate ?? 0}%`}
          accentColor="#6EAE3E"
        />
      </div>

      {/* 90-day sign-up chart */}
      <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm text-[#8B7355] font-semibold">
            Daily New Sign-ups — Last 90 Days
          </h3>
          {peakDay && peakDay.newUsers > 0 && !loading && (
            <span className="text-[10px] text-[#A08060]">
              Peak: <span className="font-bold text-[#E54B4B]">{peakDay.newUsers}</span> on{" "}
              {format(parseISO(peakDay.date), "MMM d")}
            </span>
          )}
        </div>
        {loading ? (
          <div className="h-[220px] flex items-center justify-center">
            <div className="text-[#A08060] text-sm font-semibold animate-pulse">Loading chart...</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradSignups" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E54B4B" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#E54B4B" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0E6D3" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#A08060"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#A08060"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={<SignupTooltip />}
                cursor={{ stroke: "#E54B4B", strokeWidth: 1, strokeDasharray: "4 4" }}
              />
              <Area
                type="monotone"
                dataKey="newUsers"
                name="New Users"
                stroke="#E54B4B"
                strokeWidth={2}
                fill="url(#gradSignups)"
                dot={false}
                activeDot={{ r: 4, fill: "#E54B4B", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      {/* Recent sign-ups feed */}
      <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F0E6D3]">
          <h3 className="text-sm text-[#8B7355] font-semibold">Newest Sign-ups</h3>
        </div>
        {loading ? (
          <ul className="divide-y divide-[#F0E6D3]">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-full bg-[#F0E6D3] animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 bg-[#F0E6D3] rounded animate-pulse" />
                  <div className="h-2.5 w-48 bg-[#F0E6D3] rounded animate-pulse" />
                </div>
                <div className="h-2.5 w-16 bg-[#F0E6D3] rounded animate-pulse" />
              </li>
            ))}
          </ul>
        ) : (data?.recentSignups ?? []).length === 0 ? (
          <p className="text-center text-[#A08060] text-sm py-8">No sign-ups yet.</p>
        ) : (
          <ul className="divide-y divide-[#F0E6D3]">
            {(data?.recentSignups ?? []).map((user) => {
              const initials = user.name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
              return (
                <li key={user.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#FDF6EC] transition-colors">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-[#E54B4B]/10 text-[#E54B4B] text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {initials}
                  </div>
                  {/* Name + email */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#3D2C2C] truncate">{user.name}</p>
                    <p className="text-xs text-[#A08060] truncate">{user.email}</p>
                  </div>
                  {/* Verified badge */}
                  {user.emailVerified ? (
                    <span className="text-[10px] font-bold text-[#6EAE3E] bg-[#6EAE3E]/10 px-2 py-0.5 rounded-full flex-shrink-0">
                      Verified
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-[#E5A03E] bg-[#E5A03E]/10 px-2 py-0.5 rounded-full flex-shrink-0">
                      Unverified
                    </span>
                  )}
                  {/* Time ago */}
                  <span className="text-[10px] text-[#A08060] flex-shrink-0 hidden sm:block">
                    {formatDistanceToNow(parseISO(user.createdAt), { addSuffix: true })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
