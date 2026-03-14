"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import TomatoMascot from "@/components/TomatoMascot";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
}

export default function AuthModal({ isOpen, onClose, initialMode = "login" }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(initialMode === "signup" ? false : true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      setIsLogin(initialMode !== "signup");
      setError("");
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        // Sign-in: use NextAuth directly
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError("Invalid email or password.");
        } else {
          onClose();
          window.location.reload();
        }
      } else {
        // Sign-up: call the register endpoint first
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await res.json();

        if (res.status === 201) {
          // Registration succeeded — show success state
          setRegisteredEmail(email);
          setRegistrationSuccess(true);

          // Auto-sign the user in
          await signIn("credentials", {
            email,
            password,
            redirect: false,
          });
        } else if (res.status === 409) {
          setError("An account with this email already exists.");
        } else if (res.status === 400) {
          setError(data.error || "Please check your input and try again.");
        } else {
          setError(data.error || "Something went wrong. Please try again.");
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendMessage("");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setResendMessage(data.message || "Verification email sent.");
      } else {
        setResendMessage(data.error || "Could not resend email. Please try again.");
      }
    } catch {
      setResendMessage("Could not resend email. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleClose = () => {
    setRegistrationSuccess(false);
    setRegisteredEmail("");
    setResendMessage("");
    onClose();
    if (registrationSuccess) {
      window.location.reload();
    }
  };

  // ── Post-registration success state ────────────────────────────────────
  if (registrationSuccess) {
    return (
      <div className="fixed inset-0 bg-[#3D2C2C]/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={handleClose}>
        <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-6 w-full max-w-md shadow-xl text-center" onClick={(e) => e.stopPropagation()}>
          <div className="mb-4 flex justify-center"><TomatoMascot size={80} /></div>
          <h2 className="text-xl font-bold text-[#3D2C2C] mb-2">
            You&apos;re almost there!
          </h2>
          <p className="text-[#5C4033] text-sm mb-1">
            We sent a verification link to
          </p>
          <p className="text-[#E54B4B] font-semibold text-sm mb-4">
            {registeredEmail}
          </p>
          <p className="text-[#8B7355] text-sm mb-6">
            Check your inbox (and spam folder) to verify your account.
          </p>

          <button
            onClick={handleClose}
            className="w-full py-3 bg-[#E54B4B] text-white rounded-xl font-bold hover:bg-[#D43D3D] transition-colors shadow-md shadow-[#E54B4B]/20 mb-3"
          >
            Continue to PomoPals
          </button>

          <div className="text-sm text-[#8B7355]">
            Didn&apos;t get it?{" "}
            <button
              onClick={handleResendVerification}
              disabled={resendLoading}
              className="text-[#E54B4B] font-bold hover:underline disabled:opacity-50"
            >
              {resendLoading ? "Sending..." : "Resend email"}
            </button>
          </div>
          {resendMessage && (
            <p className="text-xs text-[#8B7355] mt-2">{resendMessage}</p>
          )}
        </div>
      </div>
    );
  }

  // ── Login / Registration form ──────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-[#3D2C2C]/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-[#3D2C2C] mb-2">
          {isLogin ? "Welcome Back!" : "Join PomoPals"}
        </h2>
        <p className="text-[#8B7355] text-sm mb-6">
          {isLogin ? "Sign in to track your analytics and join rooms." : "Sign up to start tracking your Pomodoros."}
        </p>

        {/* Google OAuth */}
        <button
          type="button"
          onClick={() => { setGoogleLoading(true); signIn("google", { callbackUrl: "/" }); }}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 py-2.5 mb-4 border-2 border-[#F0E6D3] rounded-xl hover:border-[#E54B4B]/30 hover:bg-[#FFF8F5] transition-colors text-[#3D2C2C] font-semibold text-sm disabled:opacity-60"
        >
          {googleLoading ? (
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {googleLoading ? "Redirecting..." : "Continue with Google"}
        </button>

        {/* Divider */}
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#F0E6D3]" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs text-[#A08060]">or</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm text-[#5C4033] font-semibold mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#FDF6EC] border-2 border-[#F0E6D3] rounded-xl px-4 py-2.5 text-[#3D2C2C] focus:outline-none focus:border-[#E54B4B] transition-colors"
                placeholder="Your name"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-[#5C4033] font-semibold mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#FDF6EC] border-2 border-[#F0E6D3] rounded-xl px-4 py-2.5 text-[#3D2C2C] focus:outline-none focus:border-[#E54B4B] transition-colors"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-[#5C4033] font-semibold mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#FDF6EC] border-2 border-[#F0E6D3] rounded-xl px-4 py-2.5 text-[#3D2C2C] focus:outline-none focus:border-[#E54B4B] transition-colors"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          {error && <p className="text-[#E54B4B] text-sm font-semibold">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#E54B4B] text-white rounded-xl font-bold hover:bg-[#D43D3D] transition-colors disabled:opacity-50 shadow-md shadow-[#E54B4B]/20"
          >
            {loading ? "..." : isLogin ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <p className="text-center text-sm text-[#8B7355] mt-4">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => { setIsLogin(!isLogin); setError(""); }}
            className="text-[#E54B4B] font-bold hover:underline"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
