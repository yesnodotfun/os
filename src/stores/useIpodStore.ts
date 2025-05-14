import { create } from "zustand";
import { persist } from "zustand/middleware";

// Define the Track type (can be shared or defined here)
export interface Track {
  id: string;
  url: string;
  title: string;
  artist?: string;
  album?: string;
}

// Original video collection moved here
export const IPOD_DEFAULT_VIDEOS = [
  {
    id: "vgqNtGVYQgc",
    url: "https://youtu.be/vgqNtGVYQgc",
    title: "He Can't Love U",
    artist: "Jagged Edge",
  },
  {
    id: "GWL1Tzl0YdY",
    url: "https://www.youtube.com/watch?v=GWL1Tzl0YdY",
    title: "종말의 사과나무 (Apocalypse)",
    artist: "BIBI (비비)",
  },
  {
    id: "lXd1GHJPx-A",
    url: "https://www.youtube.com/watch?v=lXd1GHJPx-A",
    title: "Promise",
    artist: "Jagged Edge",
  },
  {
    id: "Y_AxRCNFT2g",
    url: "https://www.youtube.com/watch?v=Y_AxRCNFT2g",
    title: "Supernova (House Remix)",
    artist: "aespa (에스파)",
  },
  {
    id: "yP8nAoFi6JY",
    url: "https://www.youtube.com/watch?v=yP8nAoFi6JY",
    title: "Supernatural (Miami Bass Remix)",
    artist: "NewJeans (뉴진스)",
  },
  {
    id: "1FNI1i7H1Kc",
    url: "https://www.youtube.com/watch?v=1FNI1i7H1Kc",
    title: "The Chase (R&B Remix)",
    artist: "Hearts2Hearts (하츠투하츠)",
  },
  {
    id: "LVLOwwGVVZ0",
    url: "https://www.youtube.com/watch?v=LVLOwwGVVZ0",
    title: "Right Now (R&B Remix)",
    artist: "NewJeans (뉴진스)",
  },
  {
    id: "AGaTzDTnYGY",
    url: "https://www.youtube.com/watch?v=AGaTzDTnYGY",
    title: "How Sweet (UK Garage Remix)",
    artist: "NewJeans (뉴진스)",
  },
  {
    id: "XJWqHmY-g9U",
    url: "https://www.youtube.com/watch?v=XJWqHmY-g9U",
    title: "Telephone Number",
    artist: "Junko Ohashi (大橋純子)",
  },
  {
    id: "f3zVbOMyzgE",
    url: "https://www.youtube.com/watch?v=f3zVbOMyzgE",
    title: "UP&DOWN",
    artist: "LIM JISOO (임지수)",
  },
  {
    id: "zt0Me5qyK4g",
    url: "https://www.youtube.com/watch?v=zt0Me5qyK4g",
    title: "춤 (Dance)",
    artist: "OFFONOFF",
  },
  {
    id: "T6YVgEpRU6Q",
    url: "https://www.youtube.com/watch?v=T6YVgEpRU6Q",
    title: "LEFT RIGHT",
    artist: "XG",
  },
  {
    id: "QiYOkmrI1jg",
    url: "https://www.youtube.com/watch?v=QiYOkmrI1jg",
    title: "IYKYK",
    artist: "XG",
  },
  {
    id: "b9MZLrVU3EQ",
    url: "https://www.youtube.com/watch?v=b9MZLrVU3EQ",
    title: "BAD BITCHES (feat. Kehlani)",
    artist: "Destin Conrad",
  },
  {
    id: "_wgeHqXr4Hc",
    url: "https://www.youtube.com/watch?v=_wgeHqXr4Hc",
    title: "나를 위해 (For Days to Come)",
    artist: "Crush (크러쉬)",
  },
  {
    id: "zzDpTWCGofU",
    url: "https://www.youtube.com/watch?v=zzDpTWCGofU",
    title: "Nirvana Blues",
    artist: "Colde (콜드)",
  },
  {
    id: "6vDi9S2ZDYA",
    url: "https://www.youtube.com/watch?v=6vDi9S2ZDYA",
    title: "ETA (R&B Remix)",
    artist: "NewJeans (뉴진스)",
  },
  {
    id: "BYEtLMKmvs8",
    url: "https://youtu.be/BYEtLMKmvs8",
    title: "Get Up (Extended ver.)",
    artist: "DEAN (딘)",
  },
  {
    id: "MQT93bv5aSM",
    url: "https://youtu.be/MQT93bv5aSM",
    title: "FRNK Demo Mashup",
    artist: "NewJeans (뉴진스)",
  },
  {
    id: "5tcBJCouOmE",
    url: "https://youtu.be/5tcBJCouOmE",
    title: "Hype Boy",
    artist: "DEAN (딘)",
  },
  {
    id: "PO8",
    url: "https://www.youtube.com/watch?v=HB4Rp2KKeu4",
    title: "野子",
    artist: "PO8",
  },
  {
    id: "z-xfGoabprU",
    url: "https://www.youtube.com/watch?v=z-xfGoabprU",
    title: "BEBE",
    artist: "STAYC (스테이씨)",
  },
  {
    id: "aFrQIJ5cbRc",
    url: "https://www.youtube.com/watch?v=aFrQIJ5cbRc",
    title: "Know About Me",
    artist: "NMIXX (엔믹스)",
  },
  {
    id: "hJ9Wp3PO3c8",
    url: "https://www.youtube.com/watch?v=hJ9Wp3PO3c8",
    title: "Butterfly",
    artist: "Hearts2Hearts (하츠투하츠)",
  },
  {
    id: "PICpEtPHyZI",
    url: "https://www.youtube.com/watch?v=PICpEtPHyZI",
    title: "Damn Right",
    artist: "JENNIE",
  },
  {
    id: "osNYssIep5w",
    url: "https://www.youtube.com/watch?v=osNYssIep5w",
    title: "Mantra (House Remix)",
    artist: "JENNIE",
  },
  {
    id: "DskqpUrvlmw",
    url: "https://www.youtube.com/watch?v=DskqpUrvlmw",
    title: "GPT",
    artist: "STAYC (스테이씨)",
  },
  {
    id: "Rk6aQvlmsWo",
    url: "https://www.youtube.com/watch?v=Rk6aQvlmsWo",
    title: "Dandelion",
    artist: "grentperez & Ruel",
  },
  {
    id: "Rf-ctwR7P-M",
    url: "https://www.youtube.com/watch?v=Rf-ctwR7P-M",
    title: "마음대로 (Control Me)",
    artist: "Colde (콜드)",
  },
  {
    id: "36wVOzmsywo",
    url: "https://www.youtube.com/watch?v=36wVOzmsywo",
    title: "FRR (오래오래)",
    artist: "george (죠지)",
  },
  {
    id: "FonjL7DQAUQ",
    url: "https://www.youtube.com/watch?v=FonjL7DQAUQ",
    title: "海浪 (Waves)",
    artist: "deca joins",
  },
  {
    id: "3SoYkCAzMBk",
    url: "https://www.youtube.com/watch?v=3SoYkCAzMBk",
    title: "Can We Talk",
    artist: "Tevin Campbell",
  },
  {
    id: "ZncbtRo7RXs",
    url: "https://www.youtube.com/watch?v=ZncbtRo7RXs",
    title: "Supernatural (Part.1)",
    artist: "NewJeans (뉴진스)",
  },
  {
    id: "hgNJ_qy6LCw",
    url: "https://www.youtube.com/watch?v=hgNJ_qy6LCw",
    title: "ASAP",
    artist: "NJZ",
  },
  {
    id: "YYyskjq1vSc",
    url: "https://www.youtube.com/watch?v=YYyskjq1vSc",
    title: "New Jeans (2025)",
    artist: "NJZ",
  },
  {
    id: "WpqXjRrZqa0",
    url: "https://www.youtube.com/watch?v=WpqXjRrZqa0",
    title: "Cool with You (2025)",
    artist: "NJZ",
  },
  {
    id: "In7e1knX7rQ",
    url: "https://www.youtube.com/watch?v=In7e1knX7rQ",
    title: "ETA/MTLA (feat. E SENS 이센스)",
    artist: "NJZ",
  },
];

// Map default videos to tracks for the initial iPod state
const DEFAULT_TRACKS: Track[] = IPOD_DEFAULT_VIDEOS.map((video) => ({
  id: video.id,
  url: video.url,
  title: video.title,
  artist: video.artist,
  album: "Shared Playlist", // Add a default album or leave undefined
}));

interface IpodData {
  tracks: Track[];
  currentIndex: number;
  loopCurrent: boolean;
  loopAll: boolean;
  isShuffled: boolean;
  isPlaying: boolean;
  showVideo: boolean;
  backlightOn: boolean;
  theme: "classic" | "black";
  lcdFilterOn: boolean;
  showLyrics: boolean;
}

const initialIpodData: IpodData = {
  tracks: DEFAULT_TRACKS,
  currentIndex: 0,
  loopCurrent: false,
  loopAll: true,
  isShuffled: true,
  isPlaying: false,
  showVideo: false,
  backlightOn: true,
  theme: "classic",
  lcdFilterOn: false,
  showLyrics: false,
};

export interface IpodState extends IpodData {
  setCurrentIndex: (index: number) => void;
  toggleLoopCurrent: () => void;
  toggleLoopAll: () => void;
  toggleShuffle: () => void;
  togglePlay: () => void;
  setIsPlaying: (playing: boolean) => void;
  toggleVideo: () => void;
  toggleBacklight: () => void;
  toggleLcdFilter: () => void;
  setTheme: (theme: "classic" | "black") => void;
  addTrack: (track: Track) => void;
  clearLibrary: () => void;
  resetLibrary: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  setShowVideo: (show: boolean) => void;
  toggleLyrics: () => void;
}

const CURRENT_IPOD_STORE_VERSION = 6; // Define the current version

export const useIpodStore = create<IpodState>()(
  persist(
    (set) => ({
      ...initialIpodData,
      // --- Actions ---
      setCurrentIndex: (index) => set({ currentIndex: index }),
      toggleLoopCurrent: () =>
        set((state) => ({ loopCurrent: !state.loopCurrent })),
      toggleLoopAll: () => set((state) => ({ loopAll: !state.loopAll })),
      toggleShuffle: () => set((state) => ({ isShuffled: !state.isShuffled })),
      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      toggleVideo: () => set((state) => ({ showVideo: !state.showVideo })),
      toggleBacklight: () =>
        set((state) => ({ backlightOn: !state.backlightOn })),
      toggleLcdFilter: () =>
        set((state) => ({ lcdFilterOn: !state.lcdFilterOn })),
      setTheme: (theme) => set({ theme }),
      addTrack: (track) =>
        set((state) => ({ tracks: [...state.tracks, track] })),
      clearLibrary: () =>
        set({ tracks: [], currentIndex: -1, isPlaying: false }),
      resetLibrary: () =>
        set({
          tracks: DEFAULT_TRACKS,
          currentIndex: 0,
          isPlaying: false,
        }),
      nextTrack: () =>
        set((state) => {
          if (state.tracks.length === 0) return { currentIndex: -1 };
          let next = state.isShuffled
            ? Math.floor(Math.random() * state.tracks.length)
            : (state.currentIndex + 1) % state.tracks.length;
          if (
            state.isShuffled &&
            next === state.currentIndex &&
            state.tracks.length > 1
          ) {
            // Ensure shuffle doesn't pick the same song if possible
            next = (next + 1) % state.tracks.length;
          }
          return { currentIndex: next, isPlaying: true };
        }),
      previousTrack: () =>
        set((state) => {
          if (state.tracks.length === 0) return { currentIndex: -1 };
          const prev = state.isShuffled
            ? Math.floor(Math.random() * state.tracks.length)
            : (state.currentIndex - 1 + state.tracks.length) %
              state.tracks.length;
          return { currentIndex: prev, isPlaying: true };
        }),
      setShowVideo: (show) => set({ showVideo: show }),
      toggleLyrics: () => set((state) => ({ showLyrics: !state.showLyrics })),
    }),
    {
      name: "ryos:ipod", // Unique name for localStorage persistence
      version: CURRENT_IPOD_STORE_VERSION, // Set the current version
      partialize: (state) => ({
        // Keep tracks and originalOrder here initially for migration
        tracks: state.tracks,
        currentIndex: state.currentIndex,
        loopAll: state.loopAll,
        loopCurrent: state.loopCurrent,
        isShuffled: state.isShuffled,
        theme: state.theme,
        lcdFilterOn: state.lcdFilterOn,
        showLyrics: state.showLyrics, // Persist lyrics visibility
      }),
      migrate: (persistedState, version) => {
        let state = persistedState as IpodState; // Type assertion

        // If the persisted version is older than the current version, update defaults
        if (version < CURRENT_IPOD_STORE_VERSION) {
          console.log(
            `Migrating iPod store from version ${version} to ${CURRENT_IPOD_STORE_VERSION}`
          );
          state = {
            ...state, // Keep other persisted state
            tracks: DEFAULT_TRACKS, // Update to new defaults
            currentIndex: 0, // Reset index
            // Reset other potentially conflicting state if necessary
            isPlaying: false,
            isShuffled: state.isShuffled, // Keep shuffle preference maybe? Or reset? Let's keep it for now.
            showLyrics: state.showLyrics ?? false, // Add default for migration
          };
        }
        // Clean up potentially outdated fields if needed in future migrations
        // Example: delete state.someOldField;

        // Ensure the returned state matches the latest IpodStoreState structure
        // Remove fields not present in the latest partialize if necessary
        const partializedState = {
          tracks: state.tracks,
          currentIndex: state.currentIndex,
          loopAll: state.loopAll,
          loopCurrent: state.loopCurrent,
          isShuffled: state.isShuffled,
          theme: state.theme,
          lcdFilterOn: state.lcdFilterOn,
          showLyrics: state.showLyrics, // Persist lyrics visibility
        };

        return partializedState as IpodState; // Return the potentially migrated state
      },
      // Optional: Re-add partialize here if you want to exclude tracks/originalOrder AFTER migration
      // This prevents large defaults from always being in storage if they are static
      // partialize: (state) => ({
      //   currentIndex: state.currentIndex,
      //   loopAll: state.loopAll,
      //   loopCurrent: state.loopCurrent,
      //   isShuffled: state.isShuffled,
      //   theme: state.theme,
      //   lcdFilterOn: state.lcdFilterOn,
      //   showLyrics: state.showLyrics, // Persist lyrics visibility
      //   // Exclude tracks and originalOrder if they match defaults and you want to save space
      // }),
    }
  )
);
