import { create } from "zustand";
import { persist } from "zustand/middleware";
import { LyricsAlignment, ChineseVariant, KoreanDisplay } from "@/types/lyrics";

// Define the Track type (can be shared or defined here)
export interface Track {
  id: string;
  url: string;
  title: string;
  artist?: string;
  album?: string;
  /** Offset in milliseconds to adjust lyrics timing for this track (positive = lyrics earlier) */
  lyricOffset?: number;
}

// Original video collection moved here
export const IPOD_DEFAULT_VIDEOS = [
  {
      "id": "lXd1GHJPx-A",
      "url": "https://www.youtube.com/watch?v=lXd1GHJPx-A",
      "title": "Promise",
      "artist": "Jagged Edge",
      "album": "JE Heartbreak (Explicit)",
      "lyricOffset": -6200
  },
  {
      "id": "Y_AxRCNFT2g",
      "url": "https://www.youtube.com/watch?v=Y_AxRCNFT2g",
      "title": "Supernova (House Remix)",
      "artist": "aespa (에스파)",
      "album": "Armageddon",
      "lyricOffset": -5200
  },
  {
      "id": "yP8nAoFi6JY",
      "url": "https://www.youtube.com/watch?v=yP8nAoFi6JY",
      "title": "Supernatural (Miami Bass Remix)",
      "artist": "NewJeans (뉴진스)",
      "album": "Supernatural",
      "lyricOffset": 27350
  },
  {
      "id": "1FNI1i7H1Kc",
      "url": "https://www.youtube.com/watch?v=1FNI1i7H1Kc",
      "title": "The Chase (R&B Remix)",
      "artist": "Hearts2Hearts (하츠투하츠)",
      "album": "The Chase",
      "lyricOffset": -6400
  },
  {
      "id": "LVLOwwGVVZ0",
      "url": "https://www.youtube.com/watch?v=LVLOwwGVVZ0",
      "title": "Right Now (R&B Remix)",
      "artist": "NewJeans (뉴진스)",
      "album": "Supernatural",
      "lyricOffset": -2400
  },
  {
      "id": "AGaTzDTnYGY",
      "url": "https://www.youtube.com/watch?v=AGaTzDTnYGY",
      "title": "How Sweet (UK Garage Remix)",
      "artist": "NewJeans (뉴진스)",
      "album": "How Sweet",
      "lyricOffset": 2400
  },
  {
      "id": "XJWqHmY-g9U",
      "url": "https://www.youtube.com/watch?v=XJWqHmY-g9U",
      "title": "Telephone Number",
      "artist": "Junko Ohashi (大橋純子)",
      "album": "MAGICAL",
      "lyricOffset": 2200
  },
  {
      "id": "f3zVbOMyzgE",
      "url": "https://www.youtube.com/watch?v=f3zVbOMyzgE",
      "title": "UP&DOWN",
      "artist": "임지수 (Lim Jisoo)",
      "album": "UP&DOWN",
      "lyricOffset": 2000
  },
  {
      "id": "zt0Me5qyK4g",
      "url": "https://www.youtube.com/watch?v=zt0Me5qyK4g",
      "title": "춤 (Dance)",
      "artist": "OFFONOFF",
      "album": "boy.",
      "lyricOffset": 2200
  },
  {
      "id": "T6YVgEpRU6Q",
      "url": "https://www.youtube.com/watch?v=T6YVgEpRU6Q",
      "title": "LEFT RIGHT",
      "artist": "XG",
      "album": "NEW DNA",
      "lyricOffset": -3000
  },
  {
      "id": "QiYOkmrI1jg",
      "url": "https://www.youtube.com/watch?v=QiYOkmrI1jg",
      "title": "IYKYK",
      "artist": "XG",
      "album": "IYKYK",
      "lyricOffset": 2000
  },
  {
      "id": "_wgeHqXr4Hc",
      "url": "https://www.youtube.com/watch?v=_wgeHqXr4Hc",
      "title": "나를 위해 (For Days to Come)",
      "artist": "Crush (크러쉬)",
      "album": "wonderego",
      "lyricOffset": 1000
  },
  {
      "id": "zzDpTWCGofU",
      "url": "https://www.youtube.com/watch?v=zzDpTWCGofU",
      "title": "Nirvana Blues",
      "artist": "Colde (콜드)",
      "album": "YIN",
      "lyricOffset": 1800
  },
  {
      "id": "6vDi9S2ZDYA",
      "url": "https://www.youtube.com/watch?v=6vDi9S2ZDYA",
      "title": "ETA (R&B Remix)",
      "artist": "NewJeans (뉴진스)",
      "album": "NewJeans 2nd EP 'Get Up'",
      "lyricOffset": -5200
  },
  {
      "id": "5tcBJCouOmE",
      "url": "https://youtu.be/5tcBJCouOmE",
      "title": "Hype Boy",
      "artist": "DEAN (딘)",
      "album": "New Jeans",
      "lyricOffset": 18800
  },
  {
      "id": "PO8",
      "url": "https://www.youtube.com/watch?v=HB4Rp2KKeu4",
      "title": "野子",
      "artist": "PO8",
      "album": "野子",
      "lyricOffset": 2600
  },
  {
      "id": "z-xfGoabprU",
      "url": "https://www.youtube.com/watch?v=z-xfGoabprU",
      "title": "BEBE",
      "artist": "STAYC (스테이씨)",
      "album": "BEBE",
      "lyricOffset": 2200
  },
  {
      "id": "aFrQIJ5cbRc",
      "url": "https://www.youtube.com/watch?v=aFrQIJ5cbRc",
      "title": "Know About Me",
      "artist": "NMIXX (엔믹스)",
      "album": "Fe3O4: FORWARD - EP",
      "lyricOffset": -650
  },
  {
      "id": "hJ9Wp3PO3c8",
      "url": "https://www.youtube.com/watch?v=hJ9Wp3PO3c8",
      "title": "Butterflies",
      "artist": "Hearts2Hearts (하츠투하츠)",
      "album": "The Chase - Single",
      "lyricOffset": -7000
  },
  {
      "id": "PICpEtPHyZI",
      "url": "https://www.youtube.com/watch?v=PICpEtPHyZI",
      "title": "Damn Right",
      "artist": "JENNIE",
      "album": "Ruby",
      "lyricOffset": 1200
  },
  {
      "id": "osNYssIep5w",
      "url": "https://www.youtube.com/watch?v=osNYssIep5w",
      "title": "Mantra (House Remix)",
      "artist": "JENNIE",
      "album": "Ruby",
      "lyricOffset": 2400
  },
  {
      "id": "DskqpUrvlmw",
      "url": "https://www.youtube.com/watch?v=DskqpUrvlmw",
      "title": "GPT",
      "artist": "STAYC (스테이씨)",
      "album": "GPT - Single",
      "lyricOffset": -1600
  },
  {
      "id": "Rk6aQvlmsWo",
      "url": "https://www.youtube.com/watch?v=Rk6aQvlmsWo",
      "title": "Dandelion (feat. Ruel)",
      "artist": "grentperez",
      "album": "Backflips in a Restaurant",
      "lyricOffset": -8400
  },
  {
      "id": "36wVOzmsywo",
      "url": "https://www.youtube.com/watch?v=36wVOzmsywo",
      "title": "오래오래 (FRR)",
      "artist": "george (죠지)",
      "album": "FRR",
      "lyricOffset": -4300
  },
  {
      "id": "FonjL7DQAUQ",
      "url": "https://www.youtube.com/watch?v=FonjL7DQAUQ",
      "title": "海浪 (Waves)",
      "artist": "deca joins",
      "album": "Go Slow",
      "lyricOffset": -7000
  },
  {
      "id": "3SoYkCAzMBk",
      "url": "https://www.youtube.com/watch?v=3SoYkCAzMBk",
      "title": "Can We Talk",
      "artist": "Tevin Campbell",
      "album": "I'm Ready",
      "lyricOffset": -400
  },
  {
      "id": "ZncbtRo7RXs",
      "url": "https://www.youtube.com/watch?v=ZncbtRo7RXs",
      "title": "Supernatural (Part.1)",
      "artist": "NewJeans (뉴진스)",
      "album": "Supernatural",
      "lyricOffset": 1600
  },
  {
      "id": "hgNJ_qy6LCw",
      "url": "https://www.youtube.com/watch?v=hgNJ_qy6LCw",
      "title": "ASAP",
      "artist": "NJZ",
      "album": "NewJeans 2nd EP 'Get Up'",
      "lyricOffset": 4400
  },
  {
      "id": "YYyskjq1vSc",
      "url": "https://www.youtube.com/watch?v=YYyskjq1vSc",
      "title": "New Jeans (2025)",
      "artist": "NJZ",
      "album": "NewJeans 2nd EP 'Get Up'",
      "lyricOffset": -29800
  },
  {
      "id": "WpqXjRrZqa0",
      "url": "https://www.youtube.com/watch?v=WpqXjRrZqa0",
      "title": "Cool with You (2025)",
      "artist": "NJZ",
      "album": "NewJeans 2nd EP 'Get Up'",
      "lyricOffset": 16200
  },
  {
      "id": "In7e1knX7rQ",
      "url": "https://www.youtube.com/watch?v=In7e1knX7rQ",
      "title": "ETA (feat. E SENS 이센스)",
      "artist": "NJZ",
      "album": "NewJeans 2nd EP 'Get Up'",
      "lyricOffset": -6000
  },
];

// Map default videos to tracks for the initial iPod state
const DEFAULT_TRACKS: Track[] = IPOD_DEFAULT_VIDEOS.map((video) => ({
  id: video.id,
  url: video.url,
  title: video.title,
  artist: video.artist,
  album: video.album ?? "", // Retain album if provided
  // Ensure lyricOffset is carried over if present in the default video list
  lyricOffset: (video as Partial<Track>).lyricOffset,
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
  lyricsAlignment: LyricsAlignment;
  chineseVariant: ChineseVariant;
  koreanDisplay: KoreanDisplay;
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
  lyricsAlignment: LyricsAlignment.Alternating,
  chineseVariant: ChineseVariant.Traditional,
  koreanDisplay: KoreanDisplay.Original,
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
  /** Adjust the lyric offset (in ms) for the track at the given index. */
  adjustLyricOffset: (trackIndex: number, deltaMs: number) => void;
  /** Set lyrics alignment mode */
  setLyricsAlignment: (alignment: LyricsAlignment) => void;
  /** Set Chinese character variant */
  setChineseVariant: (variant: ChineseVariant) => void;
  /** Set Korean text display mode */
  setKoreanDisplay: (display: KoreanDisplay) => void;
}

const CURRENT_IPOD_STORE_VERSION = 9; // Define the current version

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
      adjustLyricOffset: (trackIndex, deltaMs) =>
        set((state) => {
          if (
            trackIndex < 0 ||
            trackIndex >= state.tracks.length ||
            Number.isNaN(deltaMs)
          ) {
            return {} as Partial<IpodState>;
          }

          const tracks = [...state.tracks];
          const current = tracks[trackIndex];
          const newOffset = (current.lyricOffset || 0) + deltaMs;

          tracks[trackIndex] = {
            ...current,
            lyricOffset: newOffset,
          };

          return { tracks } as Partial<IpodState>;
        }),
      setLyricsAlignment: (alignment) => set({ lyricsAlignment: alignment }),
      setChineseVariant: (variant) => set({ chineseVariant: variant }),
      setKoreanDisplay: (display) => set({ koreanDisplay: display }),
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
        lyricsAlignment: state.lyricsAlignment,
        chineseVariant: state.chineseVariant,
        koreanDisplay: state.koreanDisplay,
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
            lyricsAlignment:
              state.lyricsAlignment ?? LyricsAlignment.FocusThree,
            chineseVariant: state.chineseVariant ?? ChineseVariant.Traditional,
            koreanDisplay: state.koreanDisplay ?? KoreanDisplay.Original,
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
          lyricsAlignment: state.lyricsAlignment,
          chineseVariant: state.chineseVariant,
          koreanDisplay: state.koreanDisplay,
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
