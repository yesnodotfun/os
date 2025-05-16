import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Re-use types from Finder for consistency
import type {
  ViewType,
  SortType,
} from "@/apps/finder/components/FinderMenuBar";

interface FinderStoreState {
  viewType: ViewType;
  sortType: SortType;
  setViewType: (type: ViewType) => void;
  setSortType: (type: SortType) => void;
  reset: () => void;
}

const STORE_VERSION = 1;
const STORE_NAME = "ryos:finder";

export const useFinderStore = create<FinderStoreState>()(
  persist(
    (set) => ({
      viewType: "list", // default
      sortType: "name", // default
      setViewType: (type) => set({ viewType: type }),
      setSortType: (type) => set({ sortType: type }),
      reset: () => set({ viewType: "list", sortType: "name" }),
    }),
    {
      name: STORE_NAME,
      version: STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        viewType: state.viewType,
        sortType: state.sortType,
      }),
      migrate: (persistedState, version) => {
        // Handle migration from old localStorage keys if no persisted state exists
        if (!persistedState || version < STORE_VERSION) {
          const oldView = localStorage.getItem(
            "finder_view_type"
          ) as ViewType | null;
          const oldSort = localStorage.getItem(
            "finder_sort_type"
          ) as SortType | null;
          // Clean up old keys after reading
          if (oldView) localStorage.removeItem("finder_view_type");
          if (oldSort) localStorage.removeItem("finder_sort_type");

          if (oldView || oldSort) {
            return {
              viewType: oldView || "list",
              sortType: oldSort || "name",
            } as Partial<FinderStoreState>;
          }
        }
        return persistedState as Partial<FinderStoreState>;
      },
    }
  )
);

// ---------------------------------------------
// Utility: calculateStorageSpace (moved from utils/storage)
// Estimate LocalStorage usage (rough) and quota.
// Returns { total, used, available, percentUsed }
export const calculateStorageSpace = () => {
  let total = 0;
  let used = 0;

  try {
    // Typical LocalStorage quota is ~10 MB – keep same heuristic
    total = 10 * 1024 * 1024;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const value = localStorage.getItem(key);
      if (value) {
        // Each UTF-16 char = 2 bytes
        used += value.length * 2;
      }
    }
  } catch (err) {
    console.error("[FinderStore] Error calculating storage space", err);
  }

  return {
    total,
    used,
    available: total - used,
    percentUsed: Math.round((used / total) * 100),
  };
};
