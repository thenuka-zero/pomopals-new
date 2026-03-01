"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { FriendPresence } from "@/lib/types";

interface Props {
  onJoin: (roomId: string, roomName: string, hostName: string) => void;
}

export default function FriendsActivityWidget({ onJoin }: Props) {
  const { data: session } = useSession();
  const [activeFriends, setActiveFriends] = useState<FriendPresence[]>([]);
  const [hasFriends, setHasFriends] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchActive = async () => {
    try {
      const res = await fetch("/api/friends/active");
      if (!res.ok) return;
      const data = await res.json();
      const active: FriendPresence[] = data.activeFriends ?? [];
      setActiveFriends(active);

      // If no active friends, check if user has any friends at all
      if (active.length === 0 && hasFriends === null) {
        const friendsRes = await fetch("/api/friends");
        if (friendsRes.ok) {
          const friendsData = await friendsRes.json();
          setHasFriends((friendsData.friends ?? []).length > 0);
        } else {
          setHasFriends(false);
        }
      } else if (active.length > 0) {
        setHasFriends(true);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session?.user) return;

    fetchActive();
    intervalRef.current = setInterval(fetchActive, 15_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user]);

  if (!session?.user) return null;

  return (
    <div className="bg-white rounded-xl shadow-md p-5 border-2 border-[#F0E6D3]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#3D2C2C] uppercase tracking-wide">
          Friends Activity
        </h3>
        {!loading && (
          <button
            onClick={fetchActive}
            className="text-xs text-[#A08060] hover:text-[#E54B4B] transition-colors font-semibold"
            title="Refresh"
          >
            Refresh
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-[#F0E6D3]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-[#F0E6D3] rounded w-1/3" />
                <div className="h-2.5 bg-[#F0E6D3] rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : activeFriends.length > 0 ? (
        <div className="space-y-2">
          {activeFriends.map((friend) => {
            const initial = friend.name.charAt(0).toUpperCase();
            const location = friend.roomName ?? "Solo Pomodoro";

            return (
              <div key={friend.userId} className="flex items-center gap-3 py-1">
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-[#E54B4B] flex items-center justify-center text-white text-sm font-bold">
                    {initial}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#3D2C2C] truncate">{friend.name}</p>
                  <p className="text-xs text-[#A08060] truncate">{location}</p>
                </div>
                {friend.roomId && (
                  <button
                    onClick={() =>
                      onJoin(friend.roomId!, friend.roomName ?? "Room", friend.name)
                    }
                    className="flex-shrink-0 px-3 py-1 text-xs bg-[#E54B4B] text-white rounded-full font-semibold hover:bg-[#D43D3D] transition-colors"
                  >
                    Join
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : hasFriends === false ? (
        <div className="text-center py-3">
          <p className="text-sm text-[#A08060] mb-2">
            Add friends to see when they&apos;re focusing.
          </p>
          <Link
            href="/friends"
            className="text-sm text-[#E54B4B] font-semibold hover:underline"
          >
            Add Friends
          </Link>
        </div>
      ) : (
        <p className="text-sm text-[#A08060] text-center py-3">
          No friends currently in a Pomodoro session.
        </p>
      )}
    </div>
  );
}
