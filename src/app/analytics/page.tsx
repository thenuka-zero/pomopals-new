"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DailyAnalytics } from "@/lib/types";
import AnalyticsChart from "@/components/AnalyticsChart";

export default function AnalyticsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<DailyAnalytics[]>([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (!session) {
      router.push("/");
      return;
    }

    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/analytics?userId=${session.user?.id}&days=${days}`);
        const data = await res.json();
        setAnalytics(data);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [session, authStatus, router, days]);

  if (authStatus === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-[#A08060] font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#3D2C2C]">Analytics</h1>
          <p className="text-[#8B7355] text-sm mt-1">Track your Pomodoro history and focus patterns.</p>
        </div>

        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-full text-sm font-bold transition-colors ${
                days === d
                  ? "bg-[#E54B4B]/10 text-[#E54B4B]"
                  : "text-[#8B7355] hover:text-[#E54B4B]"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <AnalyticsChart data={analytics} />
    </div>
  );
}
