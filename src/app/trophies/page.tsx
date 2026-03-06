import TrophyCase from "@/components/TrophyCase";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trophy Case | PomoPals",
  description: "Your pomodoro achievements and milestones",
};

export default function TrophiesPage() {
  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-[#3D2C2C] flex items-center gap-3">
            🏆 <span>Trophy Case</span>
          </h1>
          <p className="text-[#8B7355] mt-1 text-sm">
            Your focus journey, celebrated.
          </p>
        </div>
        <TrophyCase />
      </div>
    </main>
  );
}
