"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import InitialsAvatar from "@/components/InitialsAvatar";

type Period = "daily" | "weekly" | "monthly" | "alltime";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatarUrl: string | null;
  totalMinutes: number;
  isCurrentUser: boolean;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  period: Period;
  currentUserRank: number | null;
}

const PERIODS: { key: Period; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "alltime", label: "All-time" },
];

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-2xl leading-none">🥇</span>;
  if (rank === 2) return <span className="text-2xl leading-none">🥈</span>;
  if (rank === 3) return <span className="text-2xl leading-none">🥉</span>;
  return (
    <span className="w-8 text-center text-sm font-semibold text-[#A08060]">
      {rank}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-xl bg-[#F0E6D3]/50"
        >
          <div className="w-8 h-6 bg-[#F0E6D3] rounded" />
          <div className="w-10 h-10 bg-[#F0E6D3] rounded-full" />
          <div className="flex-1 h-4 bg-[#F0E6D3] rounded" />
          <div className="w-14 h-4 bg-[#F0E6D3] rounded" />
        </div>
      ))}
    </div>
  );
}

export default function LeaderboardClient() {
  const [period, setPeriod] = useState<Period>("weekly");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/leaderboard?period=${period}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load leaderboard");
        return res.json() as Promise<LeaderboardResponse>;
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [period]);

  const hasFriends =
    data !== null && data.entries.some((e) => !e.isCurrentUser);
  const onlyMe =
    data !== null && data.entries.length === 1 && data.entries[0].isCurrentUser;
  const noFriends = data !== null && data.entries.length === 1 && onlyMe;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Header */}
      <h1 className="text-2xl font-bold text-[#3D2C2C] mb-6 flex items-center gap-2">
        <span>🏆</span> Leaderboard
      </h1>

      {/* Period tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {PERIODS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              period === key
                ? "bg-[#E54B4B] text-white"
                : "bg-[#F0E6D3] text-[#3D2C2C] hover:bg-[#E8D9C4]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && <LoadingSkeleton />}

      {!loading && error && (
        <p className="text-[#E54B4B] text-sm">{error}</p>
      )}

      {!loading && !error && data && (
        <>
          {/* No friends at all — only self in list with 0 friends */}
          {noFriends && (
            <div className="text-center py-10">
              <p className="text-[#3D2C2C] font-medium mb-1">
                Invite friends to compete together
              </p>
              <p className="text-[#A08060] text-sm mb-4">
                Add friends to see how you stack up.
              </p>
              <Link
                href="/friends"
                className="inline-block px-5 py-2 rounded-full bg-[#E54B4B] text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Add friends
              </Link>
            </div>
          )}

          {/* Has entries to show */}
          {data.entries.length > 0 && (
            <ul className="space-y-2">
              {data.entries.map((entry) => (
                <li
                  key={entry.userId}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl border transition-colors ${
                    entry.isCurrentUser
                      ? "bg-[#FFF5F5] border-[#E54B4B]/20"
                      : "bg-white border-[#F0E6D3]"
                  }`}
                >
                  {/* Rank */}
                  <div className="w-8 flex items-center justify-center flex-shrink-0">
                    <RankBadge rank={entry.rank} />
                  </div>

                  {/* Avatar */}
                  {entry.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={entry.avatarUrl}
                      alt={entry.name}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <InitialsAvatar name={entry.name} size={40} />
                  )}

                  {/* Name */}
                  <span className="flex-1 font-medium text-[#3D2C2C] truncate">
                    {entry.isCurrentUser ? "You" : entry.name}
                  </span>

                  {/* Focus time */}
                  <span className="text-sm text-[#A08060] font-medium flex-shrink-0">
                    {formatMinutes(entry.totalMinutes)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Prompt to add more friends when user has some but not many */}
          {hasFriends && (
            <p className="text-center text-xs text-[#A08060] mt-6">
              <Link href="/friends" className="underline hover:text-[#3D2C2C]">
                Add more friends
              </Link>{" "}
              to grow your leaderboard.
            </p>
          )}
        </>
      )}
    </div>
  );
}
