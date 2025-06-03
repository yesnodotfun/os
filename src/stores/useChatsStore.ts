import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { type Message } from "ai/react";
import { type ChatRoom, type ChatMessage } from "@/types/chat";

// Recovery mechanism - uses different prefix to avoid reset
const USERNAME_RECOVERY_KEY = "_usr_recovery_key_";
const AUTH_TOKEN_RECOVERY_KEY = "_auth_recovery_key_";

// API Response Types
interface ApiMessage {
  id: string;
  roomId: string;
  username: string;
  content: string;
  timestamp: string | number;
}

interface CreateRoomPayload {
  type: "public" | "private";
  name?: string;
  members?: string[];
}

// Simple encoding/decoding functions
const encode = (value: string): string => {
  return btoa(value.split("").reverse().join(""));
};

const decode = (encoded: string): string | null => {
  try {
    return atob(encoded).split("").reverse().join("");
  } catch (e) {
    console.error("[ChatsStore] Failed to decode value:", e);
    return null;
  }
};

// Username recovery functions
const encodeUsername = (username: string): string => encode(username);
const decodeUsername = (encoded: string): string | null => decode(encoded);

const saveUsernameToRecovery = (username: string | null) => {
  if (username) {
    localStorage.setItem(USERNAME_RECOVERY_KEY, encodeUsername(username));
  }
};

const getUsernameFromRecovery = (): string | null => {
  const encoded = localStorage.getItem(USERNAME_RECOVERY_KEY);
  if (encoded) {
    return decodeUsername(encoded);
  }
  return null;
};

// Auth token recovery functions
const saveAuthTokenToRecovery = (token: string | null) => {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_RECOVERY_KEY, encode(token));
  } else {
    localStorage.removeItem(AUTH_TOKEN_RECOVERY_KEY);
  }
};

const getAuthTokenFromRecovery = (): string | null => {
  const encoded = localStorage.getItem(AUTH_TOKEN_RECOVERY_KEY);
  if (encoded) {
    return decode(encoded);
  }
  return null;
};

// Ensure recovery keys are set if values exist in store but not in recovery
const ensureRecoveryKeysAreSet = (
  username: string | null,
  authToken: string | null
) => {
  if (username && !localStorage.getItem(USERNAME_RECOVERY_KEY)) {
    console.log(
      "[ChatsStore] Setting recovery key for existing username:",
      username
    );
    saveUsernameToRecovery(username);
  }
  if (authToken && !localStorage.getItem(AUTH_TOKEN_RECOVERY_KEY)) {
    console.log("[ChatsStore] Setting recovery key for existing auth token");
    saveAuthTokenToRecovery(authToken);
  }
};

// Define the state structure
export interface ChatsStoreState {
  // AI Chat State
  aiMessages: Message[];
  // Room State
  username: string | null;
  authToken: string | null; // Authentication token
  rooms: ChatRoom[];
  currentRoomId: string | null; // ID of the currently selected room, null for AI chat (@ryo)
  roomMessages: Record<string, ChatMessage[]>; // roomId -> messages map
  unreadCounts: Record<string, number>; // roomId -> unread message count
  // UI State
  isSidebarVisible: boolean;
  fontSize: number; // Add font size state

  // Actions
  setAiMessages: (messages: Message[]) => void;
  setUsername: (username: string | null) => void;
  setAuthToken: (token: string | null) => void; // Set auth token
  setRooms: (rooms: ChatRoom[]) => void;
  setCurrentRoomId: (roomId: string | null) => void;
  setRoomMessagesForCurrentRoom: (messages: ChatMessage[]) => void; // Sets messages for the *current* room
  addMessageToRoom: (roomId: string, message: ChatMessage) => void;
  removeMessageFromRoom: (roomId: string, messageId: string) => void;
  clearRoomMessages: (roomId: string) => void; // Clears messages for a specific room
  toggleSidebarVisibility: () => void;
  setFontSize: (size: number | ((prevSize: number) => number)) => void; // Add font size action
  ensureAuthToken: () => Promise<{ ok: boolean; error?: string }>; // Add auth token generation

  // Room Management Actions
  fetchRooms: () => Promise<{ ok: boolean; error?: string }>;
  fetchMessagesForRoom: (
    roomId: string
  ) => Promise<{ ok: boolean; error?: string }>;
  switchRoom: (
    roomId: string | null
  ) => Promise<{ ok: boolean; error?: string }>;
  createRoom: (
    name: string,
    type?: "public" | "private",
    members?: string[]
  ) => Promise<{ ok: boolean; error?: string; roomId?: string }>;
  deleteRoom: (roomId: string) => Promise<{ ok: boolean; error?: string }>;
  sendMessage: (
    roomId: string,
    content: string
  ) => Promise<{ ok: boolean; error?: string }>;
  createUser: (username: string) => Promise<{ ok: boolean; error?: string }>;

  incrementUnread: (roomId: string) => void;
  clearUnread: (roomId: string) => void;

  reset: () => void; // Reset store to initial state
}

const initialAiMessage: Message = {
  id: "1",
  role: "assistant",
  content: "👋 hey! i'm ryo. ask me anything!",
  createdAt: new Date(),
};

const getInitialState = (): Omit<
  ChatsStoreState,
  | "isAdmin"
  | "reset"
  | "setAiMessages"
  | "setUsername"
  | "setAuthToken"
  | "setRooms"
  | "setCurrentRoomId"
  | "setRoomMessagesForCurrentRoom"
  | "addMessageToRoom"
  | "removeMessageFromRoom"
  | "clearRoomMessages"
  | "toggleSidebarVisibility"
  | "setFontSize"
  | "ensureAuthToken"
  | "fetchRooms"
  | "fetchMessagesForRoom"
  | "switchRoom"
  | "createRoom"
  | "deleteRoom"
  | "sendMessage"
  | "createUser"
  | "incrementUnread"
  | "clearUnread"
> => {
  // Try to recover username and auth token if available
  const recoveredUsername = getUsernameFromRecovery();
  const recoveredAuthToken = getAuthTokenFromRecovery();

  return {
    aiMessages: [initialAiMessage],
    username: recoveredUsername,
    authToken: recoveredAuthToken,
    rooms: [],
    currentRoomId: null,
    roomMessages: {},
    unreadCounts: {},
    isSidebarVisible: true,
    fontSize: 13, // Default font size
  };
};

const STORE_VERSION = 2;
const STORE_NAME = "ryos:chats";

export const useChatsStore = create<ChatsStoreState>()(
  persist(
    (set, get) => {
      // Get initial state
      const initialState = getInitialState();
      // Ensure recovery keys are set if values exist
      ensureRecoveryKeysAreSet(initialState.username, initialState.authToken);

      return {
        ...initialState,

        // --- Actions ---
        setAiMessages: (messages) => set({ aiMessages: messages }),
        setUsername: (username) => {
          // Save username to recovery storage when it's set
          saveUsernameToRecovery(username);
          set({ username });
        },
        setAuthToken: (token) => {
          // Save auth token to recovery storage when it's set
          saveAuthTokenToRecovery(token);
          set({ authToken: token });
        },
        setRooms: (newRooms) => {
          // Ensure incoming data is an array
          if (!Array.isArray(newRooms)) {
            console.warn(
              "[ChatsStore] Attempted to set rooms with a non-array value:",
              newRooms
            );
            return; // Ignore non-array updates
          }

          // Deep comparison to prevent unnecessary updates
          const currentRooms = get().rooms;
          if (JSON.stringify(currentRooms) === JSON.stringify(newRooms)) {
            console.log(
              "[ChatsStore] setRooms skipped: newRooms are identical to current rooms."
            );
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
                [currentRoomId]: messages.sort(
                  (a, b) => a.timestamp - b.timestamp
                ),
              },
            }));
          }
        },
        addMessageToRoom: (roomId, message) => {
          set((state) => {
            const existingMessages = state.roomMessages[roomId] || [];
            // Avoid duplicates from Pusher echos or optimistic updates
            if (existingMessages.some((m) => m.id === message.id)) {
              return {}; // No change needed
            }
            // Handle potential replacement of temp message ID if server ID matches
            const tempIdPattern = /^temp_/; // Or use the actual temp ID if passed
            const messagesWithoutTemp = existingMessages.filter(
              (m) =>
                !(
                  tempIdPattern.test(m.id) &&
                  m.content === message.content &&
                  m.username === message.username
                )
            );

            return {
              roomMessages: {
                ...state.roomMessages,
                [roomId]: [...messagesWithoutTemp, message].sort(
                  (a, b) => a.timestamp - b.timestamp
                ),
              },
            };
          });
        },
        removeMessageFromRoom: (roomId, messageId) => {
          set((state) => {
            const existingMessages = state.roomMessages[roomId] || [];
            const updatedMessages = existingMessages.filter(
              (m) => m.id !== messageId
            );
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
        toggleSidebarVisibility: () =>
          set((state) => ({
            isSidebarVisible: !state.isSidebarVisible,
          })),
        setFontSize: (sizeOrFn) =>
          set((state) => ({
            fontSize:
              typeof sizeOrFn === "function"
                ? sizeOrFn(state.fontSize)
                : sizeOrFn,
          })),
        ensureAuthToken: async () => {
          const currentUsername = get().username;
          const currentToken = get().authToken;

          // If no username, nothing to do
          if (!currentUsername) {
            console.log(
              "[ChatsStore] No username set, skipping token generation"
            );
            return { ok: true };
          }

          // If token already exists, nothing to do
          if (currentToken) {
            console.log(
              "[ChatsStore] Auth token already exists for user:",
              currentUsername
            );
            return { ok: true };
          }

          // Username exists but no token, generate one
          console.log(
            "[ChatsStore] Generating auth token for existing user:",
            currentUsername
          );

          try {
            const response = await fetch(
              "/api/chat-rooms?action=generateToken",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ username: currentUsername }),
              }
            );

            const data = await response.json();

            if (response.ok && data.token) {
              console.log("[ChatsStore] Auth token generated successfully");
              set({ authToken: data.token });
              saveAuthTokenToRecovery(data.token);
              return { ok: true };
            } else if (response.status === 409) {
              // Token already exists on server, this shouldn't happen but handle it
              console.warn(
                "[ChatsStore] Token already exists on server for user:",
                currentUsername
              );
              return { ok: false, error: "Token already exists on server" };
            } else {
              console.error(
                "[ChatsStore] Failed to generate auth token:",
                data.error
              );
              return {
                ok: false,
                error: data.error || "Failed to generate auth token",
              };
            }
          } catch (error) {
            console.error("[ChatsStore] Error generating auth token:", error);
            return {
              ok: false,
              error: "Network error while generating auth token",
            };
          }
        },
        reset: () => {
          // Before resetting, ensure we have the username and auth token saved
          const currentUsername = get().username;
          const currentAuthToken = get().authToken;
          if (currentUsername) {
            saveUsernameToRecovery(currentUsername);
          }
          if (currentAuthToken) {
            saveAuthTokenToRecovery(currentAuthToken);
          }

          // Reset the store to initial state (which already tries to recover username and auth token)
          set(getInitialState());
        },
        fetchRooms: async () => {
          console.log("[ChatsStore] Fetching rooms...");
          const currentUsername = get().username;

          try {
            const queryParams = new URLSearchParams({ action: "getRooms" });
            if (currentUsername) {
              queryParams.append("username", currentUsername);
            }

            const response = await fetch(
              `/api/chat-rooms?${queryParams.toString()}`
            );
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({
                error: `HTTP error! status: ${response.status}`,
              }));
              return {
                ok: false,
                error: errorData.error || "Failed to fetch rooms",
              };
            }

            const data = await response.json();
            if (data.rooms && Array.isArray(data.rooms)) {
              set({ rooms: data.rooms });
              return { ok: true };
            }

            return { ok: false, error: "Invalid response format" };
          } catch (error) {
            console.error("[ChatsStore] Error fetching rooms:", error);
            return { ok: false, error: "Network error. Please try again." };
          }
        },
        fetchMessagesForRoom: async (roomId: string) => {
          if (!roomId) return { ok: false, error: "Room ID required" };

          console.log(`[ChatsStore] Fetching messages for room ${roomId}...`);

          try {
            const queryParams = new URLSearchParams({
              action: "getMessages",
              roomId,
            });

            const response = await fetch(
              `/api/chat-rooms?${queryParams.toString()}`
            );
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({
                error: `HTTP error! status: ${response.status}`,
              }));
              return {
                ok: false,
                error: errorData.error || "Failed to fetch messages",
              };
            }

            const data = await response.json();
            if (data.messages) {
              const fetchedMessages: ChatMessage[] = (data.messages || [])
                .map((msg: ApiMessage) => ({
                  ...msg,
                  timestamp:
                    typeof msg.timestamp === "string" ||
                    typeof msg.timestamp === "number"
                      ? new Date(msg.timestamp).getTime()
                      : msg.timestamp,
                }))
                .sort(
                  (a: ChatMessage, b: ChatMessage) => a.timestamp - b.timestamp
                );

              set((state) => ({
                roomMessages: {
                  ...state.roomMessages,
                  [roomId]: fetchedMessages,
                },
              }));

              return { ok: true };
            }

            return { ok: false, error: "Invalid response format" };
          } catch (error) {
            console.error(
              `[ChatsStore] Error fetching messages for room ${roomId}:`,
              error
            );
            return { ok: false, error: "Network error. Please try again." };
          }
        },
        switchRoom: async (newRoomId: string | null) => {
          const currentRoomId = get().currentRoomId;
          const username = get().username;

          console.log(
            `[ChatsStore] Switching from ${currentRoomId} to ${newRoomId}`
          );

          // Update current room immediately
          set({ currentRoomId: newRoomId });

          // Clear unread count for the room we're entering
          if (newRoomId) {
            get().clearUnread(newRoomId);
          }

          // If switching to a real room and we have a username, handle the API call
          if (username) {
            try {
              const response = await fetch(
                "/api/chat-rooms?action=switchRoom",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    previousRoomId: currentRoomId,
                    nextRoomId: newRoomId,
                    username,
                  }),
                }
              );

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({
                  error: `HTTP error! status: ${response.status}`,
                }));
                console.error("[ChatsStore] Error switching rooms:", errorData);
                // Don't revert the room change on API error, just log it
              }
            } catch (error) {
              console.error(
                "[ChatsStore] Network error switching rooms:",
                error
              );
              // Don't revert the room change on network error, just log it
            }
          }

          // Always fetch messages for the new room to ensure latest content
          if (newRoomId) {
            console.log(
              `[ChatsStore] Fetching latest messages for room ${newRoomId}`
            );
            await get().fetchMessagesForRoom(newRoomId);
          }

          return { ok: true };
        },
        createRoom: async (
          name: string,
          type: "public" | "private" = "public",
          members: string[] = []
        ) => {
          const username = get().username;
          const authToken = get().authToken;

          if (!username) {
            return { ok: false, error: "Username required" };
          }

          if (!authToken) {
            // Try to ensure auth token exists
            const tokenResult = await get().ensureAuthToken();
            if (!tokenResult.ok) {
              return { ok: false, error: "Authentication required" };
            }
          }

          try {
            const payload: CreateRoomPayload = { type };
            if (type === "public") {
              payload.name = name.trim();
            } else {
              payload.members = members;
            }

            const headers: HeadersInit = {
              "Content-Type": "application/json",
              Authorization: `Bearer ${get().authToken}`,
              "X-Username": username,
            };

            const response = await fetch("/api/chat-rooms?action=createRoom", {
              method: "POST",
              headers,
              body: JSON.stringify(payload),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({
                error: `HTTP error! status: ${response.status}`,
              }));
              return {
                ok: false,
                error: errorData.error || "Failed to create room",
              };
            }

            const data = await response.json();
            if (data.room) {
              // Room will be added via Pusher update, so we don't need to manually add it
              return { ok: true, roomId: data.room.id };
            }

            return { ok: false, error: "Invalid response format" };
          } catch (error) {
            console.error("[ChatsStore] Error creating room:", error);
            return { ok: false, error: "Network error. Please try again." };
          }
        },
        deleteRoom: async (roomId: string) => {
          const username = get().username;
          const authToken = get().authToken;

          if (!username || !authToken) {
            return { ok: false, error: "Authentication required" };
          }

          try {
            const headers: HeadersInit = {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
              "X-Username": username,
            };

            const response = await fetch(
              `/api/chat-rooms?action=deleteRoom&roomId=${roomId}`,
              {
                method: "DELETE",
                headers,
              }
            );

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({
                error: `HTTP error! status: ${response.status}`,
              }));
              return {
                ok: false,
                error: errorData.error || "Failed to delete room",
              };
            }

            // Room will be removed via Pusher update
            // If we're currently in this room, switch to @ryo
            const currentRoomId = get().currentRoomId;
            if (currentRoomId === roomId) {
              set({ currentRoomId: null });
            }

            return { ok: true };
          } catch (error) {
            console.error("[ChatsStore] Error deleting room:", error);
            return { ok: false, error: "Network error. Please try again." };
          }
        },
        sendMessage: async (roomId: string, content: string) => {
          const username = get().username;
          const authToken = get().authToken;

          if (!username || !content.trim()) {
            return { ok: false, error: "Username and content required" };
          }

          // Create optimistic message
          const tempId = `temp_${Math.random().toString(36).substring(2, 9)}`;
          const optimisticMessage: ChatMessage = {
            id: tempId,
            roomId,
            username,
            content: content.trim(),
            timestamp: Date.now(),
          };

          // Add optimistic message immediately
          get().addMessageToRoom(roomId, optimisticMessage);

          try {
            const headers: HeadersInit = {
              "Content-Type": "application/json",
            };

            if (authToken) {
              headers["Authorization"] = `Bearer ${authToken}`;
              headers["X-Username"] = username;
            }

            const response = await fetch("/api/chat-rooms?action=sendMessage", {
              method: "POST",
              headers,
              body: JSON.stringify({
                roomId,
                username,
                content: content.trim(),
              }),
            });

            if (!response.ok) {
              // Remove optimistic message on failure
              get().removeMessageFromRoom(roomId, tempId);
              const errorData = await response.json().catch(() => ({
                error: `HTTP error! status: ${response.status}`,
              }));
              return {
                ok: false,
                error: errorData.error || "Failed to send message",
              };
            }

            // Real message will be added via Pusher, which will replace the optimistic one
            return { ok: true };
          } catch (error) {
            // Remove optimistic message on failure
            get().removeMessageFromRoom(roomId, tempId);
            console.error("[ChatsStore] Error sending message:", error);
            return { ok: false, error: "Network error. Please try again." };
          }
        },
        createUser: async (username: string) => {
          const trimmedUsername = username.trim();
          if (!trimmedUsername) {
            return { ok: false, error: "Username cannot be empty" };
          }

          try {
            const response = await fetch("/api/chat-rooms?action=createUser", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username: trimmedUsername }),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({
                error: `HTTP error! status: ${response.status}`,
              }));
              return {
                ok: false,
                error: errorData.error || "Failed to create user",
              };
            }

            const data = await response.json();
            if (data.user) {
              set({ username: data.user.username });

              if (data.token) {
                set({ authToken: data.token });
                saveAuthTokenToRecovery(data.token);
              }

              return { ok: true };
            }

            return { ok: false, error: "Invalid response format" };
          } catch (error) {
            console.error("[ChatsStore] Error creating user:", error);
            return { ok: false, error: "Network error. Please try again." };
          }
        },
        incrementUnread: (roomId) => {
          set((state) => ({
            unreadCounts: {
              ...state.unreadCounts,
              [roomId]: (state.unreadCounts[roomId] || 0) + 1,
            },
          }));
        },
        clearUnread: (roomId) => {
          set((state) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [roomId]: _removed, ...rest } = state.unreadCounts;
            return { unreadCounts: rest };
          });
        },
      };
    },
    {
      name: STORE_NAME,
      version: STORE_VERSION,
      storage: createJSONStorage(() => localStorage), // Use localStorage
      partialize: (state) => ({
        // Select properties to persist
        aiMessages: state.aiMessages,
        username: state.username,
        authToken: state.authToken, // Persist auth token
        currentRoomId: state.currentRoomId,
        isSidebarVisible: state.isSidebarVisible,
        rooms: state.rooms, // Persist rooms list
        roomMessages: state.roomMessages, // Persist room messages cache
        fontSize: state.fontSize, // Persist font size
        unreadCounts: state.unreadCounts,
      }),
      // --- Migration from old localStorage keys ---
      migrate: (persistedState, version) => {
        console.log(
          "[ChatsStore] Migrate function started. Version:",
          version,
          "Persisted state exists:",
          !!persistedState
        );
        if (persistedState) {
          console.log(
            "[ChatsStore] Persisted state type for rooms:",
            typeof (persistedState as ChatsStoreState).rooms,
            "Is Array:",
            Array.isArray((persistedState as ChatsStoreState).rooms)
          );
        }

        if (version < STORE_VERSION && !persistedState) {
          console.log(
            `[ChatsStore] Migrating from old localStorage keys to version ${STORE_VERSION}...`
          );
          try {
            const migratedState: Partial<ChatsStoreState> = {};

            // Migrate AI Messages
            const oldAiMessagesRaw = localStorage.getItem("chats:messages");
            if (oldAiMessagesRaw) {
              try {
                migratedState.aiMessages = JSON.parse(oldAiMessagesRaw);
              } catch (e) {
                console.warn(
                  "Failed to parse old AI messages during migration",
                  e
                );
              }
            }

            // Migrate Username
            const oldUsernameKey = "chats:chatRoomUsername"; // Define old key
            const oldUsername = localStorage.getItem(oldUsernameKey);
            if (oldUsername) {
              migratedState.username = oldUsername;
              // Save to recovery mechanism as well
              saveUsernameToRecovery(oldUsername);
              localStorage.removeItem(oldUsernameKey); // Remove here during primary migration
              console.log(
                `[ChatsStore] Migrated and removed '${oldUsernameKey}' key during version upgrade.`
              );
            }

            // Migrate Last Opened Room ID
            const oldCurrentRoomId = localStorage.getItem(
              "chats:lastOpenedRoomId"
            );
            if (oldCurrentRoomId)
              migratedState.currentRoomId = oldCurrentRoomId;

            // Migrate Sidebar Visibility
            const oldSidebarVisibleRaw = localStorage.getItem(
              "chats:sidebarVisible"
            );
            if (oldSidebarVisibleRaw) {
              // Check if it's explicitly "false", otherwise default to true (initial state)
              migratedState.isSidebarVisible = oldSidebarVisibleRaw !== "false";
            }

            // Migrate Cached Rooms
            const oldCachedRoomsRaw = localStorage.getItem("chats:cachedRooms");
            if (oldCachedRoomsRaw) {
              try {
                migratedState.rooms = JSON.parse(oldCachedRoomsRaw);
              } catch (e) {
                console.warn(
                  "Failed to parse old cached rooms during migration",
                  e
                );
              }
            }

            // Migrate Cached Room Messages
            const oldCachedRoomMessagesRaw = localStorage.getItem(
              "chats:cachedRoomMessages"
            ); // Assuming this key
            if (oldCachedRoomMessagesRaw) {
              try {
                migratedState.roomMessages = JSON.parse(
                  oldCachedRoomMessagesRaw
                );
              } catch (e) {
                console.warn(
                  "Failed to parse old cached room messages during migration",
                  e
                );
              }
            }

            console.log("[ChatsStore] Migration data:", migratedState);

            // Clean up old keys (Optional - uncomment if desired after confirming migration)
            // localStorage.removeItem('chats:messages');
            // localStorage.removeItem('chats:lastOpenedRoomId');
            // localStorage.removeItem('chats:sidebarVisible');
            // localStorage.removeItem('chats:cachedRooms');
            // localStorage.removeItem('chats:cachedRoomMessages');
            // console.log("[ChatsStore] Old localStorage keys potentially removed.");

            const finalMigratedState = {
              ...getInitialState(),
              ...migratedState,
            } as ChatsStoreState;
            console.log(
              "[ChatsStore] Final migrated state:",
              finalMigratedState
            );
            console.log(
              "[ChatsStore] Migrated rooms type:",
              typeof finalMigratedState.rooms,
              "Is Array:",
              Array.isArray(finalMigratedState.rooms)
            );
            return finalMigratedState;
          } catch (e) {
            console.error("[ChatsStore] Migration failed:", e);
          }
        }
        // If persistedState exists, use it (already in new format or newer version)
        if (persistedState) {
          console.log("[ChatsStore] Using persisted state.");
          const state = persistedState as ChatsStoreState;
          const finalState = { ...state };

          // If there's a username or auth token, save them to the recovery mechanism
          if (finalState.username || finalState.authToken) {
            ensureRecoveryKeysAreSet(finalState.username, finalState.authToken);
          }

          console.log("[ChatsStore] Final state from persisted:", finalState);
          console.log(
            "[ChatsStore] Persisted state rooms type:",
            typeof finalState.rooms,
            "Is Array:",
            Array.isArray(finalState.rooms)
          );
          return finalState;
        }
        // Fallback to initial state if migration fails or no persisted state
        console.log("[ChatsStore] Falling back to initial state.");
        return { ...getInitialState() } as ChatsStoreState;
      },
      // --- Rehydration Check for Null Username ---
      onRehydrateStorage: () => {
        console.log("[ChatsStore] Rehydrating storage...");
        return (state, error) => {
          if (error) {
            console.error("[ChatsStore] Error during rehydration:", error);
          } else if (state) {
            console.log(
              "[ChatsStore] Rehydration complete. Current state username:",
              state.username,
              "authToken:",
              state.authToken ? "present" : "null"
            );
            // Check if username is null AFTER rehydration
            if (state.username === null) {
              // First check the recovery key
              const recoveredUsername = getUsernameFromRecovery();
              if (recoveredUsername) {
                console.log(
                  `[ChatsStore] Found encoded username '${recoveredUsername}' in recovery storage. Applying.`
                );
                state.username = recoveredUsername;
              } else {
                // Fallback to checking old key
                const oldUsernameKey = "chats:chatRoomUsername";
                const oldUsername = localStorage.getItem(oldUsernameKey);
                if (oldUsername) {
                  console.log(
                    `[ChatsStore] Found old username '${oldUsername}' in localStorage during rehydration check. Applying.`
                  );
                  state.username = oldUsername;
                  // Save to recovery mechanism as well
                  saveUsernameToRecovery(oldUsername);
                  localStorage.removeItem(oldUsernameKey);
                  console.log(
                    `[ChatsStore] Removed old key '${oldUsernameKey}' after rehydration fix.`
                  );
                } else {
                  console.log(
                    "[ChatsStore] Username is null, but no username found in recovery or old localStorage during rehydration check."
                  );
                }
              }
            }

            // Check if auth token is null AFTER rehydration
            if (state.authToken === null) {
              const recoveredAuthToken = getAuthTokenFromRecovery();
              if (recoveredAuthToken) {
                console.log(
                  "[ChatsStore] Found encoded auth token in recovery storage. Applying."
                );
                state.authToken = recoveredAuthToken;
              }
            }

            // Ensure both are saved to recovery
            ensureRecoveryKeysAreSet(state.username, state.authToken);
          }
        };
      },
    }
  )
);
