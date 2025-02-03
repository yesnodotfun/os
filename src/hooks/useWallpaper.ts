import { useState } from "react";
import { loadWallpaper, saveWallpaper } from "@/utils/storage";

export function useWallpaper() {
  const [currentWallpaper, setCurrentWallpaper] = useState<string>(() =>
    loadWallpaper()
  );

  const setWallpaper = (path: string) => {
    setCurrentWallpaper(path);
    saveWallpaper(path);
  };

  return {
    currentWallpaper,
    setWallpaper,
  };
}
