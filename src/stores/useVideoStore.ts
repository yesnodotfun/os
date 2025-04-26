import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Video {
  id: string;
  url: string;
  title: string;
  artist?: string;
}

export const DEFAULT_VIDEOS: Video[] = [
  {
    id: "0pP3ZjMDzF4",
    url: "https://www.youtube.com/watch?v=0pP3ZjMDzF4",
    title: "Make Something Wonderful",
    artist: "Steve Jobs",
  },
  {
    id: "EKBVLzOZyLw",
    url: "https://youtu.be/EKBVLzOZyLw?si=H3D6ENKKWRsVwbIM",
    title: "On Focus",
    artist: "Jony Ive",
  },
  {
    id: "3vq9p00T08I",
    url: "https://youtu.be/3vq9p00T08I?si=MYUqu4-71lB24_lM",
    title: "Macintosh (1984)",
    artist: "Apple",
  },
  {
    id: "2B-XwPjn9YY",
    url: "https://youtu.be/2B-XwPjn9YY?si=1HX8K8wA_i9-HIui",
    title: "Macintosh Introduction (1984)",
    artist: "Steve Jobs",
  },
  {
    id: "VFP-VZtgb0s",
    url: "https://youtu.be/VFP-VZtgb0s?si=CydyWRq96F-RM7Jt",
    title: "iMac G3 vs PC Simplicity (1998)",
    artist: "Steve Jobs",
  },
  {
    id: "dtaSDVpAo4c",
    url: "https://youtu.be/dtaSDVpAo4c?si=DdbadlisyCMIOYDg",
    title: "Apple Back on Track (1998)",
    artist: "Steve Jobs",
  },
  {
    id: "mE_bDNaYAr8",
    url: "https://youtu.be/mE_bDNaYAr8?si=5f09g9MAmAsvK-OZ",
    title: "iPod Commercial (2001)",
    artist: "Apple",
  },
  {
    id: "b5P3QDm61go",
    url: "https://youtu.be/b5P3QDm61go?si=6KH24_Y41mYZCqDi",
    title: "iMac G4 \"Lamp\" Ad (2002)",
    artist: "Apple",
  },
  {
    id: "7GRv-kv5XEg",
    url: "https://www.youtube.com/watch?v=7GRv-kv5XEg",
    title: "iPod Nano Announcement (2005)",
    artist: "Steve Jobs",
  },
  {
    id: "VQKMoT-6XSg",
    url: "https://youtu.be/VQKMoT-6XSg?si=XzKqJ_mnXDH_P4zH",
    title: "iPhone Introduction (2007)",
    artist: "Steve Jobs",
  },
  {
    id: "FKci-cMsiwo",
    url: "https://youtu.be/FKci-cMsiwo?si=YOUR_SI_PARAM",
    title: "WWDC 2008 Keynote (2008)",
    artist: "Steve Jobs",
  },
  {
    id: "Bts6EkUZrRY",
    url: "https://youtu.be/Bts6EkUZrRY?si=YOUR_SI_PARAM",
    title: "MacBook Air Introduction (2008)",
    artist: "Steve Jobs",
  },
  {
    id: "MbU3R-TzoJo",
    url: "https://www.youtube.com/watch?v=MbU3R-TzoJo",
    title: "iPhone 4 Introduction (2010)",
    artist: "Steve Jobs",
  },
];

interface VideoStoreState {
  videos: Video[];
  currentIndex: number;
  loopAll: boolean;
  loopCurrent: boolean;
  isShuffled: boolean;
  isPlaying: boolean;
  // actions
  setVideos: (videos: Video[] | ((prev: Video[]) => Video[])) => void;
  setCurrentIndex: (index: number) => void;
  setLoopAll: (val: boolean) => void;
  setLoopCurrent: (val: boolean) => void;
  setIsShuffled: (val: boolean) => void;
  togglePlay: () => void;
  setIsPlaying: (val: boolean) => void;
}

const CURRENT_VIDEO_STORE_VERSION = 3; // Define the current version

const getInitialState = () => ({
  videos: DEFAULT_VIDEOS,
  currentIndex: 0,
  loopAll: true,
  loopCurrent: false,
  isShuffled: false,
  isPlaying: false,
});

export const useVideoStore = create<VideoStoreState>()(
  persist(
    (set) => ({
      ...getInitialState(),

      setVideos: (videosOrUpdater) => {
        set((state) => {
          const newVideos =
            typeof videosOrUpdater === "function"
              ? (videosOrUpdater as (prev: Video[]) => Video[])(state.videos)
              : videosOrUpdater;
          return { videos: newVideos } as Partial<VideoStoreState>;
        });
      },
      setCurrentIndex: (index) => set({ currentIndex: index }),
      setLoopAll: (val) => set({ loopAll: val }),
      setLoopCurrent: (val) => set({ loopCurrent: val }),
      setIsShuffled: (val) => set({ isShuffled: val }),
      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
      setIsPlaying: (val) => set({ isPlaying: val }),
    }),
    {
      name: "ryos:videos",
      version: CURRENT_VIDEO_STORE_VERSION, // Set the current version
      partialize: (state) => ({
        // Keep videos here initially for migration
        videos: state.videos,
        currentIndex: state.currentIndex,
        loopAll: state.loopAll,
        loopCurrent: state.loopCurrent,
        isShuffled: state.isShuffled,
      }),
      migrate: (persistedState, version) => {
        let state = persistedState as Partial<VideoStoreState>; // Type assertion

        // If the persisted version is older than the current version, update defaults
        if (version < CURRENT_VIDEO_STORE_VERSION) {
          console.log(
            `Migrating video store from version ${version} to ${CURRENT_VIDEO_STORE_VERSION}`
          );
          state = {
            ...state, // Keep other persisted state
            videos: DEFAULT_VIDEOS, // Update to new defaults
            currentIndex: 0, // Reset index
            // isPlaying is not persisted, so no need to reset here
          };
        }

        // Ensure the returned state matches the latest partialized structure
        const partializedState = {
          videos: state.videos,
          currentIndex: state.currentIndex,
          loopAll: state.loopAll,
          loopCurrent: state.loopCurrent,
          isShuffled: state.isShuffled,
        };

        return partializedState as VideoStoreState; // Return the potentially migrated state
      },
      // Optional: Re-add partialize here if you want to exclude videos AFTER migration
      // if they match defaults and you want to save space
      // partialize: (state) => ({
      //   currentIndex: state.currentIndex,
      //   loopAll: state.loopAll,
      //   loopCurrent: state.loopCurrent,
      //   isShuffled: state.isShuffled,
      // }),
    }
  )
); 