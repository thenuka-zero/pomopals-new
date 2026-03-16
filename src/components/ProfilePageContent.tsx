"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import InitialsAvatar from "./InitialsAvatar";
import type { ProfileData } from "@/lib/types";

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border-2 border-[#F0E6D3] rounded-2xl p-6 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-bold text-[#8B7355] uppercase tracking-wide mb-4">{children}</h2>;
}

function FieldInput({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#8B7355] mb-1">{label}</label>
      <input
        {...props}
        className="w-full px-4 py-2.5 bg-[#FDF6EC] border-2 border-[#F0E6D3] rounded-xl text-sm text-[#3D2C2C] placeholder-[#C4B098] focus:outline-none focus:border-[#E54B4B]/40 focus:ring-2 focus:ring-[#E54B4B]/10 transition-colors disabled:opacity-60"
      />
    </div>
  );
}

function SaveButton({ saving, disabled, children }: { saving: boolean; disabled?: boolean; children?: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={saving || disabled}
      className="px-5 py-2 bg-[#E54B4B] text-white text-sm font-semibold rounded-xl hover:bg-[#D43D3D] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {saving ? "Saving…" : (children ?? "Save")}
    </button>
  );
}

function InlineMsg({ msg, isError }: { msg: string; isError?: boolean }) {
  if (!msg) return null;
  return (
    <p className={`text-xs mt-2 ${isError ? "text-[#E54B4B]" : "text-[#6EAE3E] font-medium"}`}>{msg}</p>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? "bg-[#E54B4B]" : "bg-[#D0C0A0]"} disabled:opacity-50`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`}
      />
    </button>
  );
}

export default function ProfilePageContent() {
  const { update: updateSession } = useSession();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Global banner (email changed successfully)
  const emailChanged = searchParams.get("emailChanged") === "true";
  const emailChangeError = searchParams.get("emailChangeError");

  // Edit name
  const [nameDraft, setNameDraft] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState({ text: "", error: false });

  // Change email
  const [newEmailDraft, setNewEmailDraft] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg, setEmailMsg] = useState({ text: "", error: false });
  const [resendingEmail, setResendingEmail] = useState(false);
  const [cancellingEmail, setCancellingEmail] = useState(false);

  // Change password
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState({ text: "", error: false });

  // Privacy
  const [privacySaving, setPrivacySaving] = useState(false);

  // Avatar
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const prevAvatarRef = useRef<string | null>(null);

  // Danger zone
  const [dangerOpen, setDangerOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const flash = useCallback((
    setter: (v: { text: string; error: boolean }) => void,
    text: string,
    error = false
  ) => {
    setter({ text, error });
    setTimeout(() => setter({ text: "", error: false }), 4000);
  }, []);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) {
          setProfile(data.profile);
          setNameDraft(data.profile.name);
          prevAvatarRef.current = data.profile.avatarUrl;
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAvatarClick = () => {
    if (!avatarUploading) fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setAvatarError("Please upload a JPEG, PNG, or WebP image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl.length > 210_000) {
        setAvatarError("Image is too large. Please use an image under 150KB.");
        return;
      }

      setAvatarError("");
      setAvatarUploading(true);
      const prevAvatar = profile?.avatarUrl ?? null;
      setProfile((p) => p ? { ...p, avatarUrl: dataUrl } : p);

      try {
        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarUrl: dataUrl }),
        });
        if (!res.ok) throw new Error();
        prevAvatarRef.current = dataUrl;
      } catch {
        setAvatarError("Failed to save. Try a smaller image.");
        setProfile((p) => p ? { ...p, avatarUrl: prevAvatar } : p);
      } finally {
        setAvatarUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = async () => {
    setAvatarError("");
    setAvatarUploading(true);
    setProfile((p) => p ? { ...p, avatarUrl: null } : p);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: null }),
      });
      prevAvatarRef.current = null;
    } catch {
      setAvatarError("Failed to remove avatar.");
      setProfile((p) => p ? { ...p, avatarUrl: prevAvatarRef.current ?? null } : p);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameDraft.trim() || nameDraft.trim() === profile?.name) return;
    setNameSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameDraft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setProfile((p) => p ? { ...p, name: nameDraft.trim() } : p);
      await updateSession();
      flash(setNameMsg, "Name updated!");
    } catch (err) {
      flash(setNameMsg, err instanceof Error ? err.message : "Failed to update name.", true);
    } finally {
      setNameSaving(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmailDraft.trim()) return;
    setEmailSaving(true);
    try {
      const res = await fetch("/api/profile/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: newEmailDraft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setProfile((p) => p ? { ...p, pendingEmail: newEmailDraft.trim().toLowerCase() } : p);
      setNewEmailDraft("");
      flash(setEmailMsg, data.message ?? "Verification email sent!");
    } catch (err) {
      flash(setEmailMsg, err instanceof Error ? err.message : "Failed to send email.", true);
    } finally {
      setEmailSaving(false);
    }
  };

  const handleResendEmailChange = async () => {
    if (!profile?.pendingEmail) return;
    setResendingEmail(true);
    try {
      const res = await fetch("/api/profile/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: profile.pendingEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      flash(setEmailMsg, "Verification email resent!");
    } catch (err) {
      flash(setEmailMsg, err instanceof Error ? err.message : "Failed to resend.", true);
    } finally {
      setResendingEmail(false);
    }
  };

  const handleCancelEmailChange = async () => {
    setCancellingEmail(true);
    try {
      await fetch("/api/profile/cancel-email-change", { method: "POST" });
      setProfile((p) => p ? { ...p, pendingEmail: null } : p);
    } finally {
      setCancellingEmail(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      flash(setPwMsg, "New passwords do not match.", true);
      return;
    }
    if (newPw.length < 8) {
      flash(setPwMsg, "New password must be at least 8 characters.", true);
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      flash(setPwMsg, "Password updated successfully!");
    } catch (err) {
      flash(setPwMsg, err instanceof Error ? err.message : "Failed to update password.", true);
    } finally {
      setPwSaving(false);
    }
  };

  const handleToggleFriendRequests = async (value: boolean) => {
    if (!profile) return;
    setPrivacySaving(true);
    setProfile((p) => p ? { ...p, allowFriendRequests: value } : p);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowFriendRequests: value }),
      });
    } catch {
      setProfile((p) => p ? { ...p, allowFriendRequests: !value } : p);
    } finally {
      setPrivacySaving(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      await signOut({ redirectTo: "/" });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete account.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-white border-2 border-[#F0E6D3] rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!profile) return null;

  const memberSince = new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[#3D2C2C]">Your Profile</h1>
        <p className="text-sm text-[#8B7355] mt-1">Manage your account information and preferences.</p>
      </div>

      {/* Global banners */}
      {emailChanged && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 font-medium">
          ✓ Your email address has been updated successfully.
        </div>
      )}
      {emailChangeError === "expired" && (
        <div className="bg-[#E54B4B]/10 border border-[#E54B4B]/30 rounded-xl px-4 py-3 text-sm text-[#E54B4B]">
          That verification link has expired. Please request a new one.
        </div>
      )}
      {emailChangeError === "taken" && (
        <div className="bg-[#E54B4B]/10 border border-[#E54B4B]/30 rounded-xl px-4 py-3 text-sm text-[#E54B4B]">
          That email address is already taken. Your email was not changed.
        </div>
      )}
      {emailChangeError === "invalid" && (
        <div className="bg-[#E54B4B]/10 border border-[#E54B4B]/30 rounded-xl px-4 py-3 text-sm text-[#E54B4B]">
          That verification link is invalid or has already been used.
        </div>
      )}

      {/* Profile header */}
      <SectionCard>
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <button
              onClick={handleAvatarClick}
              disabled={avatarUploading}
              className="relative group rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#E54B4B]/40"
              title="Change profile picture"
              aria-label="Change profile picture"
            >
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="w-20 h-20 rounded-full object-cover"
                  onError={() => setProfile((p) => p ? { ...p, avatarUrl: null } : p)}
                />
              ) : (
                <InitialsAvatar name={profile.name} size={80} />
              )}
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {avatarUploading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                )}
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-xl font-bold text-[#3D2C2C] truncate">{profile.name}</p>
            <p className="text-sm text-[#8B7355] truncate">{profile.email}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-[#A08060]">Member since {memberSince}</span>
              {profile.emailVerified ? (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Verified</span>
              ) : (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Unverified</span>
              )}
              {profile.isOAuthOnly && (
                <span className="text-xs bg-[#F0E6D3] text-[#8B7355] px-2 py-0.5 rounded-full font-semibold">Google</span>
              )}
            </div>
          </div>
        </div>
        {avatarError && <p className="text-xs text-[#E54B4B] mt-3">{avatarError}</p>}
        {profile.avatarUrl && !avatarUploading && (
          <button
            onClick={handleRemoveAvatar}
            className="mt-3 text-xs text-[#A08060] hover:text-[#E54B4B] transition-colors underline underline-offset-2"
          >
            Remove photo
          </button>
        )}
      </SectionCard>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pomodoros", value: profile.totalPomodoros },
          { label: "Friends", value: profile.totalFriends },
          { label: "Achievements", value: profile.achievementsUnlocked },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-4 text-center">
            <div className="text-2xl font-extrabold text-[#3D2C2C]">{value}</div>
            <div className="text-xs text-[#8B7355] mt-0.5 font-medium">{label}</div>
          </div>
        ))}
      </div>

      {/* Edit name */}
      <SectionCard>
        <SectionTitle>Display Name</SectionTitle>
        <form onSubmit={handleSaveName} className="space-y-3">
          <FieldInput
            label="Name"
            type="text"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value.slice(0, 100))}
            placeholder="Your name"
            maxLength={100}
          />
          <div className="flex items-center gap-3">
            <SaveButton saving={nameSaving} disabled={!nameDraft.trim() || nameDraft.trim() === profile.name}>
              Save Name
            </SaveButton>
            <InlineMsg msg={nameMsg.text} isError={nameMsg.error} />
          </div>
        </form>
      </SectionCard>

      {/* Change email */}
      <SectionCard>
        <SectionTitle>Email Address</SectionTitle>

        {/* Current email (read-only) */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-[#8B7355] mb-1">Current Email</label>
          <div className="px-4 py-2.5 bg-[#F0E6D3]/40 border-2 border-[#F0E6D3] rounded-xl text-sm text-[#3D2C2C] select-all">
            {profile.email}
          </div>
        </div>

        {/* Pending email change banner */}
        {profile.pendingEmail ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm text-amber-800 font-medium">
              Waiting for verification at <span className="font-bold">{profile.pendingEmail}</span>
            </p>
            <p className="text-xs text-amber-700 mt-0.5">Check your inbox and click the link to confirm.</p>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={handleResendEmailChange}
                disabled={resendingEmail}
                className="text-xs text-[#E54B4B] hover:underline font-semibold disabled:opacity-50"
              >
                {resendingEmail ? "Sending…" : "Resend email"}
              </button>
              <button
                onClick={handleCancelEmailChange}
                disabled={cancellingEmail}
                className="text-xs text-[#8B7355] hover:underline disabled:opacity-50"
              >
                {cancellingEmail ? "Cancelling…" : "Cancel change"}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleChangeEmail} className="space-y-3">
            <FieldInput
              label="New Email Address"
              type="email"
              value={newEmailDraft}
              onChange={(e) => setNewEmailDraft(e.target.value)}
              placeholder="new@example.com"
            />
            <p className="text-xs text-[#A08060]">A verification email will be sent. Your address won't change until you click the link.</p>
            <div className="flex items-center gap-3">
              <SaveButton saving={emailSaving} disabled={!newEmailDraft.trim()}>
                Send Verification Email
              </SaveButton>
            </div>
          </form>
        )}
        <InlineMsg msg={emailMsg.text} isError={emailMsg.error} />
      </SectionCard>

      {/* Change password — credentials users only */}
      <SectionCard>
        <SectionTitle>Password</SectionTitle>
        {profile.isOAuthOnly ? (
          <p className="text-sm text-[#8B7355]">Your account uses Google Sign-In. Password management is handled by Google.</p>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-3">
            <FieldInput
              label="Current Password"
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="Enter current password"
              autoComplete="current-password"
            />
            <FieldInput
              label="New Password"
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
            <FieldInput
              label="Confirm New Password"
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="Repeat new password"
              autoComplete="new-password"
            />
            <div className="flex items-center gap-3">
              <SaveButton saving={pwSaving} disabled={!currentPw || !newPw || !confirmPw}>
                Update Password
              </SaveButton>
              <InlineMsg msg={pwMsg.text} isError={pwMsg.error} />
            </div>
          </form>
        )}
      </SectionCard>

      {/* Privacy */}
      <SectionCard>
        <SectionTitle>Privacy</SectionTitle>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#3D2C2C]">Allow friend requests</p>
            <p className="text-xs text-[#A08060] mt-0.5">When off, no one can send you new friend requests.</p>
          </div>
          <Toggle
            checked={profile.allowFriendRequests}
            onChange={handleToggleFriendRequests}
            disabled={privacySaving}
          />
        </div>
      </SectionCard>

      {/* Account info */}
      <SectionCard>
        <SectionTitle>Account Info</SectionTitle>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#8B7355]">Account ID</span>
            <span className="text-[#3D2C2C] font-mono text-xs bg-[#F0E6D3] px-2 py-0.5 rounded select-all">{profile.id.slice(0, 16)}…</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8B7355]">Member since</span>
            <span className="text-[#3D2C2C]">{memberSince}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8B7355]">Email verified</span>
            <span className={profile.emailVerified ? "text-[#6EAE3E] font-semibold" : "text-amber-600 font-semibold"}>
              {profile.emailVerified ? "Yes" : "No"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8B7355]">Sign-in method</span>
            <span className="text-[#3D2C2C]">{profile.isOAuthOnly ? "Google" : "Email / Password"}</span>
          </div>
        </div>
      </SectionCard>

      {/* Danger zone */}
      <div className="border-2 border-[#E54B4B]/30 rounded-2xl overflow-hidden">
        <button
          onClick={() => setDangerOpen((o) => !o)}
          className="w-full flex items-center justify-between px-6 py-4 bg-white hover:bg-[#FFF5F5] transition-colors"
        >
          <span className="text-sm font-bold text-[#E54B4B]">Danger Zone</span>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E54B4B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform ${dangerOpen ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {dangerOpen && (
          <div className="px-6 pb-6 pt-4 bg-white border-t border-[#E54B4B]/20">
            <p className="text-sm text-[#3D2C2C] font-semibold mb-1">Delete Account</p>
            <p className="text-xs text-[#8B7355] mb-4">
              This will permanently delete all your data — sessions, achievements, friends, and intentions. This cannot be undone.
            </p>
            <form onSubmit={handleDeleteAccount} className="space-y-3">
              <FieldInput
                label={`Type "${profile.email}" to confirm`}
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={profile.email}
                autoComplete="off"
              />
              {deleteError && <p className="text-xs text-[#E54B4B]">{deleteError}</p>}
              <button
                type="submit"
                disabled={deleting || confirmEmail.toLowerCase().trim() !== profile.email.toLowerCase()}
                className="px-5 py-2 bg-[#E54B4B] text-white text-sm font-semibold rounded-xl hover:bg-[#D43D3D] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting…" : "Delete My Account"}
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="h-8" />
    </div>
  );
}
