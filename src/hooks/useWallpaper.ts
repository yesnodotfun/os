import { useState, useEffect, useMemo } from "react";
import { loadWallpaper, saveWallpaper } from "@/utils/storage";

// Store loading state for video wallpapers
const videoLoadingStates: Record<string, boolean> = {};

export function useWallpaper() {
  const [currentWallpaper, setCurrentWallpaper] =
    useState<string>(loadWallpaper);
  const [isVideoLoading, setIsVideoLoading] = useState<boolean>(false);
  
  // Check if current wallpaper is a video using useMemo to ensure it's recalculated
  const isVideoWallpaper = useMemo(() => {
    return currentWallpaper.endsWith(".mp4") || 
      currentWallpaper.includes("video/") ||
      (currentWallpaper.startsWith("https://") && 
      /\.(mp4|webm|ogg)($|\?)/.test(currentWallpaper));
  }, [currentWallpaper]);

  // Initialize loading state for video wallpapers
  useEffect(() => {
    if (isVideoWallpaper) {
      // Only set loading state if it's not already marked as loaded
      if (videoLoadingStates[currentWallpaper] !== false) {
        setIsVideoLoading(true);
        videoLoadingStates[currentWallpaper] = true;
      }
    } else {
      setIsVideoLoading(false);
    }
  }, [currentWallpaper, isVideoWallpaper]);

  // Listen for wallpaper changes in localStorage from other windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "control-panels:wallpaper") {
        setCurrentWallpaper(loadWallpaper());
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Helper function to check if a video is ready to play
  const checkVideoLoadState = (video: HTMLVideoElement, path: string) => {
    // readyState 4 means HAVE_ENOUGH_DATA - video can be played
    if (video.readyState >= 3) { // HAVE_FUTURE_DATA or better
      markVideoLoaded(path);
      return true;
    }
    return false;
  };

  // Helper function to mark a video as loaded
  const markVideoLoaded = (path: string) => {
    videoLoadingStates[path] = false;
    if (currentWallpaper === path) {
      setIsVideoLoading(false);
    }
  };

  const setWallpaper = (path: string) => {
    // Update state immediately for the current window
    setCurrentWallpaper(path);
    // Save to localStorage for persistence and other windows
    saveWallpaper(path);
    // Dispatch a custom event for other components in the same window
    window.dispatchEvent(new CustomEvent("wallpaperChange", { detail: path }));
  };

  return {
    currentWallpaper,
    setWallpaper,
    isVideoWallpaper,
    isVideoLoading,
    markVideoLoaded,
    checkVideoLoadState,
  };
}
