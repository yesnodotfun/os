import { Soundboard, WindowPosition, WindowSize } from "../types/types";

const STORAGE_KEYS = {
  SOUNDBOARDS: "soundboards",
  WINDOW_POSITION: "windowPosition",
  WINDOW_SIZE: "windowSize",
  SELECTED_DEVICE_ID: "selectedDeviceId",
  HAS_SEEN_HELP: "hasSeenHelp",
} as const;

export const loadSoundboards = async (): Promise<Soundboard[]> => {
  const saved = localStorage.getItem(STORAGE_KEYS.SOUNDBOARDS);
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
    STORAGE_KEYS.SOUNDBOARDS,
    JSON.stringify(boardsForStorage)
  );
};

export const loadWindowPosition = (): WindowPosition => {
  const saved = localStorage.getItem(STORAGE_KEYS.WINDOW_POSITION);
  return saved ? JSON.parse(saved) : { x: 16, y: 40 };
};

export const saveWindowPosition = (position: WindowPosition): void => {
  localStorage.setItem(STORAGE_KEYS.WINDOW_POSITION, JSON.stringify(position));
};

export const loadWindowSize = (): WindowSize => {
  const saved = localStorage.getItem(STORAGE_KEYS.WINDOW_SIZE);
  return saved ? JSON.parse(saved) : { width: 800, height: 450 };
};

export const saveWindowSize = (size: WindowSize): void => {
  localStorage.setItem(STORAGE_KEYS.WINDOW_SIZE, JSON.stringify(size));
};

export const loadSelectedDeviceId = (): string => {
  return localStorage.getItem(STORAGE_KEYS.SELECTED_DEVICE_ID) || "";
};

export const saveSelectedDeviceId = (deviceId: string): void => {
  localStorage.setItem(STORAGE_KEYS.SELECTED_DEVICE_ID, deviceId);
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
  return localStorage.getItem(STORAGE_KEYS.HAS_SEEN_HELP) === "true";
};

export const saveHasSeenHelp = (): void => {
  localStorage.setItem(STORAGE_KEYS.HAS_SEEN_HELP, "true");
};
