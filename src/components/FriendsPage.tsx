"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import type { Friend, FriendRequest } from "@/lib/types";

type Tab = "friends" | "add" | "requests";

interface SearchResult {
  id: string;
  name: string;
  email?: string;
  isFriend: boolean;
  hasPendingRequest: boolean;
}

interface Toast {
  message: string;
  type: "success" | "error";
}

export default function FriendsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [inlineEmailInputFor, setInlineEmailInputFor] = useState<string | null>(null);
  const [inlineEmail, setInlineEmail] = useState("");
  const [confirmUnfriend, setConfirmUnfriend] = useState<string | null>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchFriends = useCallback(async () => {
    try {
      const res = await fetch("/api/friends");
      if (!res.ok) return;
      const data = await res.json();
      setFriends(data.friends ?? []);
    } catch {
      // ignore
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/friends/requests?direction=all&status=all");
      if (!res.ok) return;
      const data = await res.json();
      setIncoming(data.incoming ?? []);
      setOutgoing(data.outgoing ?? []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    if (activeTab === "friends") {
      fetchFriends();
    } else if (activeTab === "requests") {
      fetchRequests();
    }
  }, [activeTab, session?.user, fetchFriends, fetchRequests]);

  // Search with debounce
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (searchQuery.length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}&limit=10`);
        if (!res.ok) {
          setSearchResults([]);
          return;
        }
        const data = await res.json();
        setSearchResults(data.users ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  const sendRequest = async (recipientEmail: string, displayName: string) => {
    setLoadingAction(recipientEmail);
    try {
      const res = await fetch("/api/friends/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmail }),
      });
      if (res.ok) {
        showToast(`Friend request sent to ${displayName}!`, "success");
        setSearchResults((prev) =>
          prev.map((r) =>
            r.email === recipientEmail ? { ...r, hasPendingRequest: true } : r
          )
        );
        setInlineEmailInputFor(null);
        setInlineEmail("");
        fetchRequests();
      } else if (res.status === 409) {
        showToast("Already friends or request already pending", "error");
      } else if (res.status === 422) {
        showToast("Cannot send request to yourself", "error");
      } else if (res.status === 429) {
        showToast("Please wait 24 hours before re-sending", "error");
      } else if (res.status === 404) {
        showToast("No user found with that email", "error");
      } else {
        showToast("Failed to send request. Please try again.", "error");
      }
    } catch {
      showToast("Failed to send request. Please try again.", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const acceptRequest = async (requestId: string, requesterName: string) => {
    setLoadingAction(requestId);
    try {
      const res = await fetch(`/api/friends/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      if (res.ok) {
        showToast(`You and ${requesterName} are now friends!`, "success");
        fetchRequests();
        fetchFriends();
      } else {
        showToast("Failed to accept request.", "error");
      }
    } catch {
      showToast("Failed to accept request.", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const rejectRequest = async (requestId: string) => {
    setLoadingAction(requestId);
    try {
      const res = await fetch(`/api/friends/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      if (res.ok) {
        fetchRequests();
      } else {
        showToast("Failed to decline request.", "error");
      }
    } catch {
      showToast("Failed to decline request.", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const cancelRequest = async (requestId: string) => {
    setLoadingAction(requestId);
    try {
      const res = await fetch(`/api/friends/requests/${requestId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchRequests();
      } else {
        showToast("Failed to cancel request.", "error");
      }
    } catch {
      showToast("Failed to cancel request.", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const unfriend = async (userId: string, name: string) => {
    setConfirmUnfriend(null);
    setLoadingAction(userId);
    try {
      const res = await fetch(`/api/friends/${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast(`Removed ${name} from friends`, "success");
        fetchFriends();
      } else {
        showToast("Failed to remove friend.", "error");
      }
    } catch {
      showToast("Failed to remove friend.", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  if (!session?.user) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <p className="text-[#8B7355]">Please sign in to manage friends.</p>
      </div>
    );
  }

  const pendingIncomingCount = incoming.filter((r) => r.status === "pending").length;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-[#3D2C2C] mb-6">Friends</h1>

      {/* Tab bar */}
      <div className="flex gap-0 mb-6 border-b border-[#E8D5C4]">
        <TabButton active={activeTab === "friends"} onClick={() => setActiveTab("friends")}>
          My Friends ({friends.length} / 50)
        </TabButton>
        <TabButton active={activeTab === "add"} onClick={() => setActiveTab("add")}>
          Add Friend
        </TabButton>
        <TabButton active={activeTab === "requests"} onClick={() => setActiveTab("requests")}>
          <span className="flex items-center gap-1">
            Requests
            {pendingIncomingCount > 0 && (
              <span className="bg-[#E54B4B] text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                {pendingIncomingCount}
              </span>
            )}
          </span>
        </TabButton>
      </div>

      {/* Tab content */}
      {activeTab === "friends" && (
        <FriendsListTab
          friends={friends}
          loadingAction={loadingAction}
          confirmUnfriend={confirmUnfriend}
          onConfirmUnfriend={setConfirmUnfriend}
          onUnfriend={unfriend}
        />
      )}
      {activeTab === "add" && (
        <AddFriendTab
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchResults={searchResults}
          isSearching={isSearching}
          loadingAction={loadingAction}
          inlineEmailInputFor={inlineEmailInputFor}
          inlineEmail={inlineEmail}
          onInlineEmailInputFor={setInlineEmailInputFor}
          onInlineEmailChange={setInlineEmail}
          onSendRequest={sendRequest}
        />
      )}
      {activeTab === "requests" && (
        <RequestsTab
          incoming={incoming}
          outgoing={outgoing}
          loadingAction={loadingAction}
          onAccept={acceptRequest}
          onReject={rejectRequest}
          onCancel={cancelRequest}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-semibold z-50 transition-all ${
            toast.type === "success" ? "bg-[#6EAE3E]" : "bg-[#E54B4B]"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

// ─── Tab Button ───────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
        active
          ? "border-[#E54B4B] text-[#E54B4B]"
          : "border-transparent text-[#8B7355] hover:text-[#3D2C2C]"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Friends List Tab ─────────────────────────────────────────────────────────

function FriendsListTab({
  friends,
  loadingAction,
  confirmUnfriend,
  onConfirmUnfriend,
  onUnfriend,
}: {
  friends: Friend[];
  loadingAction: string | null;
  confirmUnfriend: string | null;
  onConfirmUnfriend: (id: string | null) => void;
  onUnfriend: (userId: string, name: string) => void;
}) {
  if (friends.length === 0) {
    return (
      <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-8 text-center">
        <p className="text-[#A08060] text-sm">No friends yet. Add some friends to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {friends.map((friend) => {
        const initial = friend.name.charAt(0).toUpperCase();
        const since = new Date(friend.friendsSince).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        const isConfirming = confirmUnfriend === friend.userId;
        const isLoading = loadingAction === friend.userId;

        return (
          <div
            key={friend.userId}
            className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-[#F0E6D3] rounded-xl"
          >
            <div className="w-10 h-10 rounded-full bg-[#E54B4B] flex items-center justify-center text-white font-bold flex-shrink-0">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#3D2C2C] truncate">{friend.name}</p>
              <p className="text-xs text-[#A08060]">Friends since {since}</p>
            </div>
            <div className="flex-shrink-0">
              {isConfirming ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#5C4033]">Remove?</span>
                  <button
                    onClick={() => onUnfriend(friend.userId, friend.name)}
                    disabled={isLoading}
                    className="px-3 py-1 text-xs bg-[#E54B4B] text-white rounded-full font-semibold hover:bg-[#D43D3D] transition-colors disabled:opacity-50"
                  >
                    {isLoading ? "..." : "Yes"}
                  </button>
                  <button
                    onClick={() => onConfirmUnfriend(null)}
                    className="px-3 py-1 text-xs bg-[#F0E6D3] text-[#5C4033] rounded-full font-semibold hover:bg-[#E8D5C4] transition-colors"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onConfirmUnfriend(friend.userId)}
                  className="px-3 py-1 text-xs text-[#A08060] border border-[#E8D5C4] rounded-full hover:text-[#E54B4B] hover:border-[#E54B4B]/40 transition-colors"
                >
                  Unfriend
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Add Friend Tab ───────────────────────────────────────────────────────────

function AddFriendTab({
  searchQuery,
  onSearchChange,
  searchResults,
  isSearching,
  loadingAction,
  inlineEmailInputFor,
  inlineEmail,
  onInlineEmailInputFor,
  onInlineEmailChange,
  onSendRequest,
}: {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchResults: SearchResult[];
  isSearching: boolean;
  loadingAction: string | null;
  inlineEmailInputFor: string | null;
  inlineEmail: string;
  onInlineEmailInputFor: (id: string | null) => void;
  onInlineEmailChange: (email: string) => void;
  onSendRequest: (email: string, name: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name or enter exact email..."
          className="w-full bg-white border-2 border-[#F0E6D3] rounded-xl px-4 py-3 text-[#3D2C2C] placeholder-[#B8A080] focus:outline-none focus:border-[#E54B4B] transition-colors"
        />
        <p className="text-xs text-[#A08060] mt-1.5">
          Type at least 3 characters to search. For exact email matches, you can send a request directly.
        </p>
      </div>

      {isSearching && (
        <div className="text-sm text-[#A08060] text-center py-4">Searching...</div>
      )}

      {!isSearching && searchQuery.length >= 3 && searchResults.length === 0 && (
        <div className="bg-white border-2 border-[#F0E6D3] rounded-xl p-6 text-center">
          <p className="text-[#A08060] text-sm">No users found. Try searching by their exact email address.</p>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="space-y-2">
          {searchResults.map((result) => {
            const initial = result.name.charAt(0).toUpperCase();
            const isShowingInline = inlineEmailInputFor === result.id;
            const isLoading = loadingAction === (result.email ?? result.id);

            return (
              <div
                key={result.id}
                className="bg-white border-2 border-[#F0E6D3] rounded-xl overflow-hidden"
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-full bg-[#E54B4B] flex items-center justify-center text-white font-bold flex-shrink-0">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#3D2C2C] truncate">{result.name}</p>
                    {result.email && (
                      <p className="text-xs text-[#A08060] truncate">{result.email}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {result.isFriend ? (
                      <span className="px-3 py-1 text-xs text-[#A08060] bg-[#F0E6D3] rounded-full font-semibold">
                        Friends
                      </span>
                    ) : result.hasPendingRequest ? (
                      <span className="px-3 py-1 text-xs text-[#A08060] bg-[#F0E6D3] rounded-full font-semibold">
                        Request Sent
                      </span>
                    ) : result.email ? (
                      <button
                        onClick={() => onSendRequest(result.email!, result.name)}
                        disabled={isLoading}
                        className="px-3 py-1 text-xs bg-[#E54B4B] text-white rounded-full font-semibold hover:bg-[#D43D3D] transition-colors disabled:opacity-50"
                      >
                        {isLoading ? "Sending..." : "Add Friend"}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (isShowingInline) {
                            onInlineEmailInputFor(null);
                            onInlineEmailChange("");
                          } else {
                            onInlineEmailInputFor(result.id);
                            onInlineEmailChange("");
                          }
                        }}
                        className="px-3 py-1 text-xs bg-[#E54B4B] text-white rounded-full font-semibold hover:bg-[#D43D3D] transition-colors"
                      >
                        {isShowingInline ? "Cancel" : "Add Friend"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline email input for name-search results without email */}
                {isShowingInline && (
                  <div className="px-4 pb-3 pt-0 border-t border-[#F0E6D3] bg-[#FDF6EC]">
                    <p className="text-xs text-[#5C4033] mb-2 pt-2">
                      Enter {result.name}&apos;s email address to send a request:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={inlineEmail}
                        onChange={(e) => onInlineEmailChange(e.target.value)}
                        placeholder="email@example.com"
                        className="flex-1 bg-white border-2 border-[#F0E6D3] rounded-lg px-3 py-1.5 text-sm text-[#3D2C2C] placeholder-[#B8A080] focus:outline-none focus:border-[#E54B4B] transition-colors"
                      />
                      <button
                        onClick={() => {
                          if (inlineEmail.trim()) {
                            onSendRequest(inlineEmail.trim(), result.name);
                          }
                        }}
                        disabled={!inlineEmail.trim() || isLoading}
                        className="px-3 py-1.5 text-xs bg-[#E54B4B] text-white rounded-lg font-semibold hover:bg-[#D43D3D] transition-colors disabled:opacity-50"
                      >
                        {isLoading ? "..." : "Send"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {searchQuery.length === 0 && (
        <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-6 text-center">
          <p className="text-[#A08060] text-sm">Search for people to add as friends.</p>
          <p className="text-xs text-[#B8A080] mt-1">
            Search by name or exact email address.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Requests Tab ─────────────────────────────────────────────────────────────

function RequestsTab({
  incoming,
  outgoing,
  loadingAction,
  onAccept,
  onReject,
  onCancel,
}: {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  loadingAction: string | null;
  onAccept: (id: string, name: string) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const pendingIncoming = incoming.filter((r) => r.status === "pending");
  const pendingOutgoing = outgoing.filter((r) => r.status === "pending");

  return (
    <div className="space-y-6">
      {/* Incoming */}
      <section>
        <h3 className="text-xs font-bold text-[#A08060] uppercase tracking-wide mb-3">
          Incoming Requests
        </h3>
        {pendingIncoming.length === 0 ? (
          <div className="bg-white border-2 border-[#F0E6D3] rounded-xl p-5 text-center">
            <p className="text-[#A08060] text-sm">No incoming requests.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingIncoming.map((r) => {
              const initial = r.requesterName.charAt(0).toUpperCase();
              const isLoading = loadingAction === r.id;

              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-[#F0E6D3] rounded-xl"
                >
                  <div className="w-10 h-10 rounded-full bg-[#E54B4B] flex items-center justify-center text-white font-bold flex-shrink-0">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#3D2C2C] truncate">{r.requesterName}</p>
                    <p className="text-xs text-[#A08060]">
                      {new Date(r.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => onReject(r.id)}
                      disabled={isLoading}
                      className="px-3 py-1.5 text-xs border-2 border-[#E8D5C4] text-[#5C4033] rounded-full font-semibold hover:border-[#E54B4B]/40 hover:text-[#E54B4B] transition-colors disabled:opacity-50"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => onAccept(r.id, r.requesterName)}
                      disabled={isLoading}
                      className="px-3 py-1.5 text-xs bg-[#6EAE3E] text-white rounded-full font-semibold hover:bg-[#5A9632] transition-colors disabled:opacity-50"
                    >
                      {isLoading ? "..." : "Accept"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Outgoing */}
      <section>
        <h3 className="text-xs font-bold text-[#A08060] uppercase tracking-wide mb-3">
          Outgoing Requests
        </h3>
        {pendingOutgoing.length === 0 ? (
          <div className="bg-white border-2 border-[#F0E6D3] rounded-xl p-5 text-center">
            <p className="text-[#A08060] text-sm">No outgoing requests.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingOutgoing.map((r) => {
              const initial = r.recipientName.charAt(0).toUpperCase();
              const isLoading = loadingAction === r.id;

              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-[#F0E6D3] rounded-xl"
                >
                  <div className="w-10 h-10 rounded-full bg-[#A08060] flex items-center justify-center text-white font-bold flex-shrink-0">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#3D2C2C] truncate">{r.recipientName}</p>
                    <p className="text-xs text-[#A08060]">Pending</p>
                  </div>
                  <button
                    onClick={() => onCancel(r.id)}
                    disabled={isLoading}
                    className="px-3 py-1.5 text-xs border-2 border-[#E8D5C4] text-[#A08060] rounded-full font-semibold hover:text-[#E54B4B] hover:border-[#E54B4B]/40 transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {isLoading ? "..." : "Cancel"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
