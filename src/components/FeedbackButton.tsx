"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

type FeedbackType = "feature" | "bug";
type ModalState = "idle" | "submitting" | "success" | "error";

export default function FeedbackButton() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("feature");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [state, setState] = useState<ModalState>("idle");
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-close after success
  useEffect(() => {
    if (state === "success") {
      successTimer.current = setTimeout(() => {
        handleClose();
      }, 3000);
    }
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, [state]);

  const handleClose = () => {
    setOpen(false);
    // Reset form after modal closes
    setTimeout(() => {
      setType("feature");
      setTitle("");
      setDescription("");
      setState("idle");
    }, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("submitting");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: title.trim(),
          description: description.trim(),
          userEmail: session?.user?.email ?? undefined,
          userName: session?.user?.name ?? undefined,
        }),
      });

      if (!res.ok) {
        setState("error");
        return;
      }

      setState("success");
    } catch {
      setState("error");
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-1.5 px-3 py-2 bg-white border-2 border-[#F0E6D3] text-[#5C4033] rounded-full text-sm font-semibold shadow-md hover:border-[#E54B4B] transition-colors"
        aria-label="Open feedback form"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 16c0 1.1-.9 2-2 2H7l-4 4V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
        </svg>
        Feedback
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 bg-[#3D2C2C]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          <div
            className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-5 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {state === "success" ? (
              <div className="flex flex-col items-center justify-center py-6 gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-[#6EAE3E]/15 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-[#6EAE3E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-[#3D2C2C] font-semibold text-sm">Thanks! Your feedback has been submitted.</p>
                <p className="text-[#A08060] text-xs">This window will close automatically.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2 className="text-lg font-bold text-[#3D2C2C] mb-4">Share Feedback</h2>

                {/* Type selector */}
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setType("feature")}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                      type === "feature"
                        ? "bg-[#FDF6EC] border-[#E54B4B] text-[#3D2C2C]"
                        : "bg-white border-[#F0E6D3] text-[#A08060] hover:border-[#E54B4B]/50"
                    }`}
                  >
                    ✨ Feature Request
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("bug")}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                      type === "bug"
                        ? "bg-[#FDF6EC] border-[#E54B4B] text-[#3D2C2C]"
                        : "bg-white border-[#F0E6D3] text-[#A08060] hover:border-[#E54B4B]/50"
                    }`}
                  >
                    Bug Report
                  </button>
                </div>

                {/* Title */}
                <div className="mb-3">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Brief title..."
                    maxLength={100}
                    required
                    className="w-full bg-[#FDF6EC] border border-[#F0E6D3] rounded-lg px-3 py-2 text-sm text-[#3D2C2C] placeholder:text-[#A08060] focus:outline-none focus:border-[#E54B4B] transition-colors"
                  />
                </div>

                {/* Description */}
                <div className="mb-4">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe in detail..."
                    rows={4}
                    maxLength={1000}
                    required
                    className="w-full bg-[#FDF6EC] border border-[#F0E6D3] rounded-lg px-3 py-2 text-sm text-[#3D2C2C] placeholder:text-[#A08060] focus:outline-none focus:border-[#E54B4B] transition-colors resize-none"
                  />
                </div>

                {/* Error */}
                {state === "error" && (
                  <p className="text-[#E54B4B] text-xs font-semibold mb-3">Something went wrong. Please try again.</p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-3 py-2 bg-[#FDF6EC] border border-[#F0E6D3] text-[#5C4033] rounded-lg text-sm font-bold hover:bg-[#F5EDE0] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={state === "submitting"}
                    className="flex-1 px-3 py-2 bg-[#E54B4B] text-white rounded-lg text-sm font-bold hover:bg-[#D43D3D] transition-colors shadow-sm disabled:opacity-60"
                  >
                    {state === "submitting" ? "Sending…" : "Send Feedback"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
