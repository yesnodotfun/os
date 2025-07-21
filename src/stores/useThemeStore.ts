import { create } from "zustand";
import { OsThemeId } from "@/themes/types";

interface ThemeState {
  current: OsThemeId;
  setTheme: (theme: OsThemeId) => void;
  hydrate: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  current: "system7",
  setTheme: (theme) => {
    set({ current: theme });
    localStorage.setItem("os_theme", theme);
    document.documentElement.dataset.osTheme = theme;
  },
  hydrate: () => {
    const saved = localStorage.getItem("os_theme") as OsThemeId | null;
    const theme = saved || "system7";
    set({ current: theme });
    document.documentElement.dataset.osTheme = theme;
  },
}));
