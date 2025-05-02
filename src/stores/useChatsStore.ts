import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { type Message } from "ai/react";
import { type ChatRoom, type ChatMessage } from "@/types/chat";
import { APP_STORAGE_KEYS, loadChatMessages, loadChatRoomUsername, loadLastOpenedRoomId, loadChatSidebarVisible, loadCachedChatRooms /*, loadCachedRoomMessages */ } from "@/utils/storage"; // Import old loaders for migration

// Define the state structure
export interface ChatsStoreState {
    // AI Chat State
    aiMessages: Message[];
    // Room State
    username: string | null;
    rooms: ChatRoom[];
    currentRoomId: string | null; // ID of the currently selected room, null for AI chat (@ryo)
    roomMessages: Record<string, ChatMessage[]>; // roomId -> messages map
    // UI State
    isSidebarVisible: boolean;
    isAdmin: boolean;

    // Actions
    setAiMessages: (messages: Message[]) => void;
    setUsername: (username: string | null) => void;
    setRooms: (rooms: ChatRoom[]) => void;
    setCurrentRoomId: (roomId: string | null) => void;
    setRoomMessagesForCurrentRoom: (messages: ChatMessage[]) => void; // Sets messages for the *current* room
    addMessageToRoom: (roomId: string, message: ChatMessage) => void;
    removeMessageFromRoom: (roomId: string, messageId: string) => void;
    clearRoomMessages: (roomId: string) => void; // Clears messages for a specific room
    toggleSidebarVisibility: () => void;
    reset: () => void; // Reset store to initial state
}

const initialAiMessage: Message = {
    id: "1",
    role: "assistant",
    content: "👋 hey! i'm ryo. ask me anything!",
    createdAt: new Date(),
};

const getInitialState = (): Omit<ChatsStoreState, 'isAdmin' | 'reset' | 'setAiMessages' | 'setUsername' | 'setRooms' | 'setCurrentRoomId' | 'setRoomMessagesForCurrentRoom' | 'addMessageToRoom' | 'removeMessageFromRoom' | 'clearRoomMessages' | 'toggleSidebarVisibility'> => ({
    aiMessages: [initialAiMessage],
    username: null,
    rooms: [],
    currentRoomId: null,
    roomMessages: {},
    isSidebarVisible: true,
});

const STORE_VERSION = 1;
const STORE_NAME = "ryos:chats";

export const useChatsStore = create<ChatsStoreState>()(
    persist(
        (set, get) => ({
            ...getInitialState(),
            isAdmin: false, // Initial value, will update based on username

            // --- Actions ---
            setAiMessages: (messages) => set({ aiMessages: messages }),
            setUsername: (username) => set({ username, isAdmin: username === 'ryo' }), // Update isAdmin when username changes
            setRooms: (newRooms) => {
                // Ensure incoming data is an array
                if (!Array.isArray(newRooms)) {
                  console.warn("[ChatsStore] Attempted to set rooms with a non-array value:", newRooms);
                  return; // Ignore non-array updates
                }

                // Deep comparison to prevent unnecessary updates
                const currentRooms = get().rooms;
                if (JSON.stringify(currentRooms) === JSON.stringify(newRooms)) {
                    console.log("[ChatsStore] setRooms skipped: newRooms are identical to current rooms.");
                    return; // Skip update if rooms haven't actually changed
                }

                console.log("[ChatsStore] setRooms called. Updating rooms.");
                set({ rooms: newRooms });
            },
            setCurrentRoomId: (roomId) => set({ currentRoomId: roomId }),
            setRoomMessagesForCurrentRoom: (messages) => {
                const currentRoomId = get().currentRoomId;
                if (currentRoomId) {
                    set((state) => ({
                        roomMessages: {
                            ...state.roomMessages,
                            [currentRoomId]: messages.sort((a, b) => a.timestamp - b.timestamp),
                        },
                    }));
                }
            },
            addMessageToRoom: (roomId, message) => {
                set((state) => {
                    const existingMessages = state.roomMessages[roomId] || [];
                    // Avoid duplicates from Pusher echos or optimistic updates
                    if (existingMessages.some(m => m.id === message.id)) {
                        return {}; // No change needed
                    }
                    // Handle potential replacement of temp message ID if server ID matches
                    const tempIdPattern = /^temp_/; // Or use the actual temp ID if passed
                    const messagesWithoutTemp = existingMessages.filter(m => !(tempIdPattern.test(m.id) && m.content === message.content && m.username === message.username));

                    return {
                        roomMessages: {
                            ...state.roomMessages,
                            [roomId]: [...messagesWithoutTemp, message].sort((a, b) => a.timestamp - b.timestamp),
                        },
                    };
                });
            },
            removeMessageFromRoom: (roomId, messageId) => {
                set((state) => {
                    const existingMessages = state.roomMessages[roomId] || [];
                    const updatedMessages = existingMessages.filter(m => m.id !== messageId);
                    // Only update if a message was actually removed
                    if (updatedMessages.length < existingMessages.length) {
                        return {
                            roomMessages: {
                                ...state.roomMessages,
                                [roomId]: updatedMessages,
                            },
                        };
                    }
                    return {}; // No change needed
                });
            },
            clearRoomMessages: (roomId) => {
                 set((state) => ({
                    roomMessages: {
                        ...state.roomMessages,
                        [roomId]: [],
                    },
                }));
            },
            toggleSidebarVisibility: () => set((state) => ({
                 isSidebarVisible: !state.isSidebarVisible
            })),
            reset: () => set(getInitialState()),
        }),
        {
            name: STORE_NAME,
            version: STORE_VERSION,
            storage: createJSONStorage(() => localStorage), // Use localStorage
            partialize: (state) => ({
                // Select properties to persist
                aiMessages: state.aiMessages,
                username: state.username,
                currentRoomId: state.currentRoomId,
                isSidebarVisible: state.isSidebarVisible,
                rooms: state.rooms, // Persist rooms list
                roomMessages: state.roomMessages, // Persist room messages cache
            }),
            // --- Migration from old localStorage keys ---
            migrate: (persistedState, version) => {
                console.log("[ChatsStore] Migrate function started. Version:", version, "Persisted state exists:", !!persistedState);
                if (persistedState) {
                  console.log("[ChatsStore] Persisted state type for rooms:", typeof (persistedState as ChatsStoreState).rooms, "Is Array:", Array.isArray((persistedState as ChatsStoreState).rooms));
                }

                if (version < STORE_VERSION && !persistedState) {
                    console.log(`[ChatsStore] Migrating from old localStorage keys to version ${STORE_VERSION}...`);
                    try {
                        const migratedState: Partial<ChatsStoreState> = {};

                        const oldAiMessages = loadChatMessages();
                        if (oldAiMessages) migratedState.aiMessages = oldAiMessages;

                        const oldUsername = loadChatRoomUsername();
                        if (oldUsername) migratedState.username = oldUsername;

                        const oldCurrentRoomId = loadLastOpenedRoomId();
                        if (oldCurrentRoomId) migratedState.currentRoomId = oldCurrentRoomId;

                        const oldSidebarVisible = loadChatSidebarVisible();
                        // Check if it's explicitly false, otherwise default to true (initial state)
                        if (oldSidebarVisible === false) migratedState.isSidebarVisible = false;

                        const oldCachedRooms = loadCachedChatRooms();
                        if (oldCachedRooms) migratedState.rooms = oldCachedRooms;

                        const oldCachedRoomMessages = localStorage.getItem(APP_STORAGE_KEYS.chats.CACHED_ROOM_MESSAGES);
                        if (oldCachedRoomMessages) {
                             try {
                                migratedState.roomMessages = JSON.parse(oldCachedRoomMessages);
                            } catch (e) { console.warn("Failed to parse old cached room messages during migration", e); }
                        }

                        console.log("[ChatsStore] Migration data:", migratedState);

                        // Clean up old keys after successful migration attempt
                        // We might want to delay this until after the store is fully initialized
                        // Or do it manually after confirming migration works.
                        // localStorage.removeItem(APP_STORAGE_KEYS.chats.MESSAGES);
                        // localStorage.removeItem(APP_STORAGE_KEYS.chats.CHAT_ROOM_USERNAME);
                        // localStorage.removeItem(APP_STORAGE_KEYS.chats.LAST_OPENED_ROOM_ID);
                        // localStorage.removeItem(APP_STORAGE_KEYS.chats.SIDEBAR_VISIBLE);
                        // localStorage.removeItem(APP_STORAGE_KEYS.chats.CACHED_ROOMS);
                        // localStorage.removeItem(APP_STORAGE_KEYS.chats.CACHED_ROOM_MESSAGES);
                        // console.log("[ChatsStore] Old localStorage keys potentially removed.");

                        const finalMigratedState = { ...getInitialState(), ...migratedState } as ChatsStoreState;
                        console.log("[ChatsStore] Final migrated state:", finalMigratedState);
                        console.log("[ChatsStore] Migrated rooms type:", typeof finalMigratedState.rooms, "Is Array:", Array.isArray(finalMigratedState.rooms));
                        return finalMigratedState;
                    } catch (e) {
                        console.error("[ChatsStore] Migration failed:", e);
                    }
                }
                // If persistedState exists, use it (already in new format or newer version)
                // Ensure isAdmin is recalculated on load
                if (persistedState) {
                     console.log("[ChatsStore] Using persisted state.");
                     const state = persistedState as ChatsStoreState;
                     const finalState = { ...state, isAdmin: state.username === 'ryo' };
                     console.log("[ChatsStore] Final state from persisted:", finalState);
                     console.log("[ChatsStore] Persisted state rooms type:", typeof finalState.rooms, "Is Array:", Array.isArray(finalState.rooms));
                     return finalState;
                }
                // Fallback to initial state if migration fails or no persisted state
                console.log("[ChatsStore] Falling back to initial state.");
                return { ...getInitialState(), isAdmin: false } as ChatsStoreState;
            },
        }
    )
); 