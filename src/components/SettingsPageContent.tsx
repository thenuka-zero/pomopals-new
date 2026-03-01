"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export default function SettingsPageContent() {
  const { data: session } = useSession();
  const [broadcastEnabled, setBroadcastEnabled] = useState(true);
  const [intentionsEnabled, setIntentionsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setBroadcastEnabled(d.settings?.broadcastEnabled ?? true);
        setIntentionsEnabled(d.settings?.intentionsEnabled ?? true);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const saveSetting = async (field: string, val: boolean) => {
    setSaving(true);
    setSavedMessage("");
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: val }),
      });
      if (field === "broadcastEnabled" && !val) {
        await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: false }),
        });
      }
      setSavedMessage("Settings saved.");
      setTimeout(() => setSavedMessage(""), 2000);
    } catch {
      setSavedMessage("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBroadcast = async (val: boolean) => {
    setBroadcastEnabled(val);
    await saveSetting("broadcastEnabled", val);
  };

  const handleToggleIntentions = async (val: boolean) => {
    setIntentionsEnabled(val);
    await saveSetting("intentionsEnabled", val);
  };

  if (!session?.user) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center">
        <p className="text-[#8B7355]">Please sign in to manage settings.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-[#3D2C2C] mb-6">Settings</h1>

      {/* Privacy Section */}
      <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl shadow-md p-6">
        <h2 className="text-base font-bold text-[#3D2C2C] mb-4">Privacy</h2>

        {loading ? (
          <div className="h-12 bg-[#F0E6D3] rounded-xl animate-pulse" />
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-[#3D2C2C] font-medium">
                Share my Pomodoro sessions with friends
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Friends can see when you&apos;re focusing and request to join your rooms.
              </p>
            </div>
            <button
              onClick={() => handleToggleBroadcast(!broadcastEnabled)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
                broadcastEnabled ? "bg-[#6EAE3E]" : "bg-gray-300"
              }`}
              role="switch"
              aria-checked={broadcastEnabled}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                  broadcastEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        )}

        {savedMessage && (
          <p className="text-xs text-[#6EAE3E] font-semibold mt-3">{savedMessage}</p>
        )}
      </div>

      {/* Intentions Section */}
      <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl shadow-md p-6 mt-4">
        <h2 className="text-base font-bold text-[#3D2C2C] mb-4">Focus</h2>

        {loading ? (
          <div className="h-12 bg-[#F0E6D3] rounded-xl animate-pulse" />
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-[#3D2C2C] font-medium">
                Intentions before each Pomodoro
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Set a focus intention before starting and reflect when done.
              </p>
            </div>
            <button
              onClick={() => handleToggleIntentions(!intentionsEnabled)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
                intentionsEnabled ? "bg-[#6EAE3E]" : "bg-gray-300"
              }`}
              role="switch"
              aria-checked={intentionsEnabled}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                  intentionsEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
