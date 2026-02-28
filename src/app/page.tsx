"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";
import TomatoMascot from "@/components/TomatoMascot";
import AuthModal from "@/components/AuthModal";
import JoinRoomModal from "@/components/JoinRoomModal";

export default function LandingPage() {
  const { data: session } = useSession();
  const [showAuth, setShowAuth] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        {/* Floating mascot with bounce animation */}
        <div className="animate-bounce-slow mb-6">
          <TomatoMascot size={180} />
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold text-[#3D2C2C] tracking-tight mb-4">
          Pomo<span className="text-[#E54B4B]">Pals</span>
        </h1>

        <p className="text-lg sm:text-xl text-[#8B7355] max-w-md mb-8 leading-relaxed">
          Focus together, grow together. A cute Pomodoro timer to share with friends.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Link
            href="/timer"
            className="px-8 py-3.5 bg-[#E54B4B] text-white rounded-full text-lg font-bold shadow-lg shadow-[#E54B4B]/25 hover:bg-[#D43D3D] hover:shadow-xl hover:shadow-[#E54B4B]/30 hover:-translate-y-0.5 transition-all"
          >
            Start Focusing
          </Link>

          <button
            onClick={() => setShowJoinRoom(true)}
            className="px-8 py-3.5 bg-white border-2 border-[#F0E6D3] text-[#5C4033] rounded-full text-lg font-bold hover:border-[#E54B4B]/40 hover:bg-[#FFF8F0] hover:-translate-y-0.5 transition-all"
          >
            Join a Room
          </button>
        </div>

        {!session && (
          <button
            onClick={() => setShowAuth(true)}
            className="text-sm text-[#A08060] hover:text-[#E54B4B] transition-colors underline decoration-dotted underline-offset-4"
          >
            Sign in to track analytics & create rooms
          </button>
        )}
      </section>

      {/* Feature Cards */}
      <section className="px-4 pb-16 max-w-4xl mx-auto w-full">
        <div className="grid md:grid-cols-3 gap-5">
          <FeatureCard
            icon={
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="16" stroke="#E54B4B" strokeWidth="3" fill="#FFF0F0" />
                <path d="M20 12V20L26 24" stroke="#E54B4B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="20" cy="6" r="2" fill="#6EAE3E" />
              </svg>
            }
            title="Focus Timer"
            description="25-minute Pomodoros with customizable work & break durations. Stay in the zone!"
          />
          <FeatureCard
            icon={
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="4" y="16" width="6" height="18" rx="3" fill="#F5A0A0" />
                <rect x="13" y="10" width="6" height="24" rx="3" fill="#E54B4B" />
                <rect x="22" y="14" width="6" height="20" rx="3" fill="#F5A0A0" />
                <rect x="31" y="6" width="6" height="28" rx="3" fill="#E54B4B" />
              </svg>
            }
            title="Smart Analytics"
            description="Track full & partial Pomodoros. See your daily progress, completion rates, and focus streaks."
          />
          <FeatureCard
            icon={
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="14" cy="16" r="6" fill="#F5A0A0" />
                <circle cx="26" cy="16" r="6" fill="#E54B4B" />
                <path d="M8 30C8 26 11 24 14 24C16 24 17 24.5 20 26C23 24.5 24 24 26 24C29 24 32 26 32 30V32H8V30Z" fill="#E54B4B" opacity="0.8" />
              </svg>
            }
            title="Focus with Friends"
            description="Create a room, share the link, and sync your Pomodoros with friends in real time."
          />
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 pb-20 max-w-2xl mx-auto w-full">
        <h2 className="text-2xl font-bold text-[#3D2C2C] text-center mb-8">How It Works</h2>
        <div className="flex flex-col gap-4">
          <Step number="1" text="Start a 25-minute focus session (or customize the length)" />
          <Step number="2" text="Take a short 5-minute break when the timer rings" />
          <Step number="3" text="After 4 Pomodoros, enjoy a longer 15-minute break" />
          <Step number="4" text="Invite friends to join your room and focus together!" />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#F0E6D3] py-6 text-center">
        <p className="text-sm text-[#B8A080]">
          Made with care. Focus better, together.
        </p>
      </footer>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      <JoinRoomModal isOpen={showJoinRoom} onClose={() => setShowJoinRoom(false)} />
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-6 text-center hover:border-[#E54B4B]/30 hover:shadow-lg hover:shadow-[#E54B4B]/5 hover:-translate-y-1 transition-all">
      <div className="flex justify-center mb-4">{icon}</div>
      <h3 className="text-lg font-bold text-[#3D2C2C] mb-2">{title}</h3>
      <p className="text-sm text-[#8B7355] leading-relaxed">{description}</p>
    </div>
  );
}

function Step({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-center gap-4 bg-white border-2 border-[#F0E6D3] rounded-xl px-5 py-4">
      <div className="w-9 h-9 rounded-full bg-[#E54B4B] text-white font-bold flex items-center justify-center text-sm flex-shrink-0">
        {number}
      </div>
      <p className="text-[#5C4033] text-sm font-medium">{text}</p>
    </div>
  );
}
