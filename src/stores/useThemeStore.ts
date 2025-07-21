import { create } from "zustand";
import { OsThemeId } from "@/themes/types";

interface ThemeState {
  current: OsThemeId;
  setTheme: (theme: OsThemeId) => void;
  hydrate: () => void;
}

// Dynamically manage loading/unloading of legacy Windows CSS (xp.css variants)
let legacyCssLink: HTMLLinkElement | null = null;

async function ensureLegacyCss(theme: OsThemeId) {
  // Only xp and win98 use xp.css
  if (theme !== "xp" && theme !== "win98") {
    if (legacyCssLink) {
      legacyCssLink.remove();
      legacyCssLink = null;
    }
    return;
  }

  const desiredVariant = theme === "xp" ? "XP" : "98";
  const currentVariant = legacyCssLink?.dataset.variant;
  if (currentVariant === desiredVariant) return; // already loaded

  try {
    const href = (
      await import(
        desiredVariant === "XP"
          ? "xp.css/dist/XP.css?url"
          : "xp.css/dist/98.css?url"
      )
    ).default as string;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.role = "legacy-win-css";
    link.dataset.variant = desiredVariant;

    // Replace existing link if present
    if (legacyCssLink) legacyCssLink.replaceWith(link);
    else document.head.appendChild(link);
    legacyCssLink = link;
  } catch (e) {
    console.error(
      "Failed to load legacy Windows CSS variant",
      desiredVariant,
      e
    );
  }
}

export const useThemeStore = create<ThemeState>((set) => ({
  current: "system7",
  setTheme: (theme) => {
    set({ current: theme });
    localStorage.setItem("os_theme", theme);
    document.documentElement.dataset.osTheme = theme;
    ensureLegacyCss(theme);
  },
  hydrate: () => {
    const saved = localStorage.getItem("os_theme") as OsThemeId | null;
    const theme = saved || "system7";
    set({ current: theme });
    document.documentElement.dataset.osTheme = theme;
    ensureLegacyCss(theme);
  },
}));
