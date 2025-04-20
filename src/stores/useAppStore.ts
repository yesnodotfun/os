import { create } from "zustand";
import { AppId } from "@/config/appRegistry";
import { AppManagerState, AppState } from "@/apps/base/types";
import { loadAppState, saveAppState } from "@/utils/storage";

// Initialize state from existing localStorage (with migration / defaults)
const initial = loadAppState();

interface AppStoreState extends AppManagerState {
  bringToForeground: (appId: AppId | "") => void;
  toggleApp: (appId: AppId) => void;
  navigateToNextApp: (currentAppId: AppId) => void;
  navigateToPreviousApp: (currentAppId: AppId) => void;
}

export const useAppStore = create<AppStoreState>((set, get) => ({
  windowOrder: initial.windowOrder,
  apps: initial.apps,

  bringToForeground: (appId) => {
    set((state) => {
      const newState: AppManagerState = {
        windowOrder: [...state.windowOrder],
        apps: { ...state.apps },
      };

      // If empty string provided, just clear foreground flags
      if (!appId) {
        Object.keys(newState.apps).forEach((id) => {
          newState.apps[id] = { ...newState.apps[id], isForeground: false };
        });
      } else {
        // Re‑order windowOrder so that appId is last (top‑most)
        newState.windowOrder = [
          ...newState.windowOrder.filter((id) => id !== appId),
          appId,
        ];

        // Set foreground flags
        Object.keys(newState.apps).forEach((id) => {
          newState.apps[id] = {
            ...newState.apps[id],
            isForeground: id === appId,
          };
        });
      }

      // Emit DOM event (keep behaviour parity)
      const appStateChangeEvent = new CustomEvent("appStateChange", {
        detail: {
          appId,
          isOpen: newState.apps[appId]?.isOpen || false,
          isForeground: true,
        },
      });
      window.dispatchEvent(appStateChangeEvent);

      // Persist
      saveAppState(newState);
      return newState;
    });
  },

  toggleApp: (appId) => {
    set((state) => {
      const isCurrentlyOpen = state.apps[appId]?.isOpen;

      const newWindowOrder = isCurrentlyOpen
        ? state.windowOrder.filter((id) => id !== appId)
        : [...state.windowOrder, appId];

      const newApps: { [appId: string]: AppState } = { ...state.apps };

      Object.keys(newApps).forEach((id) => {
        if (id === appId) {
          newApps[id] = {
            ...newApps[id],
            isOpen: !isCurrentlyOpen,
            isForeground: !isCurrentlyOpen,
          };
        } else {
          newApps[id] = { ...newApps[id], isForeground: false };
        }
      });

      const newState: AppManagerState = {
        windowOrder: newWindowOrder,
        apps: newApps,
      };

      const appStateChangeEvent = new CustomEvent("appStateChange", {
        detail: {
          appId,
          isOpen: !isCurrentlyOpen,
          isForeground: !isCurrentlyOpen,
        },
      });
      window.dispatchEvent(appStateChangeEvent);

      saveAppState(newState);
      return newState;
    });
  },

  navigateToNextApp: (currentAppId) => {
    const { windowOrder } = get();
    if (windowOrder.length <= 1) return;
    const currentIndex = windowOrder.indexOf(currentAppId);
    if (currentIndex === -1) return;
    const nextAppId = windowOrder[(currentIndex + 1) % windowOrder.length] as AppId;
    get().bringToForeground(nextAppId);
  },

  navigateToPreviousApp: (currentAppId) => {
    const { windowOrder } = get();
    if (windowOrder.length <= 1) return;
    const currentIndex = windowOrder.indexOf(currentAppId);
    if (currentIndex === -1) return;
    const prevIndex =
      (currentIndex - 1 + windowOrder.length) % windowOrder.length;
    const prevAppId = windowOrder[prevIndex] as AppId;
    get().bringToForeground(prevAppId);
  },
})); 