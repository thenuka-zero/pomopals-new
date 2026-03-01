import { create } from "zustand";

interface FriendsStore {
  pendingRequestCount: number;
  lastFetchedAt: number | null;
  fetchPendingCount: () => Promise<void>;
  resetCount: () => void;
}

export const useFriendsStore = create<FriendsStore>((set) => ({
  pendingRequestCount: 0,
  lastFetchedAt: null,
  fetchPendingCount: async () => {
    try {
      const res = await fetch("/api/friends/requests?direction=incoming&status=pending");
      if (!res.ok) return;
      const data = await res.json();
      set({ pendingRequestCount: data.incoming?.length ?? 0, lastFetchedAt: Date.now() });
    } catch {
      // swallow errors silently
    }
  },
  resetCount: () => set({ pendingRequestCount: 0 }),
}));
