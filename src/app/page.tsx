"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import TomatoMascot from "@/components/TomatoMascot";
import AuthModal from "@/components/AuthModal";
import CompactTimer from "@/components/CompactTimer";

function HomeContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showAuth, setShowAuth] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const verified = searchParams.get("verified");
    const error = searchParams.get("error");

    if (verified === "true") {
      setToast({ type: "success", message: "Email verified! You're all set." });
      router.replace("/");
    } else if (error === "invalid-token") {
      setToast({ type: "error", message: "This verification link is invalid. Please request a new one." });
      router.replace("/");
    } else if (error === "token-expired") {
      setToast({ type: "error", message: "This verification link has expired. Please request a new one." });
      router.replace("/");
    }
  }, [searchParams, router]);

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col">
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg border-2 text-sm font-semibold flex items-center gap-2 transition-all ${
            toast.type === "success"
              ? "bg-white border-[#6EAE3E]/30 text-[#3D2C2C]"
              : "bg-white border-[#E54B4B]/30 text-[#3D2C2C]"
          }`}
        >
          <span>{toast.type === "success" ? "\uD83C\uDF45" : "\u26A0\uFE0F"}</span>
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-[#A08060] hover:text-[#E54B4B] transition-colors"
          >
            &#10005;
          </button>
        </div>
      )}

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

        {/* Compact Timer Widget */}
        <div className="w-full max-w-lg mb-8">
          <CompactTimer />
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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          <FeatureCard
            icon={
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="16" stroke="#E54B4B" strokeWidth="3" fill="#FFF0F0" />
                <path d="M20 12V20L26 24" stroke="#E54B4B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="20" cy="6" r="2" fill="#E54B4B" />
              </svg>
            }
            title="Focus Timer"
            description="Customizable Pomodoros with work & break durations."
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
            description="Create rooms, share links, and sync Pomodoros in real time."
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
            title="Analytics"
            description="Track your daily progress, completion rates, and focus habits."
            href="/analytics"
          />
          <FeatureCard
            icon={
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="6" y="6" width="28" height="28" rx="4" fill="#FFF0F0" stroke="#E54B4B" strokeWidth="2" />
                <rect x="10" y="11" width="12" height="2" rx="1" fill="#E54B4B" />
                <rect x="10" y="16" width="20" height="2" rx="1" fill="#F5A0A0" />
                <rect x="10" y="21" width="16" height="2" rx="1" fill="#F5A0A0" />
                <rect x="10" y="26" width="18" height="2" rx="1" fill="#F5A0A0" />
              </svg>
            }
            title="Library"
            description="Curated guides on productivity, focus, and mindfulness."
            href="/library"
          />
          <FeatureCard
            icon={
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="22" r="14" fill="#FFF0F0" stroke="#E54B4B" strokeWidth="2" />
                <path d="M20 12L22.5 17.5L28.5 18L24 22L25.5 28L20 25L14.5 28L16 22L11.5 18L17.5 17.5L20 12Z" fill="#E54B4B" />
              </svg>
            }
            title="Trophies"
            description="Unlock achievements as you build focus habits."
            href="/trophies"
          />
          <FeatureCard
            icon={
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-[#F5A0A0] bg-[#FFF0F0] flex items-center justify-center">
                <span className="text-[#E54B4B] text-xl font-bold leading-none">?</span>
              </div>
            }
            title="More Coming Soon"
            description="New features and improvements are on the way. Stay tuned!"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#F0E6D3] py-6 text-center">
        <p className="text-sm text-[#B8A080]">
          Made with care. Focus better, together.
        </p>
      </footer>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}

function FeatureCard({ icon, title, description, href }: { icon: React.ReactNode; title: string; description: string; href?: string }) {
  const content = (
    <>
      <div className="flex justify-center mb-4">{icon}</div>
      <h3 className="text-lg font-bold text-[#3D2C2C] mb-2">{title}</h3>
      <p className="text-sm text-[#8B7355] leading-relaxed">{description}</p>
    </>
  );

  const className = "bg-white border-2 border-[#F0E6D3] rounded-2xl p-6 text-center hover:border-[#E54B4B]/30 hover:shadow-lg hover:shadow-[#E54B4B]/5 hover:-translate-y-1 transition-all";

  if (href) {
    return <Link href={href} className={className}>{content}</Link>;
  }
  return <div className={className}>{content}</div>;
}
