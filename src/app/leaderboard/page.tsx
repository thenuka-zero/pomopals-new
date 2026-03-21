import { Suspense } from "react";
import LeaderboardClient from "@/components/LeaderboardClient";

export const metadata = { title: "Leaderboard | Pomopals" };

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<LeaderboardSkeleton />}>
      <LeaderboardClient />
    </Suspense>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="max-w-lg mx-auto px-4 py-8 animate-pulse">
      <div className="h-8 w-48 bg-[#F0E6D3] rounded mb-6" />
      <div className="flex gap-2 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-9 w-20 bg-[#F0E6D3] rounded-full" />
        ))}
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 bg-[#F0E6D3] rounded-full" />
          <div className="h-10 w-10 bg-[#F0E6D3] rounded-full" />
          <div className="flex-1 h-4 bg-[#F0E6D3] rounded" />
          <div className="h-4 w-16 bg-[#F0E6D3] rounded" />
        </div>
      ))}
    </div>
  );
}
