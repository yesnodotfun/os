import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Soundboard, SoundSlot, PlaybackState } from "@/types/types";
import { loadSelectedDeviceId, saveSelectedDeviceId } from "@/utils/storage";

// Helper to create a default soundboard
const createDefaultBoard = (): Soundboard => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2),
  name: "New Soundboard",
  slots: Array(9).fill({
    audioData: null,
    emoji: undefined,
    title: undefined,
  }) as SoundSlot[],
});

export interface SoundboardStoreState {
  boards: Soundboard[];
  activeBoardId: string | null;
  playbackStates: PlaybackState[];
  selectedDeviceId: string | null;

  // Actions
  initializeBoards: () => Promise<void>;
  addNewBoard: () => void;
  updateBoardName: (boardId: string, name: string) => void;
  deleteBoard: (boardId: string) => void;
  setActiveBoardId: (boardId: string | null) => void;
  setSelectedDeviceId: (deviceId: string) => void;
  updateSlot: (boardId: string, slotIndex: number, updates: Partial<SoundSlot>) => void;
  deleteSlot: (boardId: string, slotIndex: number) => void;
  setSlotPlaybackState: (slotIndex: number, isPlaying: boolean, isRecording?: boolean) => void;
  resetSoundboardStore: () => void;
  _setBoards_internal: (boards: Soundboard[]) => void;
}

const SOUNDBOARD_STORE_VERSION = 1;
const SOUNDBOARD_STORE_NAME = "ryos:soundboard";

export const useSoundboardStore = create<SoundboardStoreState>()(
  persist(
    (set, get) => ({
      boards: [],
      activeBoardId: null,
      playbackStates: Array(9).fill({ isRecording: false, isPlaying: false }) as PlaybackState[],
      selectedDeviceId: null,

      initializeBoards: async () => {
        const currentBoards = get().boards;
        const currentSelectedDeviceId = loadSelectedDeviceId();
        if (currentSelectedDeviceId) {
          set({ selectedDeviceId: currentSelectedDeviceId });
        }

        if (currentBoards.length === 0) {
          try {
            const response = await fetch("/soundboards.json");
            if (!response.ok) throw new Error("Failed to fetch soundboards.json status: " + response.status);
            const data = await response.json();
            const importedBoardsRaw = data.boards || (Array.isArray(data) ? data : [data]);

            const importedBoards = importedBoardsRaw.map((boardData: any) => ({
              id: boardData.id || Date.now().toString() + Math.random().toString(36).slice(2),
              name: boardData.name || "Imported Soundboard",
              slots: (boardData.slots || Array(9).fill(null)).map((slotData: any) => ({
                audioData: slotData?.audioData || null,
                emoji: slotData?.emoji || undefined,
                title: slotData?.title || undefined,
              })),
            })) as Soundboard[];

            if (importedBoards.length > 0) {
              set({ boards: importedBoards, activeBoardId: importedBoards[0].id });
            } else {
              const defaultBoard = createDefaultBoard();
              set({ boards: [defaultBoard], activeBoardId: defaultBoard.id });
            }
          } catch (error) {
            console.error("Error loading initial soundboards, creating default:", error);
            const defaultBoard = createDefaultBoard();
            set({ boards: [defaultBoard], activeBoardId: defaultBoard.id });
          }
        } else if (!get().activeBoardId && currentBoards.length > 0) {
          set({ activeBoardId: currentBoards[0].id });
        }
      },

      addNewBoard: () => {
        const newBoard = createDefaultBoard();
        set((state) => ({
          boards: [...state.boards, newBoard],
          activeBoardId: newBoard.id,
        }));
      },

      updateBoardName: (boardId, name) => {
        set((state) => ({
          boards: state.boards.map((board) =>
            board.id === boardId ? { ...board, name } : board
          ),
        }));
      },

      deleteBoard: (boardId) => {
        set((state) => {
          const newBoards = state.boards.filter((b) => b.id !== boardId);
          let newActiveBoardId = state.activeBoardId;
          if (state.activeBoardId === boardId) {
            newActiveBoardId = newBoards.length > 0 ? newBoards[0].id : null;
          }
          return { boards: newBoards, activeBoardId: newActiveBoardId };
        });
      },

      setActiveBoardId: (boardId) => set({ activeBoardId: boardId }),

      setSelectedDeviceId: (deviceId) => {
        set({ selectedDeviceId: deviceId });
        saveSelectedDeviceId(deviceId);
      },

      updateSlot: (boardId, slotIndex, updates) => {
        set((state) => ({
          boards: state.boards.map((board) => {
            if (board.id === boardId) {
              const newSlots = [...board.slots];
              const currentSlot = newSlots[slotIndex] || {};
              newSlots[slotIndex] = { ...currentSlot, ...updates };
              if ('waveform' in updates) { // Ensure non-serializable data isn't persisted
                delete (newSlots[slotIndex] as any).waveform;
              }
              return { ...board, slots: newSlots };
            }
            return board;
          }),
        }));
      },

      deleteSlot: (boardId, slotIndex) => {
        get().updateSlot(boardId, slotIndex, {
          audioData: null,
          emoji: undefined,
          title: undefined,
        });
      },

      setSlotPlaybackState: (slotIndex, isPlaying, isRecording) => {
        set((state) => {
          const newPlaybackStates = [...state.playbackStates];
          const currentState = newPlaybackStates[slotIndex] || { isPlaying: false, isRecording: false };
          newPlaybackStates[slotIndex] = {
            isPlaying,
            isRecording: isRecording === undefined ? currentState.isRecording : isRecording,
          };
          return { playbackStates: newPlaybackStates };
        });
      },
      
      resetSoundboardStore: () => {
        const defaultBoard = createDefaultBoard();
        set({ 
          boards: [defaultBoard], 
          activeBoardId: defaultBoard.id, 
          playbackStates: Array(9).fill({ isRecording: false, isPlaying: false }),
          selectedDeviceId: null
        });
      },

      _setBoards_internal: (boards) => set({ boards }),
    }),
    {
      name: SOUNDBOARD_STORE_NAME,
      version: SOUNDBOARD_STORE_VERSION,
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error("Error rehydrating soundboard store:", error);
          } else if (state) {
            if (!state.selectedDeviceId) {
              const storedDeviceId = loadSelectedDeviceId();
              if (storedDeviceId) {
                state.selectedDeviceId = storedDeviceId;
              }
            }
            if (!state.boards || state.boards.length === 0) {
              Promise.resolve(state.initializeBoards()).catch(err => console.error("Initialization failed on rehydrate", err));
            } else {
              if (state.activeBoardId && !state.boards.find(b => b.id === state.activeBoardId)) {
                state.activeBoardId = state.boards.length > 0 ? state.boards[0].id : null;
              } else if (!state.activeBoardId && state.boards.length > 0) {
                state.activeBoardId = state.boards[0].id;
              }
              if (!state.playbackStates || state.playbackStates.length !== 9 || !state.playbackStates.every(ps => typeof ps === 'object' && 'isPlaying' in ps && 'isRecording' in ps)) {
                  state.playbackStates = Array(9).fill({ isRecording: false, isPlaying: false });
              }
            }
          }
        };
      },
    }
  )
); 