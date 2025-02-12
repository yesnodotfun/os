import { Soundboard, WindowPosition, WindowSize } from "../types/types";
import { AppManagerState, AppState } from "../apps/base/types";
import { Message } from "ai";
import { getWindowConfig, getMobileWindowSize } from "../config/appRegistry";

interface Document {
  name: string;
  content: string;
  type?: string;
  modifiedAt?: Date;
  size?: number;
}

interface TrashItem {
  name: string;
  content?: string;
  type?: string;
  isDirectory: boolean;
  originalPath: string;
  deletedAt: number;
  modifiedAt?: Date;
  size?: number;
}

export const APP_STORAGE_KEYS = {
  soundboard: {
    BOARDS: "soundboard:boards",
    WINDOW: "soundboard:window",
    SELECTED_DEVICE_ID: "soundboard:selectedDeviceId",
    HAS_SEEN_HELP: "soundboard:hasSeenHelp",
  },
  "internet-explorer": {
    WINDOW: "internet-explorer:window",
    HISTORY: "internet-explorer:history",
    FAVORITES: "internet-explorer:favorites",
    LAST_URL: "internet-explorer:last-url",
  },
  chats: {
    WINDOW: "chats:window",
    MESSAGES: "chats:messages",
    HAS_SEEN_HELP: "chats:hasSeenHelp",
  },
  textedit: {
    WINDOW: "textedit:window",
    CONTENT: "textedit:content",
    HAS_SEEN_HELP: "textedit:hasSeenHelp",
    LAST_FILE_PATH: "textedit:last-file-path",
  },
  "control-panels": {
    WINDOW: "control-panels:window",
    HAS_SEEN_HELP: "control-panels:hasSeenHelp",
    DESKTOP_VISIBLE: "control-panels:desktop-visible",
    WALLPAPER: "control-panels:wallpaper",
    UI_SOUNDS_ENABLED: "control-panels:ui-sounds-enabled",
    CHAT_SYNTH_ENABLED: "control-panels:chat-synth-enabled",
    TYPING_SYNTH_ENABLED: "control-panels:typing-synth-enabled",
    SYNTH_PRESET: "control-panels:synth-preset",
  },
  minesweeper: {
    WINDOW: "minesweeper:window",
    HAS_SEEN_HELP: "minesweeper:hasSeenHelp",
  },
  finder: {
    WINDOW: "finder:window",
    CURRENT_PATH: "finder:current-path",
    DOCUMENTS: "finder:documents",
    IMAGES: "finder:images",
    TRASH: "finder:trash",
  },
  paint: {
    WINDOW: "paint:window" as const,
    HAS_SEEN_HELP: "paint:hasSeenHelp" as const,
    LAST_FILE_PATH: "paint:lastFilePath" as const,
  },
  videos: {
    WINDOW: "videos:window" as const,
    HAS_SEEN_HELP: "videos:hasSeenHelp" as const,
    PLAYLIST: "videos:playlist" as const,
    CURRENT_INDEX: "videos:currentIndex" as const,
    IS_LOOP_ALL: "videos:isLoopAll" as const,
    IS_LOOP_CURRENT: "videos:isLoopCurrent" as const,
    IS_SHUFFLED: "videos:isShuffled" as const,
  },
} as const;

interface WindowState {
  position: WindowPosition;
  size: WindowSize;
}

export const loadWindowState = (
  appId: keyof typeof APP_STORAGE_KEYS
): WindowState => {
  const key = APP_STORAGE_KEYS[appId].WINDOW;
  const saved = localStorage.getItem(key);
  if (saved) {
    return JSON.parse(saved);
  }

  const isMobile = window.innerWidth < 768;
  const mobileY = 28; // Fixed Y position for mobile to account for menu bar
  const config = getWindowConfig(appId);

  return {
    position: {
      x: isMobile ? 0 : 16 + Object.keys(APP_STORAGE_KEYS).indexOf(appId) * 32,
      y: isMobile
        ? mobileY
        : 40 + Object.keys(APP_STORAGE_KEYS).indexOf(appId) * 20,
    },
    size: isMobile ? getMobileWindowSize(appId) : config.defaultSize,
  };
};

export const saveWindowState = (
  appId: keyof typeof APP_STORAGE_KEYS,
  state: WindowState
): void => {
  const key = APP_STORAGE_KEYS[appId].WINDOW;
  localStorage.setItem(key, JSON.stringify(state));
};

// Soundboard specific storage
export const loadSoundboards = async (): Promise<Soundboard[]> => {
  const saved = localStorage.getItem(APP_STORAGE_KEYS.soundboard.BOARDS);
  if (saved) {
    return JSON.parse(saved);
  }

  try {
    const response = await fetch("/soundboards.json");
    const data = await response.json();
    const importedBoards = data.boards || [data];
    const newBoards = importedBoards.map((board: Soundboard) => ({
      ...board,
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      slots: board.slots.map((slot) => ({
        audioData: slot.audioData,
        emoji: slot.emoji,
        title: slot.title,
      })),
    }));
    saveSoundboards(newBoards);
    return newBoards;
  } catch (error) {
    console.error("Error loading initial boards:", error);
    const defaultBoard = createDefaultBoard();
    saveSoundboards([defaultBoard]);
    return [defaultBoard];
  }
};

export const saveSoundboards = (boards: Soundboard[]): void => {
  const boardsForStorage = boards.map((board) => ({
    ...board,
    slots: board.slots.map((slot) => ({
      audioData: slot.audioData,
      emoji: slot.emoji,
      title: slot.title,
    })),
  }));
  localStorage.setItem(
    APP_STORAGE_KEYS.soundboard.BOARDS,
    JSON.stringify(boardsForStorage)
  );
};

export const loadSelectedDeviceId = (): string => {
  return (
    localStorage.getItem(APP_STORAGE_KEYS.soundboard.SELECTED_DEVICE_ID) || ""
  );
};

export const saveSelectedDeviceId = (deviceId: string): void => {
  localStorage.setItem(
    APP_STORAGE_KEYS.soundboard.SELECTED_DEVICE_ID,
    deviceId
  );
};

export const createDefaultBoard = (): Soundboard => ({
  id: "default",
  name: "New Soundboard",
  slots: Array(9).fill({
    audioData: null,
    emoji: undefined,
    title: undefined,
  }),
});

export const loadHasSeenHelp = (): boolean => {
  return (
    localStorage.getItem(APP_STORAGE_KEYS.soundboard.HAS_SEEN_HELP) === "true"
  );
};

export const saveHasSeenHelp = (): void => {
  localStorage.setItem(APP_STORAGE_KEYS.soundboard.HAS_SEEN_HELP, "true");
};

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

export const DEFAULT_FAVORITES: Favorite[] = [
  {
    title: "Apple",
    url: "https://apple.com",
    favicon: "https://www.google.com/s2/favicons?domain=apple.com&sz=32",
    year: "2002",
  },
  {
    title: "Notion",
    url: "https://notion.so",
    favicon: "https://www.google.com/s2/favicons?domain=notion.so&sz=32",
    year: "2019",
  },
  {
    title: "NewJeans",
    url: "https://newjeans.kr",
    favicon: "https://www.google.com/s2/favicons?domain=newjeans.kr&sz=32",
    year: "current",
  },
  {
    title: "Ryo",
    url: "https://ryo.lu",
    favicon: "https://www.google.com/s2/favicons?domain=ryo.lu&sz=32",
    year: "current",
  },
  {
    title: "PS7",
    url: "https://play.ryo.lu",
    favicon: "https://www.google.com/s2/favicons?domain=play.ryo.lu&sz=32",
    year: "current",
  },
  {
    title: "HyperCards",
    url: "https://hcsimulator.com",
    favicon: "https://www.google.com/s2/favicons?domain=hcsimulator.com&sz=32",
    year: "current",
  },
  {
    title: "Stephen",
    url: "https://wustep.me",
    favicon: "https://www.google.com/s2/favicons?domain=wustep.me&sz=32",
    year: "current",
  },
  {
    title: "Frank",
    url: "https://okfrank.co",
    favicon: "https://www.google.com/s2/favicons?domain=okfrank.co&sz=32",
    year: "current",
  },
  {
    title: "Tyler",
    url: "https://tylerbeauchamp.net",
    favicon:
      "https://www.google.com/s2/favicons?domain=tylerbeauchamp.net&sz=32",
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
    title: "Modi",
    url: "https://www.akm.io",
    favicon: "https://www.google.com/s2/favicons?domain=www.akm.io&sz=32",
    year: "current",
  },
  {
    title: "Lucas",
    url: "https://www.lucasn.com",
    favicon: "https://www.google.com/s2/favicons?domain=www.lucasn.com&sz=32",
    year: "current",
  },
  {
    title: "Andrew",
    url: "https://www.andrewl.ee",
    favicon: "https://www.google.com/s2/favicons?domain=www.andrewl.ee&sz=32",
    year: "current",
  },
  {
    title: "Theo",
    url: "https://tmb.sh",
    favicon: "https://www.google.com/s2/favicons?domain=tmb.sh&sz=32",
    year: "current",
  },
];

export const loadFavorites = (): Favorite[] => {
  const saved = localStorage.getItem(
    APP_STORAGE_KEYS["internet-explorer"].FAVORITES
  );
  return saved ? JSON.parse(saved) : DEFAULT_FAVORITES;
};
export const saveFavorites = (favorites: Favorite[]): void => {
  localStorage.setItem(
    APP_STORAGE_KEYS["internet-explorer"].FAVORITES,
    JSON.stringify(favorites)
  );
};

const APP_STATE_KEY = "app:state";

interface OldAppState {
  isOpen: boolean;
  position?: { x: number; y: number };
  isForeground?: boolean;
  zIndex?: number;
}

interface OldAppManagerState {
  [appId: string]: OldAppState;
}

export const loadAppState = (): AppManagerState => {
  const saved = localStorage.getItem(APP_STATE_KEY);
  // Initialize with default state for all possible apps
  const defaultState: AppManagerState = {
    windowOrder: [],
    apps: Object.keys(APP_STORAGE_KEYS).reduce(
      (acc, appId) => ({
        ...acc,
        [appId]: { isOpen: false },
      }),
      {} as { [appId: string]: AppState }
    ),
  };

  if (saved) {
    const parsedState = JSON.parse(saved) as
      | OldAppManagerState
      | AppManagerState;
    // Handle migration from old format to new format
    if (!("windowOrder" in parsedState)) {
      const oldState = parsedState as OldAppManagerState;
      return {
        windowOrder: Object.entries(oldState)
          .filter(([, state]) => state.isOpen)
          .sort((a, b) => (a[1].zIndex || 0) - (b[1].zIndex || 0))
          .map(([id]) => id),
        apps: Object.entries(oldState).reduce(
          (acc, [id, state]) => ({
            ...acc,
            [id]: {
              isOpen: state.isOpen,
              position: state.position,
              isForeground: state.isForeground,
            },
          }),
          {} as { [appId: string]: AppState }
        ),
      };
    }
    // Merge saved state with default state
    const newState = parsedState as AppManagerState;
    return {
      windowOrder: newState.windowOrder,
      apps: { ...defaultState.apps, ...newState.apps },
    };
  }
  return defaultState;
};

export const saveAppState = (state: AppManagerState): void => {
  localStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
};

// Chat specific storage
export const loadChatMessages = (): Message[] | null => {
  const saved = localStorage.getItem(APP_STORAGE_KEYS.chats.MESSAGES);
  if (!saved) return null;
  const messages = JSON.parse(saved);
  return messages.map(
    (msg: Omit<Message, "createdAt"> & { createdAt: string }) => ({
      ...msg,
      createdAt: new Date(msg.createdAt),
    })
  );
};

export const saveChatMessages = (messages: Message[]): void => {
  localStorage.setItem(
    APP_STORAGE_KEYS.chats.MESSAGES,
    JSON.stringify(messages)
  );
};

export const DEFAULT_URL = "https://apple.com";
export const DEFAULT_YEAR = "2002";

export const loadLastUrl = (): string => {
  return (
    localStorage.getItem(APP_STORAGE_KEYS["internet-explorer"].LAST_URL) ||
    DEFAULT_URL
  );
};

export const saveLastUrl = (url: string): void => {
  localStorage.setItem(APP_STORAGE_KEYS["internet-explorer"].LAST_URL, url);
};

export const loadHistory = (): HistoryEntry[] => {
  const saved = localStorage.getItem(
    APP_STORAGE_KEYS["internet-explorer"].HISTORY
  );
  return saved ? JSON.parse(saved) : [];
};

export const saveHistory = (history: HistoryEntry[]): void => {
  localStorage.setItem(
    APP_STORAGE_KEYS["internet-explorer"].HISTORY,
    JSON.stringify(history)
  );
};

export const addToHistory = (entry: Omit<HistoryEntry, "timestamp">): void => {
  const history = loadHistory();
  const newEntry = { ...entry, timestamp: Date.now() };
  history.unshift(newEntry);
  // Keep only last 100 entries
  saveHistory(history.slice(0, 100));
};

// Add new functions for wayback year
export const loadWaybackYear = (): string => {
  return (
    localStorage.getItem(
      APP_STORAGE_KEYS["internet-explorer"].LAST_URL + ":year"
    ) || DEFAULT_YEAR
  );
};

export const saveWaybackYear = (year: string): void => {
  localStorage.setItem(
    APP_STORAGE_KEYS["internet-explorer"].LAST_URL + ":year",
    year
  );
};

// Desktop icon visibility state
const DESKTOP_ICONS_KEY = "desktop:icons";

interface DesktopIconState {
  [appId: string]: {
    visible: boolean;
  };
}

const DEFAULT_DESKTOP_ICONS: DesktopIconState = {
  soundboard: { visible: true },
  "internet-explorer": { visible: true },
  chats: { visible: true },
  textedit: { visible: true },
  "control-panels": { visible: false },
  minesweeper: { visible: true },
  finder: { visible: false },
  paint: { visible: true },
  videos: { visible: true },
};

export const loadDesktopIconState = (): DesktopIconState => {
  const saved = localStorage.getItem("desktop:icons");
  if (saved) {
    return JSON.parse(saved);
  }
  return DEFAULT_DESKTOP_ICONS;
};

export const saveDesktopIconState = (state: DesktopIconState): void => {
  localStorage.setItem(DESKTOP_ICONS_KEY, JSON.stringify(state));
};

export const calculateStorageSpace = () => {
  let total = 0;
  let used = 0;

  try {
    // Estimate total space (typical quota is around 10MB)
    total = 10 * 1024 * 1024; // 10MB in bytes

    // Calculate used space
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          used += value.length * 2; // Multiply by 2 for UTF-16 encoding
        }
      }
    }
  } catch (error) {
    console.error("Error calculating storage space:", error);
  }

  return {
    total,
    used,
    available: total - used,
    percentUsed: Math.round((used / total) * 100),
  };
};

// Add new functions for control panel settings
export const loadWallpaper = (): string => {
  return (
    localStorage.getItem(APP_STORAGE_KEYS["control-panels"].WALLPAPER) ||
    "/wallpapers/photos/landscapes/palace_on_lake_in_jaipur.jpg"
  );
};

export const saveWallpaper = (wallpaperUrl: string): void => {
  localStorage.setItem(
    APP_STORAGE_KEYS["control-panels"].WALLPAPER,
    wallpaperUrl
  );
};

export const loadUISoundsEnabled = (): boolean => {
  return (
    localStorage.getItem(
      APP_STORAGE_KEYS["control-panels"].UI_SOUNDS_ENABLED
    ) !== "false"
  );
};

export const saveUISoundsEnabled = (enabled: boolean): void => {
  localStorage.setItem(
    APP_STORAGE_KEYS["control-panels"].UI_SOUNDS_ENABLED,
    enabled.toString()
  );
};

export const loadChatSynthEnabled = (): boolean => {
  return (
    localStorage.getItem(
      APP_STORAGE_KEYS["control-panels"].CHAT_SYNTH_ENABLED
    ) !== "false"
  );
};

export const saveChatSynthEnabled = (enabled: boolean): void => {
  localStorage.setItem(
    APP_STORAGE_KEYS["control-panels"].CHAT_SYNTH_ENABLED,
    enabled.toString()
  );
};

export const loadTypingSynthEnabled = (): boolean => {
  const value = localStorage.getItem(
    APP_STORAGE_KEYS["control-panels"].TYPING_SYNTH_ENABLED
  );
  return value === "true";
};

export const saveTypingSynthEnabled = (enabled: boolean): void => {
  localStorage.setItem(
    APP_STORAGE_KEYS["control-panels"].TYPING_SYNTH_ENABLED,
    enabled.toString()
  );
};

export const clearAllAppStates = (): void => {
  // Clear all app-specific storage
  localStorage.removeItem(APP_STORAGE_KEYS.soundboard.BOARDS);
  localStorage.removeItem(APP_STORAGE_KEYS.soundboard.WINDOW);
  localStorage.removeItem(APP_STORAGE_KEYS.soundboard.SELECTED_DEVICE_ID);
  localStorage.removeItem(APP_STORAGE_KEYS.soundboard.HAS_SEEN_HELP);

  localStorage.removeItem(APP_STORAGE_KEYS["internet-explorer"].WINDOW);
  localStorage.removeItem(APP_STORAGE_KEYS["internet-explorer"].HISTORY);
  localStorage.removeItem(APP_STORAGE_KEYS["internet-explorer"].FAVORITES);
  localStorage.removeItem(APP_STORAGE_KEYS["internet-explorer"].LAST_URL);

  localStorage.removeItem(APP_STORAGE_KEYS.chats.WINDOW);
  localStorage.removeItem(APP_STORAGE_KEYS.chats.MESSAGES);
  localStorage.removeItem(APP_STORAGE_KEYS.chats.HAS_SEEN_HELP);

  localStorage.removeItem(APP_STORAGE_KEYS.textedit.WINDOW);
  localStorage.removeItem(APP_STORAGE_KEYS.textedit.CONTENT);
  localStorage.removeItem(APP_STORAGE_KEYS.textedit.HAS_SEEN_HELP);
  localStorage.removeItem(APP_STORAGE_KEYS.textedit.LAST_FILE_PATH);

  localStorage.removeItem(APP_STORAGE_KEYS["control-panels"].WINDOW);
  localStorage.removeItem(APP_STORAGE_KEYS["control-panels"].HAS_SEEN_HELP);
  localStorage.removeItem(APP_STORAGE_KEYS["control-panels"].DESKTOP_VISIBLE);
  localStorage.removeItem(APP_STORAGE_KEYS["control-panels"].WALLPAPER);
  localStorage.removeItem(APP_STORAGE_KEYS["control-panels"].UI_SOUNDS_ENABLED);
  localStorage.removeItem(
    APP_STORAGE_KEYS["control-panels"].CHAT_SYNTH_ENABLED
  );
  localStorage.removeItem(
    APP_STORAGE_KEYS["control-panels"].TYPING_SYNTH_ENABLED
  );
  localStorage.removeItem(APP_STORAGE_KEYS["control-panels"].SYNTH_PRESET);

  localStorage.removeItem(APP_STORAGE_KEYS.minesweeper.WINDOW);
  localStorage.removeItem(APP_STORAGE_KEYS.minesweeper.HAS_SEEN_HELP);

  localStorage.removeItem(APP_STORAGE_KEYS.finder.WINDOW);
  localStorage.removeItem(APP_STORAGE_KEYS.finder.CURRENT_PATH);
  localStorage.removeItem(APP_STORAGE_KEYS.finder.DOCUMENTS);
  localStorage.removeItem(APP_STORAGE_KEYS.finder.IMAGES);
  localStorage.removeItem(APP_STORAGE_KEYS.finder.TRASH);

  localStorage.removeItem(APP_STORAGE_KEYS.paint.WINDOW);
  localStorage.removeItem(APP_STORAGE_KEYS.paint.HAS_SEEN_HELP);

  localStorage.removeItem(APP_STORAGE_KEYS.videos.WINDOW);
  localStorage.removeItem(APP_STORAGE_KEYS.videos.HAS_SEEN_HELP);
  localStorage.removeItem(APP_STORAGE_KEYS.videos.PLAYLIST);
  localStorage.removeItem(APP_STORAGE_KEYS.videos.CURRENT_INDEX);
  localStorage.removeItem(APP_STORAGE_KEYS.videos.IS_LOOP_ALL);
  localStorage.removeItem(APP_STORAGE_KEYS.videos.IS_LOOP_CURRENT);
  localStorage.removeItem(APP_STORAGE_KEYS.videos.IS_SHUFFLED);

  // Clear desktop icon state
  localStorage.removeItem("desktop:icons");

  // Clear app manager state
  localStorage.removeItem("app:state");
};

const SYNTH_PRESET_KEY = "synthPreset";

export function loadSynthPreset(): string | null {
  return localStorage.getItem(SYNTH_PRESET_KEY);
}

export function saveSynthPreset(preset: string): void {
  localStorage.setItem(SYNTH_PRESET_KEY, preset);
}

export const loadDocuments = (): Document[] => {
  const saved = localStorage.getItem(APP_STORAGE_KEYS.finder.DOCUMENTS);
  if (saved) {
    return JSON.parse(saved);
  }
  return [
    {
      name: "README.md",
      content: `# ryOS\n\nA web-based operating system experience...`,
      type: "markdown",
    },
    {
      name: "Quick Tips.md",
      content: `# Quick Tips\n\n## Using Apps...`,
      type: "markdown",
    },
  ];
};

export const saveDocuments = (docs: Document[]): void => {
  localStorage.setItem(APP_STORAGE_KEYS.finder.DOCUMENTS, JSON.stringify(docs));
};

export const loadImages = (): Document[] => {
  const saved = localStorage.getItem(APP_STORAGE_KEYS.finder.IMAGES);
  return saved ? JSON.parse(saved) : [];
};

export const saveImages = (images: Document[]): void => {
  localStorage.setItem(APP_STORAGE_KEYS.finder.IMAGES, JSON.stringify(images));
};

export const loadTrashItems = (): TrashItem[] => {
  const saved = localStorage.getItem(APP_STORAGE_KEYS.finder.TRASH);
  return saved ? JSON.parse(saved) : [];
};

export const saveTrashItems = (items: TrashItem[]): void => {
  localStorage.setItem(APP_STORAGE_KEYS.finder.TRASH, JSON.stringify(items));
};

// Videos playlist storage
export interface Video {
  id: string;
  url: string;
  title: string;
}

const DEFAULT_VIDEOS: Video[] = [
  {
    id: "YYyskjq1vSc",
    url: "https://www.youtube.com/watch?v=YYyskjq1vSc",
    title: "NJZ - New Jeans (2025)",
  },
  {
    id: "GYLUSHZl8M0",
    url: "https://www.youtube.com/watch?v=GYLUSHZl8M0",
    title: "ditto",
  },
  {
    id: "pSUydWEqKwE",
    url: "https://www.youtube.com/watch?v=pSUydWEqKwE",
    title: "NewJeans 'Ditto' (side A)",
  },
  {
    id: "ZncbtRo7RXs",
    url: "https://www.youtube.com/watch?v=ZncbtRo7RXs",
    title: "NewJeans 'Supernatural' (Part.1)",
  },
  {
    id: "L_OgLK3fmc8",
    url: "https://www.youtube.com/watch?v=L_OgLK3fmc8",
    title: "DEAN & 하니 - Skrr (A.I. cover)",
  },
  {
    id: "Q3K0TOvTOno",
    url: "https://www.youtube.com/watch?v=Q3K0TOvTOno",
    title: "NewJeans 'How Sweet'",
  },
  {
    id: "FonjL7DQAUQ",
    url: "https://www.youtube.com/watch?v=FonjL7DQAUQ",
    title: "deca joins 海浪",
  },
  {
    id: "jKnLSg83Nqc",
    url: "https://www.youtube.com/watch?v=jKnLSg83Nqc",
    title: "Crush 'ㅠ.ㅠ (You)'",
  },
  {
    id: "_wgeHqXr4Hc",
    url: "https://www.youtube.com/watch?v=_wgeHqXr4Hc",
    title: "Crush '나를 위해 (For Days to Come)'",
  },
];

export const loadPlaylist = (): Video[] => {
  const saved = localStorage.getItem(APP_STORAGE_KEYS.videos.PLAYLIST);
  return saved ? JSON.parse(saved) : DEFAULT_VIDEOS;
};

export const savePlaylist = (playlist: Video[]): void => {
  localStorage.setItem(
    APP_STORAGE_KEYS.videos.PLAYLIST,
    JSON.stringify(playlist)
  );
};

export const loadCurrentIndex = (): number => {
  const saved = localStorage.getItem(APP_STORAGE_KEYS.videos.CURRENT_INDEX);
  return saved ? parseInt(saved) : 0;
};

export const saveCurrentIndex = (index: number): void => {
  localStorage.setItem(APP_STORAGE_KEYS.videos.CURRENT_INDEX, index.toString());
};

export const loadIsLoopAll = (): boolean => {
  const saved = localStorage.getItem(APP_STORAGE_KEYS.videos.IS_LOOP_ALL);
  return saved === null ? true : saved === "true";
};

export const saveIsLoopAll = (isLoopAll: boolean): void => {
  localStorage.setItem(
    APP_STORAGE_KEYS.videos.IS_LOOP_ALL,
    isLoopAll.toString()
  );
};

export const loadIsLoopCurrent = (): boolean => {
  return (
    localStorage.getItem(APP_STORAGE_KEYS.videos.IS_LOOP_CURRENT) === "true"
  );
};

export const saveIsLoopCurrent = (isLoopCurrent: boolean): void => {
  localStorage.setItem(
    APP_STORAGE_KEYS.videos.IS_LOOP_CURRENT,
    isLoopCurrent.toString()
  );
};

export const loadIsShuffled = (): boolean => {
  const saved = localStorage.getItem(APP_STORAGE_KEYS.videos.IS_SHUFFLED);
  return saved === null ? true : saved === "true";
};

export const saveIsShuffled = (isShuffled: boolean): void => {
  localStorage.setItem(
    APP_STORAGE_KEYS.videos.IS_SHUFFLED,
    isShuffled.toString()
  );
};
