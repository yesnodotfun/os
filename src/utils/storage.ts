import { Soundboard, WindowPosition, WindowSize } from "../types/types";
import { AppManagerState } from "../apps/base/types";
import { Message } from "ai";

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
  },
  "control-panels": {
    WINDOW: "control-panels:window",
    HAS_SEEN_HELP: "control-panels:hasSeenHelp",
  },
  minesweeper: {
    WINDOW: "minesweeper:window",
    HAS_SEEN_HELP: "minesweeper:hasSeenHelp",
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
  const mobileY = 40; // Fixed Y position for mobile to account for menu bar

  // Default window positions and sizes for specific apps
  switch (appId) {
    case "textedit":
      return {
        position: { x: isMobile ? 0 : 16, y: isMobile ? mobileY : 40 },
        size: { width: isMobile ? window.innerWidth : 520, height: 475 },
      };
    case "internet-explorer":
      return {
        position: { x: isMobile ? 0 : 48, y: isMobile ? mobileY : 80 },
        size: { width: isMobile ? window.innerWidth : 800, height: 475 },
      };
    case "chats":
      return {
        position: { x: isMobile ? 0 : 80, y: isMobile ? mobileY : 120 },
        size: { width: isMobile ? window.innerWidth : 280, height: 475 },
      };
    case "soundboard":
      return {
        position: { x: isMobile ? 0 : 112, y: isMobile ? mobileY : 160 },
        size: { width: isMobile ? window.innerWidth : 800, height: 475 },
      };
    case "control-panels":
      return {
        position: { x: isMobile ? 0 : 144, y: isMobile ? mobileY : 200 },
        size: { width: isMobile ? window.innerWidth : 480, height: 400 },
      };
    case "minesweeper":
      return {
        position: { x: isMobile ? 0 : 176, y: isMobile ? mobileY : 240 },
        size: { width: isMobile ? window.innerWidth : 305, height: 400 },
      };
    default:
      return {
        position: { x: isMobile ? 0 : 16, y: isMobile ? mobileY : 40 },
        size: { width: isMobile ? window.innerWidth : 800, height: 475 },
      };
  }
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

export const loadAppState = (): AppManagerState => {
  const saved = localStorage.getItem(APP_STATE_KEY);
  if (saved) {
    return JSON.parse(saved);
  }
  return {};
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
