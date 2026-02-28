"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        name: isLogin ? undefined : name,
        action: isLogin ? "login" : "register",
        redirect: false,
      });

      if (result?.error) {
        setError(isLogin ? "Invalid email or password." : "Registration failed. Email may already be taken.");
      } else {
        onClose();
        window.location.reload();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
              minLength={4}
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
