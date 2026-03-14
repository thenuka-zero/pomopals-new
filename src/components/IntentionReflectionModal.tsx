"use client";

import { useState } from "react";
import { useTimerStore } from "@/store/timer-store";

interface IntentionReflectionModalProps {
  intentionId: string;
  intentionText: string;
  sessionId: string | null;
  onClose: () => void;
}

export default function IntentionReflectionModal({
  intentionId,
  intentionText,
  sessionId,
  onClose,
}: IntentionReflectionModalProps) {
  const setPendingReflection = useTimerStore((s) => s.setPendingReflection);
  const clearCurrentIntention = useTimerStore((s) => s.clearCurrentIntention);

  const [selectedStatus, setSelectedStatus] = useState<"completed" | "not_completed" | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selectedStatus) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/intentions/${intentionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selectedStatus,
          sessionId,
          note: note.trim() || undefined,
          reflectedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save reflection");
      }
      setSubmitted(true);
      setPendingReflection(false);
      clearCurrentIntention();
      setTimeout(onClose, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    setPendingReflection(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#3D2C2C]/40 backdrop-blur-sm"
        onClick={handleSkip}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-[#FDF6EC] border border-[#3D2C2C]/10 shadow-2xl p-6 flex flex-col gap-4">
        {submitted ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <span className="text-3xl">✨</span>
            <p className="text-[#3D2C2C] font-medium">Reflection saved!</p>
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-semibold text-[#3D2C2C]">
                Session complete! 🍅
              </h2>
              <p className="text-sm text-[#3D2C2C]/60 mt-0.5">
                How did your focus session go?
              </p>
            </div>

            {/* Intention text */}
            <div className="px-4 py-3 rounded-xl bg-[#F0E6D3] border border-[#3D2C2C]/10">
              <p className="text-xs text-[#3D2C2C]/50 mb-1 font-medium uppercase tracking-wide">
                Your intention
              </p>
              <p className="text-sm text-[#3D2C2C] leading-relaxed">
                {intentionText}
              </p>
            </div>

            {/* Status buttons — toggle selection */}
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedStatus("completed")}
                disabled={submitting}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  selectedStatus === "completed"
                    ? "bg-green-100 border-green-400 text-green-800 ring-2 ring-green-300"
                    : "bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                }`}
              >
                <span>✅</span>
                <span>Completed</span>
              </button>
              <button
                onClick={() => setSelectedStatus("not_completed")}
                disabled={submitting}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  selectedStatus === "not_completed"
                    ? "bg-[#E54B4B]/15 border-[#E54B4B]/40 text-[#C0392B] ring-2 ring-[#E54B4B]/20"
                    : "bg-[#F0E6D3] hover:bg-[#E54B4B]/10 border-[#3D2C2C]/15 text-[#3D2C2C]"
                }`}
              >
                <span>❌</span>
                <span>Not completed</span>
              </button>
            </div>

            {/* Optional note */}
            <div>
              <label className="text-xs text-[#3D2C2C]/50 font-medium uppercase tracking-wide block mb-1.5">
                Add a note (optional)
              </label>
              <div className="relative">
                <textarea
                  value={note}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) setNote(e.target.value);
                  }}
                  placeholder="What went well? What got in the way?"
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-lg text-sm bg-[#F0E6D3]/60 border border-[#3D2C2C]/20 text-[#3D2C2C] placeholder-[#3D2C2C]/40 focus:outline-none focus:ring-2 focus:ring-[#E54B4B]/30 resize-none"
                />
                {note.length > 400 && (
                  <span className="absolute bottom-2 right-3 text-xs text-[#3D2C2C]/40">
                    {500 - note.length}
                  </span>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-[#E54B4B] bg-[#E54B4B]/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!selectedStatus || submitting}
              className="w-full py-3 rounded-xl bg-[#E54B4B] text-white font-semibold text-sm hover:bg-[#D43D3D] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Saving..." : "Submit reflection"}
            </button>

            {/* Skip link */}
            <div className="text-center">
              <button
                onClick={handleSkip}
                className="text-sm text-[#3D2C2C]/40 hover:text-[#3D2C2C]/60 underline underline-offset-2 transition-colors"
              >
                Skip reflection
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
