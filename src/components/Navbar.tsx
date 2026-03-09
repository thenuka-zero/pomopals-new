"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import AuthModal from "./AuthModal";
import { useFriendsStore } from "@/store/friends-store";

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [showAuth, setShowAuth] = useState(false);
  const [modalMode, setModalMode] = useState<"login" | "signup">("login");
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const { pendingRequestCount, fetchPendingCount } = useFriendsStore();
  const [hasPendingAchievements, setHasPendingAchievements] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30_000);
    return () => clearInterval(interval);
  }, [session?.user, fetchPendingCount]);

  useEffect(() => {
    if (!session?.user?.emailVerified) return;
    const checkAchievements = async () => {
      try {
        const res = await fetch("/api/achievements/pending");
        if (res.ok) {
          const data = await res.json();
          setHasPendingAchievements((data.pending?.length ?? 0) > 0);
        }
      } catch {
        // Silent
      }
    };
    checkAchievements();
    const interval = setInterval(checkAchievements, 30_000);
    return () => clearInterval(interval);
  }, [session?.user?.emailVerified]);

  const showVerificationBanner =
    session?.user && !session.user.emailVerified && !bannerDismissed;

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendMessage("");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setResendMessage(data.message || "Verification email sent!");
      } else {
        setResendMessage(data.error || "Could not resend. Try again later.");
      }
    } catch {
      setResendMessage("Could not resend. Try again later.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-[#F0E6D3] bg-cream">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            {/* Mini tomato icon */}
            <svg width="28" height="28" viewBox="0 0 200 200" fill="none">
              <ellipse cx="100" cy="115" rx="72" ry="68" fill="#E54B4B" />
              <ellipse cx="82" cy="52" rx="18" ry="8" fill="#6EAE3E" transform="rotate(-25 82 52)" />
              <ellipse cx="118" cy="52" rx="18" ry="8" fill="#6EAE3E" transform="rotate(25 118 52)" />
              <rect x="95" y="42" width="10" height="18" rx="5" fill="#5B8C3E" />
              <ellipse cx="80" cy="112" rx="6" ry="7" fill="#3D2417" />
              <ellipse cx="120" cy="112" rx="6" ry="7" fill="#3D2417" />
              <circle cx="83" cy="109" r="2.5" fill="white" />
              <circle cx="123" cy="109" r="2.5" fill="white" />
              <path d="M90 125 Q100 134 110 125" stroke="#3D2417" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <ellipse cx="68" cy="122" rx="8" ry="5" fill="#F5A0A0" opacity="0.6" />
              <ellipse cx="132" cy="122" rx="8" ry="5" fill="#F5A0A0" opacity="0.6" />
            </svg>
            <span className="text-xl font-extrabold text-[#3D2C2C] tracking-tight">
              Pomo<span className="text-[#E54B4B]">Pals</span>
            </span>
          </Link>

          <div className="flex items-center gap-1">
            {status === "loading" ? (
              <div className="ml-3 w-20 h-8 bg-[#F0E6D3] rounded-full animate-pulse" />
            ) : session ? (
              <>
                <NavLink href="/analytics" active={pathname === "/analytics"}>Dashboard</NavLink>
                <NavLink href="/library" active={pathname === "/library"}>Pom&apos;s Library</NavLink>
                <NavLink href="/guide" active={pathname === "/guide"}>Guide</NavLink>
                {(session.user as { isAdmin?: boolean })?.isAdmin && (
                  <NavLink href="/admin" active={pathname.startsWith("/admin")}>Admin</NavLink>
                )}
                <span className="relative">
                  <NavLink href="/trophies" active={pathname === "/trophies"} title="Trophies">🏆</NavLink>
                  {hasPendingAchievements && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#E54B4B] rounded-full" />
                  )}
                </span>
                <Link
                  href="/friends"
                  title="Friends"
                  className={`relative px-3 py-1.5 rounded-full text-sm font-bold transition-colors ${
                    pathname === "/friends"
                      ? "bg-[#E54B4B]/10 text-[#E54B4B]"
                      : "text-[#8B7355] hover:text-[#E54B4B]"
                  }`}
                >
                  👥
                  {pendingRequestCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#E54B4B] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                      {pendingRequestCount > 9 ? "9+" : pendingRequestCount}
                    </span>
                  )}
                </Link>
                <div className="flex items-center gap-3 ml-3">
                  <span className="text-sm text-[#8B7355] hidden sm:inline font-semibold">Hey {session.user?.name?.split(' ')[0]} 👋</span>
                  <button
                    onClick={() => signOut()}
                    className="text-sm text-[#A08060] hover:text-[#E54B4B] transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 ml-3">
                <NavLink href="/library" active={pathname === "/library"}>Pom&apos;s Library</NavLink>
                <NavLink href="/guide" active={pathname === "/guide"}>Guide</NavLink>
                <button
                  onClick={() => { setModalMode("login"); setShowAuth(true); }}
                  className="px-4 py-1.5 text-sm font-bold text-[#E54B4B] border-2 border-[#E54B4B] rounded-full hover:bg-[#E54B4B]/10 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setModalMode("signup"); setShowAuth(true); }}
                  className="px-4 py-1.5 bg-[#E54B4B] text-white rounded-full text-sm font-bold hover:bg-[#D43D3D] transition-colors shadow-sm"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Email verification banner */}
      {showVerificationBanner && (
        <div className="border-b border-[#F0E6D3] px-4 py-2.5 bg-cream-warm">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 text-[#5C4033]">
              <span>&#128231;</span>
              <span>
                Please verify your email to save your pomodoro stats.
                {resendMessage && (
                  <span className="ml-2 text-[#8B7355]">{resendMessage}</span>
                )}
              </span>
              <button
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="text-[#E54B4B] font-semibold hover:underline disabled:opacity-50 ml-1"
              >
                {resendLoading ? "Sending..." : "Resend email"}
              </button>
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-[#A08060] hover:text-[#E54B4B] transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              &#10005;
            </button>
          </div>
        </div>
      )}

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} initialMode={modalMode} />
    </>
  );
}

function NavLink({ href, active, children, title }: { href: string; active: boolean; children: React.ReactNode; title?: string }) {
  return (
    <Link
      href={href}
      title={title}
      className={`px-3 py-1.5 rounded-full text-sm font-bold transition-colors ${
        active
          ? "bg-[#E54B4B]/10 text-[#E54B4B]"
          : "text-[#8B7355] hover:text-[#E54B4B]"
      }`}
    >
      {children}
    </Link>
  );
}
