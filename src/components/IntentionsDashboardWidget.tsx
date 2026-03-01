"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { Intention } from "@/lib/types";

type StatusFilter = "all" | "completed" | "not_completed" | "skipped";

const STATUS_ICONS: Record<string, string> = {
  completed: "✅",
  not_completed: "❌",
  skipped: "↩️",
  pending: "⏳",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  not_completed: "Not Completed",
  skipped: "Skipped",
  pending: "Pending",
};

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateHeader(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function groupByDate(items: Intention[]): Record<string, Intention[]> {
  const groups: Record<string, Intention[]> = {};
  for (const item of items) {
    if (!groups[item.date]) groups[item.date] = [];
    groups[item.date].push(item);
  }
  return groups;
}

export default function IntentionsDashboardWidget() {
  const { data: session } = useSession();
  const [intentions, setIntentions] = useState<Intention[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchIntentions = useCallback(
    async (p: number, filter: StatusFilter, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams({ page: String(p), limit: "20" });
        if (filter !== "all") params.set("status", filter);

        const res = await fetch(`/api/intentions?${params}`);
        if (!res.ok) return;
        const data = await res.json();

        setIntentions((prev) =>
          append ? [...prev, ...data.intentions] : data.intentions
        );
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setPage(p);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!session?.user?.emailVerified) return;
    fetchIntentions(1, statusFilter);
  }, [session?.user?.emailVerified, fetchIntentions, statusFilter]);

  if (!session?.user || !session.user.emailVerified) return null;

  const handleFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter);
    setIntentions([]);
  };

  const handleLoadMore = () => {
    if (page < totalPages) {
      fetchIntentions(page + 1, statusFilter, true);
    }
  };

  const grouped = groupByDate(intentions);
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm text-[#8B7355] font-semibold">
          Intentions Journal
        </h3>
        <span className="text-[10px] text-[#A08060]">{total} total</span>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {(["all", "completed", "not_completed", "skipped"] as StatusFilter[]).map(
          (f) => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                statusFilter === f
                  ? "bg-[#E54B4B] text-white"
                  : "bg-[#FDF6EC] border border-[#F0E6D3] text-[#8B7355] hover:text-[#E54B4B]"
              }`}
            >
              {f === "all"
                ? "All"
                : f === "not_completed"
                ? "Not Completed"
                : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          )
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-[#F0E6D3]/60 animate-pulse" />
          ))}
        </div>
      ) : intentions.length === 0 ? (
        <p className="text-[#A08060] text-sm py-4 text-center">
          {statusFilter === "all"
            ? "No intentions yet. Set one before your next Pomodoro!"
            : "No intentions match this filter."}
        </p>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
          {sortedDates.map((date) => (
            <div key={date}>
              <h4 className="text-[10px] font-bold text-[#A08060] uppercase tracking-wide mb-1.5">
                {formatDateHeader(date)}
              </h4>
              <div className="space-y-1.5">
                {grouped[date].map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2.5 px-3 bg-[#FDF6EC] border border-[#F0E6D3] rounded-xl hover:border-[#E0D0B8] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="text-sm shrink-0">
                        {STATUS_ICONS[item.status]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[#3D2C2C] truncate">
                          {item.text}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-[#A08060]">
                            {formatTime(item.startedAt)}
                          </span>
                          <span className="text-[10px] text-[#D0C0A0]">·</span>
                          <span className="text-[10px] text-[#A08060]">
                            {STATUS_LABELS[item.status]}
                          </span>
                        </div>
                      </div>
                    </div>
                    {item.note && (
                      <span className="text-[10px] text-[#A08060] italic ml-2 shrink-0 max-w-[120px] truncate" title={item.note}>
                        {item.note}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Load more */}
          {page < totalPages && (
            <div className="text-center pt-1">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-4 py-1.5 rounded-full bg-[#F0E6D3] hover:bg-[#E54B4B]/10 text-[#3D2C2C] text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
