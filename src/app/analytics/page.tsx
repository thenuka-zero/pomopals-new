"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { DailyAnalytics } from "@/lib/types";
import Dashboard from "@/components/Dashboard";

export default function AnalyticsPage() {
  const { data: session, status: authStatus } = useSession();
  const [todayData, setTodayData] = useState<DailyAnalytics | null>(null);
  const [allData, setAllData] = useState<DailyAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authStatus !== "authenticated") return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [todayRes, allRes] = await Promise.all([
          fetch(`/api/analytics?userId=${session.user?.id}&days=1`),
          fetch(`/api/analytics?userId=${session.user?.id}&days=365`),
        ]);
        const today: DailyAnalytics[] = await todayRes.json();
        const all: DailyAnalytics[] = await allRes.json();
        setTodayData(today[0] || null);
        setAllData(all);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [session, authStatus]);

  if (authStatus !== "authenticated" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-[#A08060] font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#3D2C2C]">Dashboard</h1>
        <p className="text-[#8B7355] text-sm mt-1">Your focus stats and Pomodoro history.</p>
      </div>

      <Dashboard todayData={todayData} allData={allData} />
    </div>
  );
}
