import { useState, useEffect, useMemo } from "react";
import { loadWallpaper, saveWallpaper } from "@/utils/storage";

// Store loading state for video wallpapers
const videoLoadingStates: Record<string, boolean> = {};

// Constants for IndexedDB
const DB_NAME = "ryOS";
const DB_VERSION = 3;
const CUSTOM_WALLPAPERS_STORE = "custom_wallpapers";
const INDEXEDDB_PREFIX = "indexeddb://";

export function useWallpaper() {
  const [currentWallpaper, setCurrentWallpaper] =
    useState<string>(loadWallpaper);
  const [isVideoLoading, setIsVideoLoading] = useState<boolean>(false);
  const [actualWallpaperData, setActualWallpaperData] = useState<string | null>(
    null
  );

  // Check if current wallpaper is a reference to an IndexedDB item
  const isIndexedDBReference = useMemo(() => {
    return currentWallpaper.startsWith(INDEXEDDB_PREFIX);
  }, [currentWallpaper]);

  // Extract the wallpaper ID from the reference
  const wallpaperId = useMemo(() => {
    return isIndexedDBReference
      ? currentWallpaper.substring(INDEXEDDB_PREFIX.length)
      : null;
  }, [isIndexedDBReference, currentWallpaper]);

  // Check if current wallpaper is a video using useMemo to ensure it's recalculated
  const isVideoWallpaper = useMemo(() => {
    const wallpaperPath = actualWallpaperData || currentWallpaper;
    return (
      wallpaperPath.endsWith(".mp4") ||
      wallpaperPath.includes("video/") ||
      (wallpaperPath.startsWith("https://") &&
        /\.(mp4|webm|ogg)($|\?)/.test(wallpaperPath))
    );
  }, [currentWallpaper, actualWallpaperData]);

  // Load wallpaper data from IndexedDB if it's a reference
  useEffect(() => {
    if (isIndexedDBReference && wallpaperId) {
      const loadWallpaperFromIndexedDB = async () => {
        try {
          setIsVideoLoading(true);
          const db = await openDatabase();
          const transaction = db.transaction(
            CUSTOM_WALLPAPERS_STORE,
            "readonly"
          );
          const store = transaction.objectStore(CUSTOM_WALLPAPERS_STORE);
          const request = store.get(wallpaperId);

          request.onsuccess = () => {
            if (request.result) {
              setActualWallpaperData(request.result.content);
              // Check if it's a video
              const isVideo =
                request.result.type?.startsWith("video/") ||
                request.result.content.includes("video/");

              if (!isVideo) {
                setIsVideoLoading(false);
              }
            } else {
              console.error("Wallpaper not found in IndexedDB:", wallpaperId);
              setActualWallpaperData(null);
              setIsVideoLoading(false);
            }
            db.close();
          };

          request.onerror = () => {
            console.error(
              "Error loading wallpaper from IndexedDB:",
              request.error
            );
            setActualWallpaperData(null);
            setIsVideoLoading(false);
            db.close();
          };
        } catch (error) {
          console.error("Failed to open IndexedDB:", error);
          setActualWallpaperData(null);
          setIsVideoLoading(false);
        }
      };

      loadWallpaperFromIndexedDB();
    } else {
      setActualWallpaperData(null);
    }
  }, [isIndexedDBReference, wallpaperId]);

  // Initialize loading state for video wallpapers
  useEffect(() => {
    if (isVideoWallpaper) {
      const wallpaperPath = actualWallpaperData || currentWallpaper;
      // Only set loading state if it's not already marked as loaded
      if (videoLoadingStates[wallpaperPath] !== false) {
        setIsVideoLoading(true);
        videoLoadingStates[wallpaperPath] = true;
      }
    } else if (!isIndexedDBReference) {
      setIsVideoLoading(false);
    }
  }, [
    currentWallpaper,
    isVideoWallpaper,
    actualWallpaperData,
    isIndexedDBReference,
  ]);

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

  // Helper function to open the IndexedDB database
  const openDatabase = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(CUSTOM_WALLPAPERS_STORE)) {
          db.createObjectStore(CUSTOM_WALLPAPERS_STORE, { keyPath: "name" });
        }
      };
    });
  };

  // Helper function to check if a video is ready to play
  const checkVideoLoadState = (video: HTMLVideoElement, path: string) => {
    // readyState 4 means HAVE_ENOUGH_DATA - video can be played
    if (video.readyState >= 3) {
      // HAVE_FUTURE_DATA or better
      markVideoLoaded(path);
      return true;
    }
    return false;
  };

  // Helper function to mark a video as loaded
  const markVideoLoaded = (path: string) => {
    videoLoadingStates[path] = false;
    if ((actualWallpaperData || currentWallpaper) === path) {
      setIsVideoLoading(false);
    }
  };

  // Save a custom wallpaper to IndexedDB and return a reference
  const saveCustomWallpaper = async (file: File): Promise<string> => {
    try {
      // Read the file as data URL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });

      const db = await openDatabase();
      const transaction = db.transaction(CUSTOM_WALLPAPERS_STORE, "readwrite");
      const store = transaction.objectStore(CUSTOM_WALLPAPERS_STORE);

      // Generate a unique name for the wallpaper
      const wallpaperName = `custom_${Date.now()}_${file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      )}`;

      const wallpaper = {
        name: wallpaperName,
        content: dataUrl,
        type: file.type,
        dateAdded: new Date().toISOString(),
      };

      return new Promise((resolve, reject) => {
        const request = store.put(wallpaper);

        request.onsuccess = () => {
          db.close();
          // Return a reference to the stored wallpaper
          resolve(`${INDEXEDDB_PREFIX}${wallpaperName}`);
        };

        request.onerror = () => {
          db.close();
          reject(request.error);
        };
      });
    } catch (error) {
      console.error("Error saving custom wallpaper:", error);
      throw error;
    }
  };

  // Load all custom wallpapers from IndexedDB (just returns references)
  const loadCustomWallpapers = async (): Promise<string[]> => {
    try {
      const db = await openDatabase();
      const transaction = db.transaction(CUSTOM_WALLPAPERS_STORE, "readonly");
      const store = transaction.objectStore(CUSTOM_WALLPAPERS_STORE);

      return new Promise((resolve, reject) => {
        const request = store.getAllKeys();

        request.onsuccess = () => {
          const keys = request.result;
          db.close();
          // Convert keys to references
          resolve(
            Array.from(keys as string[]).map(
              (key) => `${INDEXEDDB_PREFIX}${key}`
            )
          );
        };

        request.onerror = () => {
          db.close();
          reject(request.error);
        };
      });
    } catch (error) {
      console.error("Error loading custom wallpapers:", error);
      return [];
    }
  };

  // Get actual data for a specific wallpaper by ID
  const getWallpaperData = async (
    reference: string
  ): Promise<string | null> => {
    if (!reference.startsWith(INDEXEDDB_PREFIX)) {
      return reference; // Not an IndexedDB reference, return as is
    }

    const id = reference.substring(INDEXEDDB_PREFIX.length);

    try {
      const db = await openDatabase();
      const transaction = db.transaction(CUSTOM_WALLPAPERS_STORE, "readonly");
      const store = transaction.objectStore(CUSTOM_WALLPAPERS_STORE);

      return new Promise((resolve, reject) => {
        const request = store.get(id);

        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result.content);
          } else {
            resolve(null);
          }
          db.close();
        };

        request.onerror = () => {
          db.close();
          reject(request.error);
        };
      });
    } catch (error) {
      console.error("Error getting wallpaper data:", error);
      return null;
    }
  };

  // Updated setWallpaper to handle file uploads
  const setWallpaper = async (path: string | File) => {
    let wallpaperPath: string;

    // If path is a File, save it to IndexedDB
    if (path instanceof File) {
      try {
        wallpaperPath = await saveCustomWallpaper(path);
      } catch (error) {
        console.error("Failed to save custom wallpaper:", error);
        return;
      }
    } else {
      wallpaperPath = path;
    }

    // Update state immediately for the current window
    setCurrentWallpaper(wallpaperPath);
    // Save to localStorage for persistence and other windows
    saveWallpaper(wallpaperPath);
    // Dispatch a custom event for other components in the same window
    window.dispatchEvent(
      new CustomEvent("wallpaperChange", { detail: wallpaperPath })
    );
  };

  // Helper to determine what path to use for the wallpaper source
  const getWallpaperSource = () => {
    return actualWallpaperData || currentWallpaper;
  };

  return {
    currentWallpaper,
    wallpaperSource: getWallpaperSource(),
    setWallpaper,
    isVideoWallpaper,
    isVideoLoading,
    markVideoLoaded,
    checkVideoLoadState,
    saveCustomWallpaper,
    loadCustomWallpapers,
    getWallpaperData,
    INDEXEDDB_PREFIX,
  };
}
