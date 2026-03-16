"use client";

import { useState } from "react";
import type { TaskItem } from "@/lib/types";

interface IntentionReflectionModalProps {
  tasks: TaskItem[];
  sessionGroupId: string | null;
  sessionId: string | null;
  mode: "solo" | "room";
  onClose: () => void;
}

type TaskReflection = "done" | "skipped" | "pending";

export default function IntentionReflectionModal({
  tasks,
  sessionGroupId: _sessionGroupId,
  sessionId,
  onClose,
}: IntentionReflectionModalProps) {
  // Build initial reflections: tasks already done stay done, others default to pending
  const [reflections, setReflections] = useState<Record<string, TaskReflection>>(() => {
    const map: Record<string, TaskReflection> = {};
    for (const t of tasks) {
      map[t.id] = t.status === "done" ? "done" : "pending";
    }
    return map;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const reflectableTasks = tasks.filter((t) => t.status !== "skipped");

  const handleToggle = (taskId: string) => {
    setReflections((prev) => {
      const current = prev[taskId];
      return {
        ...prev,
        [taskId]: current === "done" ? "pending" : "done",
      };
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      // PATCH each task individually with its reflected status
      await Promise.all(
        reflectableTasks.map(async (task) => {
          const reflection = reflections[task.id] ?? "pending";
          // Map local status to DB status
          const dbStatus =
            reflection === "done" ? "completed" :
            reflection === "skipped" ? "skipped" : "not_completed";
          const res = await fetch(`/api/intentions/${task.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: dbStatus,
              sessionId,
              reflectedAt: now,
            }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            // 409 = already reflected, safe to ignore
            if (res.status !== 409) {
              throw new Error(data.error ?? "Failed to save reflection");
            }
          }
        })
      );
      setSubmitted(true);
      setTimeout(onClose, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
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
                How did you do on your tasks?
              </p>
            </div>

            {/* Task list */}
            {reflectableTasks.length > 0 ? (
              <div className="space-y-2">
                {reflectableTasks.map((task) => {
                  const isDone = reflections[task.id] === "done";
                  return (
                    <button
                      key={task.id}
                      onClick={() => handleToggle(task.id)}
                      disabled={submitting}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors disabled:opacity-50 ${
                        isDone
                          ? "bg-green-50 border-green-300 text-green-800"
                          : "bg-[#F0E6D3] border-[#3D2C2C]/15 text-[#3D2C2C] hover:border-[#3D2C2C]/30"
                      }`}
                    >
                      <span className="text-base shrink-0">
                        {isDone ? "✅" : "⬜"}
                      </span>
                      <span className={`text-sm flex-1 ${isDone ? "line-through opacity-70" : ""}`}>
                        {task.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[#3D2C2C]/50 py-2">All tasks were already reflected.</p>
            )}

            {/* Error */}
            {error && (
              <p className="text-sm text-[#E54B4B] bg-[#E54B4B]/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Submit */}
            {reflectableTasks.length > 0 && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-[#E54B4B] text-white font-semibold text-sm hover:bg-[#D43D3D] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? "Saving..." : "Save reflection"}
              </button>
            )}

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
