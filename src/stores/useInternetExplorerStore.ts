import { create } from "zustand";
import { persist } from "zustand/middleware";

// Define types
export interface Favorite {
  title: string;
  url: string;
  favicon?: string;
  year?: string;
}

export interface HistoryEntry {
  url: string;
  title: string;
  favicon?: string;
  timestamp: number;
  year?: string;
}

export type NavigationMode = "past" | "now" | "future";
export type NavigationStatus = "idle" | "loading" | "success" | "error";

// Default constants
export const DEFAULT_URL = "https://apple.com";
export const DEFAULT_YEAR = "2007";

export const DEFAULT_FAVORITES: Favorite[] = [
  {
    title: "Apple",
    url: "https://apple.com",
    favicon: "https://www.google.com/s2/favicons?domain=apple.com&sz=32",
    year: "2007",
  },
  {
    title: "Wikipedia",
    url: "https://en.wikipedia.org",
    favicon: "https://www.google.com/s2/favicons?domain=en.wikipedia.org&sz=32",
    year: "current",
  },
  {
    title: "HyperCards",
    url: "https://hcsimulator.com",
    favicon: "https://www.google.com/s2/favicons?domain=hcsimulator.com&sz=32",
    year: "current",
  },
  {
    title: "Baby Cursor",
    url: "https://baby-cursor.ryo.lu",
    favicon: "https://www.google.com/s2/favicons?domain=ryo.lu&sz=32",
    year: "current",
  },
  {
    title: "Notion",
    url: "https://notion.com",
    favicon: "https://www.google.com/s2/favicons?domain=notion.com&sz=32",
    year: "2050",
  },
  {
    title: "Ryo",
    url: "https://ryo.lu",
    favicon: "https://www.google.com/s2/favicons?domain=ryo.lu&sz=32",
    year: "current",
  },
  {
    title: "Ian",
    url: "https://shaoruu.io",
    favicon: "https://www.google.com/s2/favicons?domain=shaoruu.io&sz=32",
    year: "current",
  },
  {
    title: "Sam",
    url: "https://www.samuelcatania.com",
    favicon:
      "https://www.google.com/s2/favicons?domain=www.samuelcatania.com&sz=32",
    year: "current",
  },
  {
    title: "Theo",
    url: "https://tmb.sh",
    favicon: "https://www.google.com/s2/favicons?domain=tmb.sh&sz=32",
    year: "current",
  },
  {
    title: "Stephen",
    url: "https://wustep.me",
    favicon: "https://www.google.com/s2/favicons?domain=wustep.me&sz=32",
    year: "current",
  },
  {
    title: "Maya",
    url: "https://mayabakir.com",
    favicon: "https://www.google.com/s2/favicons?domain=mayabakir.com&sz=32",
    year: "current",
  },
  {
    title: "Modi",
    url: "https://www.akm.io",
    favicon: "https://www.google.com/s2/favicons?domain=www.akm.io&sz=32",
    year: "current",
  },
  {
    title: "Andrew",
    url: "https://www.andrewl.ee",
    favicon: "https://www.google.com/s2/favicons?domain=www.andrewl.ee&sz=32",
    year: "current",
  },  
  {
    title: "Lucas",
    url: "https://www.lucasn.com",
    favicon: "https://www.google.com/s2/favicons?domain=www.lucasn.com&sz=32",
    year: "current",
  },
  {
    title: "Frank",
    url: "https://okfrank.co",
    favicon: "https://www.google.com/s2/favicons?domain=okfrank.co&sz=32",
    year: "current",
  },
];

// Helper function to classify year into navigation mode
function classifyYear(year: string): NavigationMode {
  if (year === "current") return "now";
  const yearNum = parseInt(year);
  const currentYear = new Date().getFullYear();
  return yearNum > currentYear ? "future" : "past";
}

// Cache related types and functions
interface AiCacheEntry {
  html: string;
  updatedAt: number;
}

interface InternetExplorerStore {
  // Navigation state
  url: string;
  year: string;
  mode: NavigationMode;
  status: NavigationStatus;
  finalUrl: string | null;
  aiGeneratedHtml: string | null;
  error: string | null;
  token: number;
  
  // Favorites and history
  favorites: Favorite[];
  history: HistoryEntry[];
  historyIndex: number;
  
  // Dialog states
  isTitleDialogOpen: boolean;
  newFavoriteTitle: string;
  isHelpDialogOpen: boolean;
  isAboutDialogOpen: boolean;
  isNavigatingHistory: boolean;
  isClearFavoritesDialogOpen: boolean;
  isClearHistoryDialogOpen: boolean;
  
  // AI caching
  aiCache: Record<string, AiCacheEntry>;
  
  // Timeline settings
  timelineSettings: { [year: string]: string };
  
  // Actions
  setUrl: (url: string) => void;
  setYear: (year: string) => void;
  navigateStart: (url: string, year: string, mode: NavigationMode, token: number) => void;
  setFinalUrl: (finalUrl: string) => void;
  loadSuccess: (finalUrl?: string, aiGeneratedHtml?: string | null) => void;
  loadError: (error: string) => void;
  cancel: () => void;
  
  // Favorites actions
  addFavorite: (favorite: Favorite) => void;
  removeFavorite: (index: number) => void;
  clearFavorites: () => void;
  
  // History actions
  addHistoryEntry: (entry: Omit<HistoryEntry, "timestamp">) => void;
  setHistoryIndex: (index: number) => void;
  clearHistory: () => void;
  
  // Dialog actions
  setTitleDialogOpen: (isOpen: boolean) => void;
  setNewFavoriteTitle: (title: string) => void;
  setHelpDialogOpen: (isOpen: boolean) => void;
  setAboutDialogOpen: (isOpen: boolean) => void;
  setNavigatingHistory: (isNavigating: boolean) => void;
  setClearFavoritesDialogOpen: (isOpen: boolean) => void;
  setClearHistoryDialogOpen: (isOpen: boolean) => void;
  
  // Cache actions
  cacheAiPage: (url: string, year: string, html: string) => void;
  getCachedAiPage: (url: string, year: string) => string | null;
  
  // Timeline actions
  setTimelineSettings: (settings: { [year: string]: string }) => void;
  
  // Utility functions
  getAiCacheKey: (url: string, year: string) => string;
  updateBrowserState: () => void;
}

export const useInternetExplorerStore = create<InternetExplorerStore>()(
  persist(
    (set, get) => ({
      // Initial state
      url: DEFAULT_URL,
      year: DEFAULT_YEAR,
      mode: classifyYear(DEFAULT_YEAR),
      status: 'idle',
      finalUrl: null,
      aiGeneratedHtml: null,
      error: null,
      token: 0,
      
      favorites: DEFAULT_FAVORITES,
      history: [],
      historyIndex: -1,
      
      isTitleDialogOpen: false,
      newFavoriteTitle: "",
      isHelpDialogOpen: false,
      isAboutDialogOpen: false,
      isNavigatingHistory: false,
      isClearFavoritesDialogOpen: false,
      isClearHistoryDialogOpen: false,
      
      aiCache: {},
      
      timelineSettings: {},
      
      // Actions
      setUrl: (url) => set({ url }),
      
      setYear: (year) => set({ year }),
      
      navigateStart: (url, year, mode, token) => set({
        url,
        year,
        mode,
        status: 'loading',
        finalUrl: null,
        aiGeneratedHtml: null,
        error: null,
        token,
      }),
      
      setFinalUrl: (finalUrl) => set({ finalUrl }),
      
      loadSuccess: (finalUrl, aiGeneratedHtml) => set(state => ({
        status: 'success',
        finalUrl: finalUrl ?? state.finalUrl,
        aiGeneratedHtml: aiGeneratedHtml ?? state.aiGeneratedHtml,
        error: null,
      })),
      
      loadError: (error) => set({ status: 'error', error }),
      
      cancel: () => set({ status: 'idle' }),
      
      // Favorites actions
      addFavorite: (favorite) => set(state => ({
        favorites: [...state.favorites, favorite],
      })),
      
      removeFavorite: (index) => set(state => ({
        favorites: state.favorites.filter((_, i) => i !== index),
      })),
      
      clearFavorites: () => set({ favorites: [] }),
      
      // History actions
      addHistoryEntry: (entry) => set(state => {
        const newEntry = { ...entry, timestamp: Date.now() };
        return {
          history: [newEntry, ...state.history].slice(0, 100), // Keep last 100 entries
          historyIndex: 0,
        };
      }),
      
      setHistoryIndex: (index) => set({ historyIndex: index }),
      
      clearHistory: () => set({ history: [], historyIndex: -1 }),
      
      // Dialog actions
      setTitleDialogOpen: (isOpen) => set({ isTitleDialogOpen: isOpen }),
      setNewFavoriteTitle: (title) => set({ newFavoriteTitle: title }),
      setHelpDialogOpen: (isOpen) => set({ isHelpDialogOpen: isOpen }),
      setAboutDialogOpen: (isOpen) => set({ isAboutDialogOpen: isOpen }),
      setNavigatingHistory: (isNavigating) => set({ isNavigatingHistory: isNavigating }),
      setClearFavoritesDialogOpen: (isOpen) => set({ isClearFavoritesDialogOpen: isOpen }),
      setClearHistoryDialogOpen: (isOpen) => set({ isClearHistoryDialogOpen: isOpen }),
      
      // Cache actions
      getAiCacheKey: (url, year) => {
        // Normalize URL to ensure consistency (remove trailing slash, ensure protocol)
        const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
        return `${normalizedUrl}|${year}`;
      },
      
      cacheAiPage: (url, year, html) => set(state => {
        const key = get().getAiCacheKey(url, year);
        return {
          aiCache: {
            ...state.aiCache,
            [key]: { html, updatedAt: Date.now() }
          }
        };
      }),
      
      getCachedAiPage: (url, year) => {
        const key = get().getAiCacheKey(url, year);
        return get().aiCache[key]?.html || null;
      },
      
      // Timeline actions
      setTimelineSettings: (settings) => set({ timelineSettings: settings }),
      
      // Update system browser state (for other components to access)
      updateBrowserState: () => {
        // This is just a stub - this function doesn't need to do anything in the store itself
        // as the browser state can be accessed directly from the store
        // It's included for API compatibility with the original storage.ts functions
      }
    }),
    {
      name: "ryos:internet-explorer",
      partialize: (state) => ({
        // Only persist these values to localStorage
        url: state.url,
        year: state.year,
        favorites: state.favorites,
        history: state.history,
        aiCache: state.aiCache,
        timelineSettings: state.timelineSettings,
      }),
    }
  )
); 