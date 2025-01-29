import { Soundboard, WindowPosition, WindowSize } from "../types/types";

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
  },
} as const;

interface WindowState {
  position: WindowPosition;
  size: WindowSize;
}

const DEFAULT_WINDOW_STATE: WindowState = {
  position: { x: 16, y: 40 },
  size: { width: 800, height: 475 },
};

export const loadWindowState = (
  appId: keyof typeof APP_STORAGE_KEYS
): WindowState => {
  const key = APP_STORAGE_KEYS[appId].WINDOW;
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : DEFAULT_WINDOW_STATE;
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
}

export const DEFAULT_FAVORITES: Favorite[] = [
  { title: "Ryo Lu", url: "https://ryo.lu" },
  { title: "Theo Bleier", url: "https://tmb.sh" },
  { title: "Tyler Beauchamp", url: "https://tylerbeauchamp.net" },
  { title: "Sam Catania", url: "https://www.samuelcatania.com" },
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
