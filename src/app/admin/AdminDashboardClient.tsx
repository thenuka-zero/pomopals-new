"use client";

import { useState } from "react";
import AdminUsageSection from "@/components/admin/AdminUsageSection";
import AdminSignupsSection from "@/components/admin/AdminSignupsSection";
import AdminTrafficSection from "@/components/admin/AdminTrafficSection";

export default function AdminDashboardClient() {
  // refreshKey increments trigger re-fetch in all child sections
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    // Give sections a beat to start their fetches before hiding the spinner
    await new Promise((r) => setTimeout(r, 600));
    setRefreshing(false);
  };

  const now = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#3D2C2C]">Admin Dashboard</h1>
          <p className="text-[#8B7355] text-sm mt-1">
            PomoPals product health — usage, sign-ups, and traffic.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[#E54B4B] text-white rounded-full text-sm font-bold hover:bg-[#D43D3D] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {refreshing ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Refreshing…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                Refresh All
              </>
            )}
          </button>
          <span className="text-[10px] text-[#A08060]">As of {now}</span>
        </div>
      </div>

      {/* Sections — each fetches independently */}
      <div className="space-y-10">
        <AdminUsageSection refreshKey={refreshKey} />
        <div className="border-t border-[#F0E6D3]" />
        <AdminSignupsSection refreshKey={refreshKey} />
        <div className="border-t border-[#F0E6D3]" />
        <AdminTrafficSection refreshKey={refreshKey} />
      </div>
    </div>
  );
}
