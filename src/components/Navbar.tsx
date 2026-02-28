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
      <nav className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/" className="text-xl font-bold text-white tracking-tight">
            PomoPals
          </Link>

          <div className="flex items-center gap-1">
            <NavLink href="/" active={pathname === "/"}>Timer</NavLink>
            {session && <NavLink href="/analytics" active={pathname === "/analytics"}>Analytics</NavLink>}

            {session ? (
              <div className="flex items-center gap-3 ml-3">
                <span className="text-sm text-gray-400 hidden sm:inline">{session.user?.name}</span>
                <button
                  onClick={() => signOut()}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="ml-3 px-4 py-1.5 bg-white text-black rounded-full text-sm font-semibold hover:bg-gray-200 transition-colors"
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
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}
