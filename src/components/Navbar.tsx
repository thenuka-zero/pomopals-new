"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import AuthModal from "./AuthModal";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [showAuth, setShowAuth] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-[#F0E6D3]" style={{ backgroundColor: "#FDF6EC" }}>
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
            <NavLink href="/timer" active={pathname === "/timer"}>Timer</NavLink>
            {session && <NavLink href="/analytics" active={pathname === "/analytics"}>Analytics</NavLink>}

            {session ? (
              <div className="flex items-center gap-3 ml-3">
                <span className="text-sm text-[#8B7355] hidden sm:inline font-semibold">{session.user?.name}</span>
                <button
                  onClick={() => signOut()}
                  className="text-sm text-[#A08060] hover:text-[#E54B4B] transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="ml-3 px-4 py-1.5 bg-[#E54B4B] text-white rounded-full text-sm font-bold hover:bg-[#D43D3D] transition-colors shadow-sm"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
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
