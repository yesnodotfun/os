import { useMemo, useEffect } from "react";
import { useAppStore, INDEXEDDB_PREFIX } from "@/stores/useAppStore";

/**
 * Hook exposing wallpaper state & helpers.
 * Under the hood, all state is managed by the global `useAppStore`.
 */
export function useWallpaper() {
  // State selectors
  const currentWallpaper = useAppStore((s) => s.currentWallpaper);
  const wallpaperSource = useAppStore((s) => s.wallpaperSource);

  // Actions
  const setWallpaper = useAppStore((s) => s.setWallpaper);
  const loadCustomWallpapers = useAppStore((s) => s.loadCustomWallpapers);
  const getWallpaperData = useAppStore((s) => s.getWallpaperData);

  // Derived helper – detects whether the active wallpaper is a video
  const isVideoWallpaper = useMemo(() => {
    const path = wallpaperSource;
    return (
      path.endsWith(".mp4") ||
      path.includes("video/") ||
      (path.startsWith("https://") && /\.(mp4|webm|ogg)(\?|$)/.test(path))
    );
  }, [wallpaperSource]);

  // Ensure wallpaperSource is resolved on initial mount for custom wallpapers
  useEffect(() => {
    // If the current wallpaper is a custom (IndexedDB) reference and the source URL
    // has not yet been resolved (or became invalid after a reload), trigger a refresh.
    const needsRefresh =
      currentWallpaper.startsWith(INDEXEDDB_PREFIX) &&
      (wallpaperSource === currentWallpaper || // Not resolved yet
        wallpaperSource.startsWith("blob:null")); // Invalid persisted object URL

    if (needsRefresh) {
      // Re-invoke the same helper that sets up the correct source.
      // This keeps the logic in a single place and avoids duplication.
      void setWallpaper(currentWallpaper);
    }
  }, [currentWallpaper, wallpaperSource, setWallpaper]);

  return {
    currentWallpaper,
    wallpaperSource,
    setWallpaper,
    isVideoWallpaper,
    loadCustomWallpapers,
    getWallpaperData,
    INDEXEDDB_PREFIX,
  } as const;
}
