"use client";

import { useEffect, useState, useCallback } from "react";
import AdminStatCard from "./AdminStatCard";
import AdminSectionHeader from "./AdminSectionHeader";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { format, parseISO } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GscData {
  totals: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  topQueries: {
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }[];
  topPages: {
    page: string;
    clicks: number;
    impressions: number;
  }[];
}

interface Ga4Data {
  totals: {
    sessions: number;
    users: number;
    newUsers: number;
    engagementRate: number;
  };
  byChannel: {
    channel: string;
    sessions: number;
    users: number;
  }[];
  topLandingPages: {
    page: string;
    sessions: number;
  }[];
  byDate: {
    date: string;
    sessions: number;
  }[];
}

interface TrafficData {
  gsc: GscData | null;
  ga4: Ga4Data | null;
  gscError: string | null;
  ga4Error: string | null;
  cachedAt: string;
  configured: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname || "/";
  } catch {
    return url;
  }
}

const CHANNEL_COLORS = [
  "#E54B4B",
  "#6EAE3E",
  "#E5A03E",
  "#8B7355",
  "#5B8CE5",
  "#A05BB5",
  "#5BADB5",
];

/* eslint-disable @typescript-eslint/no-explicit-any */
function TrafficTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border-2 border-[#F0E6D3] rounded-xl p-3 shadow-lg text-xs">
      <p className="font-bold text-[#5C4033] mb-1">{label}</p>
      <p className="text-[#8B7355]">
        <span className="font-bold text-[#E54B4B]">{payload[0]?.value?.toLocaleString()}</span> sessions
      </p>
    </div>
  );
}

function ChannelTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border-2 border-[#F0E6D3] rounded-xl p-3 shadow-lg text-xs">
      <p className="font-bold text-[#5C4033] mb-1">{d.channel}</p>
      <div className="flex justify-between gap-4">
        <span className="text-[#8B7355]">Sessions</span>
        <span className="font-bold text-[#3D2C2C]">{d.sessions.toLocaleString()}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-[#8B7355]">Users</span>
        <span className="font-bold text-[#3D2C2C]">{d.users.toLocaleString()}</span>
      </div>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  refreshKey: number;
}

export default function AdminTrafficSection({ refreshKey }: Props) {
  const [data, setData] = useState<TrafficData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (bust = false) => {
    setLoading(true);
    setError(null);
    try {
      const bustParam = bust ? `?bust=1&t=${Date.now()}` : "";
      const res = await fetch(`/api/admin/traffic${bustParam}`, {
        cache: bust ? "no-store" : "default",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: TrafficData = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load traffic data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);
  }, [refreshKey, fetchData]);

  if (error) {
    return (
      <section className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-5 shadow-sm">
        <AdminSectionHeader title="Traffic" subtitle="Google Search Console & GA4" />
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

  const notConfigured = data && !data.configured;

  return (
    <section className="space-y-5">
      <AdminSectionHeader
        title="Traffic"
        subtitle="Google Search Console & GA4 — last 28 days"
      />

      {notConfigured && (
        <div className="bg-[#FFF8F0] border-2 border-[#F0E6D3] rounded-2xl p-4 text-sm text-[#8B7355]">
          <p className="font-semibold text-[#5C4033] mb-1">Google API credentials not configured</p>
          <p>Add <code className="bg-[#F0E6D3] px-1 rounded text-xs">GOOGLE_SERVICE_ACCOUNT_EMAIL</code>, <code className="bg-[#F0E6D3] px-1 rounded text-xs">GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY</code>, <code className="bg-[#F0E6D3] px-1 rounded text-xs">GSC_SITE_URL</code>, and <code className="bg-[#F0E6D3] px-1 rounded text-xs">GA4_PROPERTY_ID</code> to your environment to enable this section.</p>
        </div>
      )}

      {/* GSC section */}
      <div>
        <h3 className="text-xs font-bold text-[#A08060] uppercase tracking-wider mb-3">
          Google Search Console
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminStatCard
            loading={loading}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E54B4B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
            }
            label="Clicks (28d)"
            value={data?.gsc ? data.gsc.totals.clicks.toLocaleString() : (loading ? "—" : "N/A")}
          />
          <AdminStatCard
            loading={loading}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E54B4B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            }
            label="Impressions (28d)"
            value={data?.gsc ? data.gsc.totals.impressions.toLocaleString() : (loading ? "—" : "N/A")}
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
            label="CTR"
            value={data?.gsc ? fmtPct(data.gsc.totals.ctr) : (loading ? "—" : "N/A")}
            accentColor="#6EAE3E"
          />
          <AdminStatCard
            loading={loading}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E5A03E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            }
            label="Avg Position"
            value={data?.gsc ? data.gsc.totals.position.toFixed(1) : (loading ? "—" : "N/A")}
            accentColor="#E5A03E"
          />
        </div>
      </div>

      {/* GA4 section */}
      <div>
        <h3 className="text-xs font-bold text-[#A08060] uppercase tracking-wider mb-3">
          Google Analytics 4
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminStatCard
            loading={loading}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E54B4B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            }
            label="Sessions (28d)"
            value={data?.ga4 ? data.ga4.totals.sessions.toLocaleString() : (loading ? "—" : "N/A")}
          />
          <AdminStatCard
            loading={loading}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E54B4B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            }
            label="Users (28d)"
            value={data?.ga4 ? data.ga4.totals.users.toLocaleString() : (loading ? "—" : "N/A")}
          />
          <AdminStatCard
            loading={loading}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6EAE3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
            }
            label="New Users (28d)"
            value={data?.ga4 ? data.ga4.totals.newUsers.toLocaleString() : (loading ? "—" : "N/A")}
            accentColor="#6EAE3E"
          />
          <AdminStatCard
            loading={loading}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6EAE3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            }
            label="Engagement Rate"
            value={data?.ga4 ? fmtPct(data.ga4.totals.engagementRate) : (loading ? "—" : "N/A")}
            accentColor="#6EAE3E"
          />
        </div>
      </div>

      {/* Two-column tables: GSC queries + GA4 pages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top queries */}
        <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm text-[#8B7355] font-semibold mb-4">Top 10 Search Queries (GSC)</h3>
          {loading ? (
            <TableSkeleton rows={5} />
          ) : !data?.gsc ? (
            <EmptyState message={data?.gscError ?? "No GSC data"} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#F0E6D3]">
                    <th className="text-left text-[#A08060] font-semibold pb-2 pr-3">Query</th>
                    <th className="text-right text-[#A08060] font-semibold pb-2 pr-2">Clicks</th>
                    <th className="text-right text-[#A08060] font-semibold pb-2 pr-2">Impr.</th>
                    <th className="text-right text-[#A08060] font-semibold pb-2">Pos.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.gsc.topQueries.map((q, i) => (
                    <tr key={i} className="border-b border-[#F0E6D3] last:border-0">
                      <td className="py-2 pr-3 text-[#3D2C2C] font-medium max-w-[160px] truncate">{q.query}</td>
                      <td className="py-2 pr-2 text-right font-bold text-[#E54B4B]">{q.clicks.toLocaleString()}</td>
                      <td className="py-2 pr-2 text-right text-[#8B7355]">{q.impressions.toLocaleString()}</td>
                      <td className="py-2 text-right text-[#8B7355]">{q.position.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top landing pages */}
        <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm text-[#8B7355] font-semibold mb-4">Top Landing Pages (GSC)</h3>
          {loading ? (
            <TableSkeleton rows={5} />
          ) : !data?.gsc ? (
            <EmptyState message={data?.gscError ?? "No GSC data"} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#F0E6D3]">
                    <th className="text-left text-[#A08060] font-semibold pb-2 pr-3">Page</th>
                    <th className="text-right text-[#A08060] font-semibold pb-2 pr-2">Clicks</th>
                    <th className="text-right text-[#A08060] font-semibold pb-2">Impr.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.gsc.topPages.map((p, i) => (
                    <tr key={i} className="border-b border-[#F0E6D3] last:border-0">
                      <td className="py-2 pr-3 text-[#3D2C2C] font-medium max-w-[180px] truncate" title={p.page}>{shortenUrl(p.page)}</td>
                      <td className="py-2 pr-2 text-right font-bold text-[#E54B4B]">{p.clicks.toLocaleString()}</td>
                      <td className="py-2 text-right text-[#8B7355]">{p.impressions.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Daily sessions chart (GA4) */}
      <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm text-[#8B7355] font-semibold">
            Daily Sessions — GA4 (Last 28 Days)
          </h3>
        </div>
        {loading ? (
          <div className="h-[220px] flex items-center justify-center">
            <div className="text-[#A08060] text-sm font-semibold animate-pulse">Loading chart...</div>
          </div>
        ) : !data?.ga4 ? (
          <EmptyState message={data?.ga4Error ?? "No GA4 data"} />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={(data.ga4.byDate ?? []).map((d) => ({
                ...d,
                label: format(parseISO(d.date), "MMM d"),
              }))}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gradGaSessions" x1="0" y1="0" x2="0" y2="1">
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
                content={<TrafficTooltip />}
                cursor={{ stroke: "#E54B4B", strokeWidth: 1, strokeDasharray: "4 4" }}
              />
              <Area
                type="monotone"
                dataKey="sessions"
                name="Sessions"
                stroke="#E54B4B"
                strokeWidth={2}
                fill="url(#gradGaSessions)"
                dot={false}
                activeDot={{ r: 4, fill: "#E54B4B", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Traffic by channel (GA4) */}
      <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm text-[#8B7355] font-semibold mb-4">
          Traffic by Channel — GA4
        </h3>
        {loading ? (
          <div className="h-[200px] flex items-center justify-center">
            <div className="text-[#A08060] text-sm font-semibold animate-pulse">Loading chart...</div>
          </div>
        ) : !data?.ga4 ? (
          <EmptyState message={data?.ga4Error ?? "No GA4 data"} />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.ga4.byChannel} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0E6D3" horizontal={false} />
              <XAxis type="number" stroke="#A08060" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="channel" stroke="#A08060" fontSize={10} tickLine={false} axisLine={false} width={90} />
              <Tooltip content={<ChannelTooltip />} cursor={{ fill: "#F0E6D3" }} />
              <Bar dataKey="sessions" name="Sessions" radius={[0, 3, 3, 0]}>
                {data.ga4.byChannel.map((_, i) => (
                  <Cell key={i} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top GA4 landing pages */}
      <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm text-[#8B7355] font-semibold mb-4">Top Landing Pages — GA4</h3>
        {loading ? (
          <TableSkeleton rows={5} />
        ) : !data?.ga4 ? (
          <EmptyState message={data?.ga4Error ?? "No GA4 data"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#F0E6D3]">
                  <th className="text-left text-[#A08060] font-semibold pb-2 pr-3">Page</th>
                  <th className="text-right text-[#A08060] font-semibold pb-2">Sessions</th>
                </tr>
              </thead>
              <tbody>
                {data.ga4.topLandingPages.map((p, i) => (
                  <tr key={i} className="border-b border-[#F0E6D3] last:border-0">
                    <td className="py-2 pr-3 text-[#3D2C2C] font-medium">{p.page}</td>
                    <td className="py-2 text-right font-bold text-[#E54B4B]">{p.sessions.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cache timestamp */}
      {data?.cachedAt && !loading && (
        <p className="text-[10px] text-[#A08060] text-right">
          Traffic data as of{" "}
          {format(parseISO(data.cachedAt), "MMM d, HH:mm")} UTC
        </p>
      )}
    </section>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-7 bg-[#F0E6D3] rounded animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-xs text-[#A08060]">{message}</p>
    </div>
  );
}
