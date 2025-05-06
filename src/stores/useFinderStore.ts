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
          const oldView = localStorage.getItem("finder_view_type") as ViewType | null;
          const oldSort = localStorage.getItem("finder_sort_type") as SortType | null;
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