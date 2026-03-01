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
