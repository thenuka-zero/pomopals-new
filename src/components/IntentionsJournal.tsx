"use client";

import { useEffect, useState, useCallback } from "react";
import type { Intention, IntentionTrends } from "@/lib/types";
import IntentionTrendsChart from "./IntentionTrendsChart";

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

function groupByDate(items: Intention[]): Record<string, Intention[]> {
  const groups: Record<string, Intention[]> = {};
  for (const item of items) {
    if (!groups[item.date]) groups[item.date] = [];
    groups[item.date].push(item);
  }
  return groups;
}

function formatDate(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function IntentionsJournal() {
  const [intentions, setIntentions] = useState<Intention[]>([]);
  const [trends, setTrends] = useState<IntentionTrends | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchTrends = useCallback(async () => {
    try {
      const res = await fetch("/api/intentions/trends");
      if (res.ok) {
        const data = await res.json();
        setTrends(data);
      }
    } catch {
      // silently fail
    }
  }, []);

  const fetchIntentions = useCallback(
    async (p: number, filter: StatusFilter, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams({
          page: String(p),
          limit: "20",
        });
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
    fetchTrends();
    fetchIntentions(1, statusFilter);
  }, [fetchTrends, fetchIntentions, statusFilter]);

  const handleFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter);
    setIntentions([]);
    fetchIntentions(1, filter);
  };

  const handleLoadMore = () => {
    if (page < totalPages) {
      fetchIntentions(page + 1, statusFilter, true);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteIntention = async (id: string) => {
    const prev = intentions;
    setIntentions((current) => current.filter((i) => i.id !== id));
    setTotal((t) => t - 1);
    setConfirmDeleteId(null);
    try {
      const res = await fetch(`/api/intentions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setIntentions(prev);
      setTotal((t) => t + 1);
    }
  };

  const grouped = groupByDate(intentions);
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="min-h-screen bg-[#FDF6EC]">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#3D2C2C]">Intentions Journal</h1>
          <p className="text-sm text-[#3D2C2C]/60 mt-1">
            Track your focus intentions and reflect on your sessions.
          </p>
        </div>

        {/* Stats strip */}
        {trends && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total", value: trends.totalIntentions },
              { label: "Completed", value: trends.completedCount },
              {
                label: "Rate",
                value: `${trends.completionRate}%`,
              },
              {
                label: "Streak 🔥",
                value: trends.currentStreak,
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-white/60 rounded-xl p-3 border border-[#3D2C2C]/10 text-center"
              >
                <div className="text-xl font-bold text-[#3D2C2C]">{value}</div>
                <div className="text-xs text-[#3D2C2C]/50 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* 30-day chart */}
        {trends && trends.last30Days.some((d) => d.total > 0) && (
          <div className="bg-white/60 rounded-xl p-4 border border-[#3D2C2C]/10">
            <h2 className="text-sm font-semibold text-[#3D2C2C] mb-3">Last 30 Days</h2>
            <IntentionTrendsChart data={trends.last30Days} />
            <div className="flex items-center gap-4 mt-3 justify-end">
              <span className="flex items-center gap-1.5 text-xs text-[#3D2C2C]/50">
                <span className="w-3 h-3 rounded-sm bg-[#E54B4B] inline-block" />
                Completed
              </span>
              <span className="flex items-center gap-1.5 text-xs text-[#3D2C2C]/50">
                <span className="w-3 h-3 rounded-sm bg-[#F0E6D3] border border-[#3D2C2C]/20 inline-block" />
                Other
              </span>
            </div>
          </div>
        )}

        {/* Filter bar */}
        <div className="flex gap-2 flex-wrap">
          {(["all", "completed", "not_completed", "skipped"] as StatusFilter[]).map(
            (f) => (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === f
                    ? "bg-[#E54B4B] text-white"
                    : "bg-[#F0E6D3] text-[#3D2C2C] hover:bg-[#E54B4B]/10"
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
          <span className="ml-auto text-xs text-[#3D2C2C]/40 self-center">
            {total} total
          </span>
        </div>

        {/* Journal list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-xl bg-[#F0E6D3]/60 animate-pulse"
              />
            ))}
          </div>
        ) : intentions.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="text-4xl">🎯</div>
            <p className="text-[#3D2C2C] font-medium">No intentions yet</p>
            <p className="text-sm text-[#3D2C2C]/50">
              Set an intention before your next Pomodoro session to start your journal.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((date) => (
              <div key={date}>
                <h3 className="text-xs font-semibold text-[#3D2C2C]/50 uppercase tracking-wider mb-2">
                  {formatDate(date)}
                </h3>
                <div className="space-y-2">
                  {grouped[date].map((item) => {
                    const isExpanded = expandedIds.has(item.id);
                    const isLong = item.text.length > 100;
                    const displayText =
                      isLong && !isExpanded
                        ? item.text.slice(0, 100) + "…"
                        : item.text;

                    return (
                      <div
                        key={item.id}
                        className="group bg-white/60 rounded-xl px-4 py-3 border border-[#3D2C2C]/[0.08] hover:border-[#3D2C2C]/[0.15] transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-base mt-0.5 shrink-0">
                            {STATUS_ICONS[item.status]}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#3D2C2C] leading-relaxed">
                              {displayText}
                              {isLong && (
                                <button
                                  onClick={() => toggleExpand(item.id)}
                                  className="ml-1 text-[#E54B4B] hover:underline text-xs"
                                >
                                  {isExpanded ? "less" : "more"}
                                </button>
                              )}
                            </p>
                            {item.note && (
                              <p className="text-xs text-[#3D2C2C]/50 mt-1 italic">
                                {item.note}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-[#3D2C2C]/40">
                                {formatTime(item.startedAt)}
                              </span>
                              <span className="text-xs text-[#3D2C2C]/30">·</span>
                              <span className="text-xs text-[#3D2C2C]/40">
                                {STATUS_LABELS[item.status]}
                              </span>
                            </div>
                          </div>
                          {/* Delete button */}
                          <div className="shrink-0 flex items-center">
                            {confirmDeleteId === item.id ? (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-[#5C4033]">Delete?</span>
                                <button
                                  onClick={() => deleteIntention(item.id)}
                                  className="px-2 py-0.5 text-xs bg-[#E54B4B] text-white rounded-full font-semibold hover:bg-[#D43D3D] transition-colors"
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-0.5 text-xs bg-[#F0E6D3] text-[#5C4033] rounded-full font-semibold hover:bg-[#E8D5C4] transition-colors"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(item.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-[#A08060] hover:text-[#E54B4B]"
                                title="Delete intention"
                                aria-label="Delete intention"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                  <path d="M10 11v6M14 11v6" />
                                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Load more */}
            {page < totalPages && (
              <div className="text-center pt-2">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-2.5 rounded-full bg-[#F0E6D3] hover:bg-[#E54B4B]/10 text-[#3D2C2C] text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
