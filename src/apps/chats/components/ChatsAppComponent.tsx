import { useState, useEffect, useRef, useCallback } from "react";
import { Message as UIMessage } from "ai/react"; // Import Message type
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { ChatsMenuBar } from "./ChatsMenuBar";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { InputDialog } from "@/components/dialogs/InputDialog";
import { helpItems, appMetadata } from "..";
import { useLaunchApp } from "@/hooks/useLaunchApp";
import { useChat } from "ai/react"; // Keep the original useChat import
import Pusher from 'pusher-js'; // Import Pusher
import { useAppStore } from "@/stores/useAppStore"; // Add store imports
import { useInternetExplorerStore } from "@/stores/useInternetExplorerStore";
import { useVideoStore } from "@/stores/useVideoStore";
import { useIpodStore } from "@/stores/useIpodStore";
import { toast } from "@/hooks/useToast"; // Import toast
import {
  loadChatMessages,
  saveChatMessages,
  APP_STORAGE_KEYS,
  loadChatRoomUsername,
  saveChatRoomUsername,
  loadLastOpenedRoomId,
  saveLastOpenedRoomId,
  loadCachedChatRooms, // Import cache functions
  saveCachedChatRooms, // Import cache functions
  loadCachedRoomMessages, // Import cache functions for messages
  saveRoomMessagesToCache, // Import cache functions for messages
  loadChatSidebarVisible, // Import new function
  saveChatSidebarVisible, // Import new function
} from "@/utils/storage";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { useAppContext } from "@/contexts/AppContext";
import { Plus, Trash } from "lucide-react";
import { AppId } from "@/config/appRegistry";
import { type ChatRoom, type ChatMessage } from "../../../../src/types/chat";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Define types for app control markup
interface AppControlOperation {
  type: "launch" | "close";
  id: string;
}

// Helper function to parse app control markup
const parseAppControlMarkup = (message: string): AppControlOperation[] => {
  const operations: AppControlOperation[] = [];

  try {
    // Find all app control tags
    const launchRegex = /<app:launch\s+id\s*=\s*"([^"]+)"\s*\/>/g;
    const closeRegex = /<app:close\s+id\s*=\s*"([^"]+)"\s*\/>/g;

    // Find all launch operations
    let match;
    while ((match = launchRegex.exec(message)) !== null) {
      operations.push({
        type: "launch",
        id: match[1],
      });
    }

    // Find all close operations
    while ((match = closeRegex.exec(message)) !== null) {
      operations.push({
        type: "close",
        id: match[1],
      });
    }
  } catch (error) {
    console.error("Error parsing app control markup:", error);
  }

  return operations;
};

// Helper function to clean app control markup from message
const cleanAppControlMarkup = (message: string): string => {
  // Replace launch tags with human readable text
  message = message.replace(
    /<app:launch\s+id\s*=\s*"([^"]+)"\s*\/>/g,
    (_match, id) => `*opened ${id}*`
  );

  // Replace close tags with human readable text
  message = message.replace(
    /<app:close\s+id\s*=\s*"([^"]+)"\s*\/>/g,
    (_match, id) => `*closed ${id}*`
  );

  return message.trim();
};

// Add chat room sidebar component
interface ChatRoomSidebarProps { // Explicitly define props interface
  rooms: ChatRoom[];
  currentRoom: ChatRoom | null;
  onRoomSelect: (room: ChatRoom | null) => void; // Allow null
  onAddRoom: () => void;
  onDeleteRoom?: (room: ChatRoom) => void;
  isVisible: boolean; // Keep this prop
  onToggleVisibility?: () => void; // Keep this prop
  username: string | null; // Add username prop
  isAdmin: boolean; // Add isAdmin prop
}

// Use the interface in React.FC
const ChatRoomSidebar: React.FC<ChatRoomSidebarProps> = ({
  rooms,
  currentRoom,
  onRoomSelect,
  onAddRoom,
  onDeleteRoom,
  isVisible, // Receive isVisible
  isAdmin, // Receive isAdmin
}) => {
  // Render based on isVisible state
  if (!isVisible) {
    return null;
  }

  return (
    // Updated classes: Added max-h-48 for mobile, adjusted flex/overflow for scrolling
    <div className="w-full bg-neutral-200 border-b flex flex-col max-h-34 overflow-hidden md:w-56 md:border-r md:border-b-0 md:max-h-full font-geneva-12 text-[12px]">
      {/* Apply ChatRoomSidebar inner container styles */}
      <div className="py-3 px-3 flex flex-col flex-1 overflow-hidden">
        {/* Updated header to include user count conditionally */}
        <div className="flex justify-between items-center md:mb-2">
          <div className="flex items-baseline gap-1.5">
            <h2 className="text-[14px] pl-1">Chats</h2>
          </div>
          {/* Conditionally render Add Room button */}
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddRoom}
              className="flex items-center text-xs hover:bg-black/5 w-[24px] h-[24px]"
            >
              <Plus className="w-3 h-3" />
            </Button>
          )}
        </div>
        {/* Updated classes: Ensure vertical scroll only */}
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          <div
            className={`px-2 py-1 cursor-pointer ${currentRoom === null ? 'bg-black text-white' : 'hover:bg-black/5'}`}
            onClick={() => onRoomSelect(null)} // Using null for Ryo chat
          >
            @ryo
          </div>
          {rooms.map((room) => (
            <div
              key={room.id}
              className={`group relative px-2 py-1 cursor-pointer ${currentRoom?.id === room.id ? 'bg-black text-white' : 'hover:bg-black/5'}`}
              onClick={() => onRoomSelect(room)}
            >
              {/* Display room name and user count inline, conditionally visible */}
              <div className="flex items-center">
                <span>#{room.name}</span>
                <span className={cn(
                  "text-gray-400 text-[10px] ml-1.5 transition-opacity", // Added slight margin
                  // Updated logic: Always show if count > 0, otherwise use hover/select logic
                  room.userCount > 0 ? "opacity-100" : (currentRoom?.id === room.id ? "opacity-100" : "opacity-0 group-hover:opacity-100")
                )}>
                  {room.userCount} online
                </span>
              </div>
              {/* Conditionally render Delete Room button (absolute positioned) */}
              {isAdmin && onDeleteRoom && (
                <button
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-500 p-1 rounded hover:bg-black/5"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent room selection
                    onDeleteRoom(room);
                  }}
                  aria-label="Delete room"
                >
                  <Trash className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Replace or update the getSystemState function to use stores
const getSystemState = () => {
  const appStore = useAppStore.getState();
  const ieStore = useInternetExplorerStore.getState();
  const videoStore = useVideoStore.getState();
  const ipodStore = useIpodStore.getState();

  const currentVideo = videoStore.videos[videoStore.currentIndex];
  const currentTrack = ipodStore.tracks[ipodStore.currentIndex];

  return {
    apps: appStore.apps,
    internetExplorer: {
      url: ieStore.url,
      year: ieStore.year,
      status: ieStore.status,
      currentPageTitle: ieStore.currentPageTitle,
      aiGeneratedHtml: ieStore.aiGeneratedHtml,
    },
    video: {
      currentVideo: currentVideo ? {
        id: currentVideo.id,
        url: currentVideo.url,
        title: currentVideo.title,
        artist: currentVideo.artist,
      } : null,
      isPlaying: videoStore.isPlaying,
      loopAll: videoStore.loopAll,
      loopCurrent: videoStore.loopCurrent,
      isShuffled: videoStore.isShuffled,
    },
    ipod: {
      currentTrack: currentTrack
        ? {
            id: currentTrack.id,
            url: currentTrack.url,
            title: currentTrack.title,
            artist: currentTrack.artist,
          }
        : null,
      isPlaying: ipodStore.isPlaying,
      loopAll: ipodStore.loopAll,
      loopCurrent: ipodStore.loopCurrent,
      isShuffled: ipodStore.isShuffled,
    },
  };
};

export function ChatsAppComponent({
  isWindowOpen,
  onClose,
  isForeground,
  skipInitialSound,
}: AppProps) {
  const initialMessage = {
    id: "1",
    role: "assistant" as const,
    content: "👋 hey! i'm ryo. ask me anything!",
    createdAt: new Date(),
  };

  const { toggleApp } = useAppContext();
  const launchApp = useLaunchApp();
  const initialMessagesLoaded = useRef(false);
  const componentMountedAt = useRef(new Date());
  // Add chat room state
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [roomMessages, setRoomMessages] = useState<ChatMessage[]>([]);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [initialSidebarPreference, setInitialSidebarPreference] = useState<boolean | null>(null);

  // State for username dialog
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [isSettingUsername, setIsSettingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // State for new room dialog
  const [isNewRoomDialogOpen, setIsNewRoomDialogOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  // Add state for delete room confirmation
  const [isDeleteRoomDialogOpen, setIsDeleteRoomDialogOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<ChatRoom | null>(null);

  const isAdmin = username === "ryo";

  const toggleSidebar = useCallback(() => {
    setIsSidebarVisible(prev => {
      const newState = !prev;
      console.log("[Component] Toggling sidebar visibility to:", newState);
      saveChatSidebarVisible(newState);
      return newState;
    });
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (initialSidebarPreference === null) return;
      const isLargeScreen = window.innerWidth >= 768;
      setIsSidebarVisible(isLargeScreen && initialSidebarPreference === true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initialSidebarPreference]);

  useEffect(() => {
    const savedState = loadChatSidebarVisible();
    console.log("[Component Mount] Loading sidebar visibility from storage:", savedState);
    setInitialSidebarPreference(savedState);
    const isLargeScreen = window.innerWidth >= 768;
    setIsSidebarVisible(isLargeScreen && savedState === true);
  }, []);

  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<{ unbind_all: () => void } | null>(null);

  // Define handleRoomSelect here so it can be used in the Pusher effect dependency array if needed
  const handleRoomSelect = useCallback((newRoom: ChatRoom | null) => {
    const previousRoomId = previousRoomIdRef.current;
    const newRoomId = newRoom ? newRoom.id : null;

    console.log(`[Room Select] Switching from ${previousRoomId || '@ryo'} to ${newRoomId || '@ryo'}`);

    if (previousRoomId && previousRoomId !== newRoomId && username) {
      callRoomAction('leaveRoom', previousRoomId, username);
    }
    if (newRoomId && newRoomId !== previousRoomId && username) {
      callRoomAction('joinRoom', newRoomId, username);
    }

    setCurrentRoom(newRoom);
    saveLastOpenedRoomId(newRoomId);
    previousRoomIdRef.current = newRoomId;
  }, [username]); // Removed callRoomAction dependency temporarily to define it later

  useEffect(() => {
    if (!isWindowOpen || !isForeground) {
      if (pusherRef.current) {
        console.log('[Pusher] Disconnecting due to window close or background...');
        pusherRef.current.disconnect();
        pusherRef.current = null;
        channelRef.current = null; // Clear channel ref too
      }
      return;
    }

    if (!pusherRef.current) {
        console.log('[Pusher] Initializing...');
        pusherRef.current = new Pusher('b47fd563805c8c42da1a', { cluster: 'us3' });

        const channel = pusherRef.current.subscribe('chats');
        channelRef.current = channel;

        channel.bind('rooms-updated', (data: { rooms: ChatRoom[] }) => {
          console.log('[Pusher] Received rooms update:', data);
          if (data.rooms) {
            setRooms(currentRooms => {
              const currentRoomsJson = JSON.stringify(currentRooms.map(r => ({ id: r.id, name: r.name, userCount: r.userCount })));
              const fetchedRoomsJson = JSON.stringify(data.rooms.map(r => ({ id: r.id, name: r.name, userCount: r.userCount })));
              if (currentRoomsJson !== fetchedRoomsJson) {
                console.log("[Pusher] Room data updated:", data.rooms);
                saveCachedChatRooms(data.rooms);
                return data.rooms;
              }
              return currentRooms;
            });
          }
        });

        channel.bind('room-message', (data: { roomId: string; message: ChatMessage }) => {
          console.log('[Pusher] Received room message:', data);
          if (currentRoom && data.roomId === currentRoom.id) {
            setRoomMessages(prevMessages => {
              const isDuplicate = prevMessages.some(msg => msg.id === data.message.id);
              if (!isDuplicate) {
                console.log(`[Pusher] Adding new message to room ${data.roomId}`);
                const messageWithNumericTimestamp = {
                  ...data.message,
                  timestamp: typeof data.message.timestamp === 'string' || typeof data.message.timestamp === 'number'
                    ? new Date(data.message.timestamp).getTime()
                    : data.message.timestamp
                };
                const updatedMessages = [...prevMessages, messageWithNumericTimestamp];
                updatedMessages.sort((a, b) => a.timestamp - b.timestamp);
                saveRoomMessagesToCache(data.roomId, updatedMessages);
                return updatedMessages;
              }
              return prevMessages;
            });
          } else if (data.roomId !== currentRoom?.id && data.message.username !== username) {
            const room = rooms.find(r => r.id === data.roomId);
            if (room) {
              toast(`${data.message.username} in #${room.name}`, {
                description: data.message.content.length > 50 ? data.message.content.substring(0, 47) + '...' : data.message.content,
                action: {
                  label: "View",
                  onClick: () => handleRoomSelect(room), // Use the defined handler
                },
                duration: 4000,
              });
            }
          }
        });

        channel.bind('user-count-updated', (data: { roomId: string; userCount: number }) => {
          console.log('[Pusher] Received user count update:', data);
          setRooms(prevRooms => prevRooms.map(room => room.id === data.roomId ? { ...room, userCount: data.userCount } : room));
        });

        channel.bind('message-deleted', (data: { roomId: string; messageId: string }) => {
          console.log(`[Pusher] Received 'message-deleted' event for room ${data.roomId}, message ${data.messageId}`);
          console.log(`[Pusher] Current room ID state: ${currentRoom?.id}`); // Log current room ID state
          if (currentRoom && data.roomId === currentRoom.id) {
            console.log(`[Pusher] Room ID matches. Updating messages for message ID: ${data.messageId}`);
            setRoomMessages(prevMessages => {
              console.log(`[Pusher] Filtering ${prevMessages.length} messages to remove ID: ${data.messageId}`);
              const updatedMessages = prevMessages.filter(msg => msg.id !== data.messageId);
              if (updatedMessages.length !== prevMessages.length) {
                console.log(`[Pusher] Message ${data.messageId} removed. New count: ${updatedMessages.length}. Saving to cache.`);
                saveRoomMessagesToCache(data.roomId, updatedMessages);
              } else {
                console.log(`[Pusher] Message ${data.messageId} not found in current state.`);
              }
              return updatedMessages;
            });
          } else {
            console.log(`[Pusher] Room ID mismatch or no current room. Ignoring delete event.`);
          }
        });

        channel.bind('messages-cleared', (data: { timestamp: number }) => {
          console.log('[Pusher] Received messages-cleared event:', data);
          setRoomMessages([]);
          if (currentRoom) {
            saveRoomMessagesToCache(currentRoom.id, []);
            console.log(`[Pusher] Cleared local messages for room ${currentRoom.id} after server clear`);
          }
        });
    }

    return () => {
        if (pusherRef.current && (!isWindowOpen || !isForeground)) {
            console.log('[Pusher] Cleaning up subscriptions on effect change...');
            if (channelRef.current) {
                channelRef.current.unbind_all();
                pusherRef.current.unsubscribe('chats');
                channelRef.current = null;
            }
            pusherRef.current.disconnect();
            pusherRef.current = null;
        }
    };
  }, [isWindowOpen, isForeground, currentRoom, username, rooms, handleRoomSelect]);

  useEffect(() => {
    const loadUser = () => {
      const storedUsername = loadChatRoomUsername();
      if (storedUsername) {
        setUsername(storedUsername);
        console.log(`Loaded username: ${storedUsername}`);
      } else {
        setUsername(null);
        console.log('No stored username found. Prompting user to set one.');
        setNewUsername('');
        setIsUsernameDialogOpen(true);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    setRoomMessages([]);
    if (!currentRoom) return;

    const roomId = currentRoom.id;
    let isCancelled = false;

    const loadMessagesForRoom = async () => {
      try {
        const cachedMessages = loadCachedRoomMessages(roomId);
        if (!isCancelled && cachedMessages) {
          setRoomMessages(cachedMessages);
          console.log(`Loaded ${cachedMessages.length} cached messages for room ${roomId}`);
        }

        const response = await fetch(`/api/chat-rooms?action=getMessages&roomId=${roomId}`);
        if (isCancelled || !response.ok) {
            if (!response.ok) console.error(`Error fetching messages for room ${roomId}: ${response.statusText}`);
            return;
        }

        const data = await response.json();
        if (isCancelled) return;

        const fetchedMessages: ChatMessage[] = (data.messages || []).map((msg: ChatMessage) => ({
          ...msg,
          timestamp: typeof msg.timestamp === "string" || typeof msg.timestamp === "number" ? new Date(msg.timestamp).getTime() : msg.timestamp,
        }));

        setRoomMessages((currentMessages) => {
          if (isCancelled) return currentMessages;
          const existingIds = new Set(currentMessages.map((m) => m.id));
          const newMessages = fetchedMessages.filter((m) => !existingIds.has(m.id));
          if (newMessages.length === 0) {
            console.log(`No new messages for room ${roomId}`);
            return currentMessages;
          }
          const merged = [...currentMessages, ...newMessages].sort((a, b) => a.timestamp - b.timestamp);
          saveRoomMessagesToCache(roomId, merged);
          return merged;
        });
      } catch (err) {
        if (!isCancelled) console.error("Error processing room messages:", err);
      }
    };

    loadMessagesForRoom();
    return () => { isCancelled = true; };
  }, [currentRoom]);

  const {
    messages: aiMessages,
    input,
    handleInputChange,
    handleSubmit: originalHandleSubmit,
    isLoading,
    reload,
    error,
    stop,
    setMessages: setAiMessages,
    append,
  } = useChat({
    initialMessages: loadChatMessages() || [initialMessage],
    experimental_throttle: 50,
    body: {
      systemState: getSystemState(),
    },
  });

  const sendRoomMessage = useCallback(async (content: string) => {
    if (!currentRoom || !username) return;

    const tempId = generateId();
    const newMessage = { id: tempId, roomId: currentRoom.id, username, content, timestamp: Date.now() };

    setRoomMessages(prev => [...prev, newMessage].sort((a, b) => a.timestamp - b.timestamp));

    try {
      const response = await fetch('/api/chat-rooms?action=sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: currentRoom.id, username, content }),
      });

      if (response.ok) {
        const serverMessage = await response.json();
        setRoomMessages(prev => {
          const withoutTemp = prev.filter(msg => msg.id !== tempId);
          const realMessageExists = withoutTemp.some(msg => msg.id === serverMessage.message.id);
          if (!realMessageExists) {
            const updated = [...withoutTemp, {
              ...serverMessage.message,
              timestamp: typeof serverMessage.message.timestamp === 'string' || typeof serverMessage.message.timestamp === 'number'
                ? new Date(serverMessage.message.timestamp).getTime()
                : serverMessage.message.timestamp
            }];
            updated.sort((a, b) => a.timestamp - b.timestamp);
            saveRoomMessagesToCache(currentRoom.id, updated);
            return updated;
          }
          saveRoomMessagesToCache(currentRoom.id, withoutTemp);
          return withoutTemp;
        });
      } else {
        console.error('Error sending room message:', await response.json());
         setRoomMessages(prev => prev.filter(msg => msg.id !== tempId));
         toast("Error", { description: "Failed to send message." });
      }
    } catch (error) {
      console.error('Network error sending room message:', error);
       setRoomMessages(prev => prev.filter(msg => msg.id !== tempId));
       toast("Error", { description: "Network error sending message." });
    }
  }, [currentRoom, username]);

  const generateId = () => Math.random().toString(36).substring(2, 15);

  useEffect(() => {
    if (!initialMessagesLoaded.current && aiMessages.length > 0) {
      console.log("Initial messages loaded, marking as historical");
      initialMessagesLoaded.current = true;
    }
  }, [aiMessages]);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (currentRoom && username) {
        sendRoomMessage(input);
        handleInputChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
      } else {
        const freshSystemState = getSystemState();
        originalHandleSubmit(e, {
          body: { systemState: freshSystemState },
        });
      }
    },
    [originalHandleSubmit, currentRoom, username, input, handleInputChange, sendRoomMessage]
  );

  const [messages, setMessages] = useState(aiMessages);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    setMessages(aiMessages);
    saveChatMessages(aiMessages);

    const lastMessage = aiMessages[aiMessages.length - 1];

    if (aiMessages.length > 1 && lastMessage.role === "assistant") {
      if (lastMessage.createdAt && lastMessage.createdAt < componentMountedAt.current) {
        console.log("Skipping historical message:", lastMessage.id);
        return;
      }

      const containsAppControl = /<app:(launch|close)/i.test(lastMessage.content);

      if (containsAppControl) {
        const operations = parseAppControlMarkup(lastMessage.content);
        if (operations.length > 0) {
          operations.forEach((op) => {
            if (op.type === "launch") launchApp(op.id as AppId);
            else if (op.type === "close") toggleApp(op.id);
          });

          const cleanedMessage = cleanAppControlMarkup(lastMessage.content);
          const updatedMessages = [...aiMessages];
          updatedMessages[updatedMessages.length - 1] = { ...lastMessage, content: cleanedMessage };
          setMessages(updatedMessages);
          setAiMessages(updatedMessages);
        }
      }
    }
  }, [aiMessages, setAiMessages, launchApp, toggleApp]);

  const handleDirectMessageSubmit = useCallback(
    (message: string) => {
      if (currentRoom && username) {
        sendRoomMessage(message);
      } else {
        append(
          { content: message, role: "user" },
          { body: { systemState: getSystemState() } }
        );
      }
    },
    [append, currentRoom, username, sendRoomMessage]
  );

  const handleNudge = useCallback(() => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
    handleDirectMessageSubmit("👋 *nudge sent*");
  }, [handleDirectMessageSubmit]);

  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveFileName, setSaveFileName] = useState("");

  const previousRoomIdRef = useRef<string | null>(null);

  const handleDeleteRoom = useCallback((room: ChatRoom) => {
    setRoomToDelete(room);
    setIsDeleteRoomDialogOpen(true);
  }, []);

  const confirmDeleteRoom = useCallback(async () => {
    if (!roomToDelete) return;
    try {
      const response = await fetch(`/api/chat-rooms?action=deleteRoom&roomId=${roomToDelete.id}`, { method: 'DELETE' });
      if (response.ok) {
        setRooms(prevRooms => prevRooms.filter(room => room.id !== roomToDelete.id));
        if (currentRoom?.id === roomToDelete.id) {
          setCurrentRoom(null);
          saveLastOpenedRoomId(null);
        }
        console.log(`Room ${roomToDelete.name} deleted successfully`);
      } else {
        console.error('Failed to delete room:', await response.json());
        toast("Error", { description: "Failed to delete room." });
      }
    } catch (error) {
      console.error('Error deleting room:', error);
       toast("Error", { description: "Network error deleting room." });
    } finally {
      setIsDeleteRoomDialogOpen(false);
      setRoomToDelete(null);
    }
  }, [roomToDelete, currentRoom]);

  const clearChats = () => {
    setIsClearDialogOpen(true);
  };

  const confirmClearChats = () => {
    setIsClearDialogOpen(false);
    setTimeout(() => {
      setAiMessages([initialMessage]);
      saveChatMessages([initialMessage]);
      setRoomMessages([]);
      localStorage.removeItem(APP_STORAGE_KEYS.chats.CACHED_ROOM_MESSAGES);
      handleInputChange({ target: { value: "" } } as React.ChangeEvent<HTMLInputElement>);
      console.log("Chat cleared successfully");
    }, 100);
  };

  const handleSaveTranscript = () => {
    setIsSaveDialogOpen(true);
    const now = new Date();
    const date = now.toISOString().split("T")[0];
    const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase().replace(":", "-").replace(" ", "");
    setSaveFileName(`chat-${date}-${time}.md`);
  };

  const handleSaveSubmit = (fileName: string) => {
    const messagesToSave = currentRoom ? roomMessages.map(msg => ({
        id: msg.id,
        role: msg.username === username ? 'user' : 'human',
        content: msg.content,
        createdAt: new Date(msg.timestamp),
        username: msg.username,
    })) : messages.map(msg => ({
        ...msg,
        username: msg.role === 'user' ? (username || 'You') : 'Ryo'
    }));

    const transcript = messagesToSave
      .map((msg) => {
        const time = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
        const sender = msg.username || (msg.role === 'user' ? 'You' : 'Ryo');
        return `**${sender}** (${time}):\n${msg.content}`;
      })
      .join("\n\n"); // Corrected join separator

    const finalFileName = fileName.endsWith(".md") ? fileName : `${fileName}.md`;
    const filePath = `/Documents/${finalFileName}`;

    const saveEvent = new CustomEvent("saveFile", {
      detail: { name: finalFileName, path: filePath, content: transcript, icon: "/icons/file-text.png", isDirectory: false },
    });
    window.dispatchEvent(saveEvent);
    setIsSaveDialogOpen(false);
  };

  // Define callRoomAction here, after username state is defined
  const callRoomAction = useCallback(async (action: 'joinRoom' | 'leaveRoom', roomId: string | null, currentUsername: string | null) => {
    if (!roomId || !currentUsername) return;
    console.log(`[Room Action] Calling ${action} for room ${roomId}, user ${currentUsername}`);
    try {
      const response = await fetch(`/api/chat-rooms?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, username: currentUsername }),
      });
      if (!response.ok) {
        console.error(`[Room Action] Failed to ${action} room ${roomId}:`, await response.json());
      }
    } catch (error) {
      console.error(`[Room Action] Network error during ${action} for room ${roomId}:`, error);
    }
  }, []); // No dependencies needed here as it uses passed args

  // Now update handleRoomSelect dependency array
  useEffect(() => {
      // This is just to trigger update for handleRoomSelect dependency
  }, [callRoomAction]);

  const handleAddRoom = useCallback(() => {
    setNewRoomName("");
    setRoomError(null);
    setIsNewRoomDialogOpen(true);
  }, []);

  const handleRoomSubmit = async (roomName: string) => {
    const trimmedRoomName = roomName.trim();
    setRoomError(null);
    if (!trimmedRoomName) { setRoomError("Room name cannot be empty."); return; }
    if (!username) { setRoomError("You need to set a username first."); return; }

    setIsCreatingRoom(true);
    try {
      const response = await fetch('/api/chat-rooms?action=createRoom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedRoomName }),
      });
      if (response.ok) {
        const newRoomData = await response.json();
        setRooms((prev) => [...prev, newRoomData.room]);
        await callRoomAction('joinRoom', newRoomData.room.id, username);
        setCurrentRoom(newRoomData.room);
        saveLastOpenedRoomId(newRoomData.room.id);
        previousRoomIdRef.current = newRoomData.room.id;
        setIsNewRoomDialogOpen(false);
      } else {
        const errorData = await response.json();
        setRoomError(errorData.error || 'Failed to create room.');
        console.error('Error creating room:', errorData);
      }
    } catch (error) {
      setRoomError('Network error. Please try again.');
      console.error('Network error creating room:', error);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleSetUsernameClick = () => {
    setNewUsername(username || "");
    setIsUsernameDialogOpen(true);
  };

  const handleUsernameSubmit = async (submittedUsername: string) => {
    const trimmedUsername = submittedUsername.trim();
    setUsernameError(null);
    if (!trimmedUsername) { setUsernameError("Username cannot be empty."); return; }

    setIsSettingUsername(true);
    try {
      const response = await fetch('/api/chat-rooms?action=createUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUsername }),
      });
      if (response.ok) {
        const data = await response.json();
        saveChatRoomUsername(data.user.username);
        setUsername(data.user.username);
        setIsUsernameDialogOpen(false);
        console.log(`Username set to: ${data.user.username}`);
        // If a room was selected, join it now that we have a username
        if (currentRoom) {
            callRoomAction('joinRoom', currentRoom.id, data.user.username);
            previousRoomIdRef.current = currentRoom.id; // Update ref
        }
      } else if (response.status === 409) {
        setUsernameError("Username already taken. Please choose another.");
      } else {
        const errorData = await response.json();
        setUsernameError(errorData.error || 'Failed to set username.');
        console.error('Error setting username:', errorData);
      }
    } catch (error) {
      setUsernameError('Network error. Please try again.');
      console.error('Network error setting username:', error);
    } finally {
      setIsSettingUsername(false);
    }
  };

  useEffect(() => {
    const initialRoomId = currentRoom ? currentRoom.id : null;
    if (initialRoomId && username) {
      console.log("[Component Mount/User Ready] Joining initial room:", initialRoomId);
      callRoomAction('joinRoom', initialRoomId, username);
      previousRoomIdRef.current = initialRoomId;
    }
    return () => {
      const roomToLeave = previousRoomIdRef.current;
      if (roomToLeave && username) {
        console.log("[Component Unmount] Leaving room:", roomToLeave);
        // Use navigator.sendBeacon for cleanup if possible, otherwise fetch
        if (navigator.sendBeacon) {
            const data = JSON.stringify({ roomId: roomToLeave, username });
            navigator.sendBeacon('/api/chat-rooms?action=leaveRoom', data);
        } else {
            callRoomAction('leaveRoom', roomToLeave, username);
        }
      }
    };
  }, [username, currentRoom?.id, callRoomAction]);

  useEffect(() => {
    return () => {
      console.log("Chat component unmounted, cleanup complete");
    };
  }, []);

  useEffect(() => {
    const cachedRoomsData = loadCachedChatRooms();
    let lastRoom: ChatRoom | null = null;
    if (cachedRoomsData) {
      setRooms(cachedRoomsData);
      console.log("Loaded cached rooms:", cachedRoomsData);
      const lastRoomId = loadLastOpenedRoomId();
      if (lastRoomId) {
        lastRoom = cachedRoomsData.find(room => room.id === lastRoomId) || null;
        if (lastRoom) {
          setCurrentRoom(lastRoom);
          console.log(`Restored last opened room from cache: ${lastRoom.name}`);
        } else {
            // Last room ID from storage doesn't exist in cache, clear it
            saveLastOpenedRoomId(null);
        }
      }
    }

    const fetchRooms = async () => {
      try {
        const response = await fetch('/api/chat-rooms?action=getRooms');
        if (!response.ok) {
          console.error(`Failed to fetch rooms: ${response.statusText}`);
          return;
        }
        const data = await response.json();
        const fetchedRooms = data.rooms || [];
        setRooms(fetchedRooms); // Always update with fetched data
        saveCachedChatRooms(fetchedRooms);
        console.log("Fetched and updated rooms cache:", fetchedRooms);

        // Re-evaluate last opened room based on fetched data
        const lastRoomId = loadLastOpenedRoomId();
        if (lastRoomId) {
          const fetchedLastRoom = fetchedRooms.find((room: ChatRoom) => room.id === lastRoomId);
          if (fetchedLastRoom) {
            // Only update if currentRoom is null or different
            if (!currentRoom || currentRoom.id !== fetchedLastRoom.id) {
              setCurrentRoom(fetchedLastRoom);
              console.log(`Restored/updated last opened room from fetch: ${fetchedLastRoom.name}`);
            }
          } else {
            // Last room ID no longer valid, clear from storage and state
            if (currentRoom?.id === lastRoomId) {
              setCurrentRoom(null);
            }
            saveLastOpenedRoomId(null);
            console.log(`Last opened room ID ${lastRoomId} not found in fetch, switched to @ryo.`);
          }
        } else if (!currentRoom) {
            // If no last room ID and no room set from cache, ensure it's null (@ryo)
            setCurrentRoom(null);
        }
      } catch (error) {
        console.error('Error fetching rooms:', error);
        // Fallback: if fetch fails and no room was loaded from cache, default to @ryo
        if (!currentRoom) {
             setCurrentRoom(null);
        }
      }
    };
    fetchRooms();
  }, []); // Ensure this runs only once

  if (!isWindowOpen) return null;

  return (
    <>
      <ChatsMenuBar
        onClose={onClose}
        onShowHelp={() => setIsHelpDialogOpen(true)}
        onShowAbout={() => setIsAboutDialogOpen(true)}
        onClearChats={clearChats}
        onSaveTranscript={handleSaveTranscript}
        onSetUsername={handleSetUsernameClick}
        onToggleSidebar={toggleSidebar}
        isSidebarVisible={isSidebarVisible}
        onAddRoom={handleAddRoom}
        rooms={rooms}
        currentRoom={currentRoom}
        onRoomSelect={handleRoomSelect}
        isAdmin={isAdmin}
      />
      <WindowFrame
        title={currentRoom ? `#${currentRoom.name}` : "@ryo"}
        onClose={onClose}
        isForeground={isForeground}
        appId="chats"
        skipInitialSound={skipInitialSound}
        isShaking={isShaking}
      >
        <div className="flex flex-col md:flex-row h-full bg-[#c0c0c0] w-full">
          <ChatRoomSidebar
            rooms={rooms}
            currentRoom={currentRoom}
            onRoomSelect={handleRoomSelect}
            onAddRoom={handleAddRoom}
            onDeleteRoom={handleDeleteRoom}
            isVisible={isSidebarVisible}
            onToggleVisibility={toggleSidebar}
            username={username}
            isAdmin={isAdmin}
          />
          <div className="flex flex-col flex-1 p-2 overflow-hidden">
            <ChatMessages
              key={currentRoom ? `room-${currentRoom.id}` : 'ryo'}
              messages={currentRoom
                ? roomMessages.map(msg => ({
                  id: msg.id,
                  role: msg.username === username ? 'user' : 'human',
                  content: msg.content,
                  createdAt: new Date(msg.timestamp),
                  username: msg.username,
                }))
                : messages.map(msg => ({
                  ...msg,
                  username: msg.role === 'user' ? (username || 'You') : 'Ryo'
                }))}
              isLoading={isLoading}
              error={error}
              onRetry={reload}
              onClear={clearChats}
              isRoomView={!!currentRoom}
              roomId={currentRoom?.id}
              isAdmin={isAdmin}
              username={username || undefined}
              onMessageDeleted={(messageId) => {
                setRoomMessages(prevMessages => {
                  const updatedMessages = prevMessages.filter(msg => msg.id !== messageId);
                  if (updatedMessages.length !== prevMessages.length) {
                    console.log(`[Admin Delete] Removed message ${messageId} locally.`);
                    if (currentRoom?.id) {
                      saveRoomMessagesToCache(currentRoom.id, updatedMessages);
                    }
                  }
                  return updatedMessages;
                });
              }}
            />

            {(() => {
              const sourceMessages = currentRoom ? roomMessages : messages;
              const userMessages = (sourceMessages as unknown[]).filter((msg: unknown) => {
                if (typeof msg === 'object' && msg !== null && 'role' in msg && (msg as UIMessage).role === "user") return true;
                if (typeof msg === 'object' && msg !== null && 'username' in msg && (msg as ChatMessage).username === username) return true;
                return false;
              });
              const prevMessagesContent = Array.from(new Set(userMessages.map((msg) => (msg as {content: string}).content))).reverse() as string[];

              return (
                <ChatInput
                  input={input}
                  isLoading={isLoading}
                  isForeground={isForeground}
                  onInputChange={handleInputChange}
                  onSubmit={handleSubmit}
                  onStop={stop}
                  onDirectMessageSubmit={handleDirectMessageSubmit}
                  onNudge={handleNudge}
                  previousMessages={prevMessagesContent}
                  showNudgeButton={!currentRoom}
                />
              );
            })()}
          </div>
        </div>
        <HelpDialog
          isOpen={isHelpDialogOpen}
          onOpenChange={setIsHelpDialogOpen}
          helpItems={helpItems}
          appName="Chats"
        />
        <AboutDialog
          isOpen={isAboutDialogOpen}
          onOpenChange={setIsAboutDialogOpen}
          metadata={appMetadata}
        />
        <ConfirmDialog
          isOpen={isClearDialogOpen}
          onOpenChange={setIsClearDialogOpen}
          onConfirm={confirmClearChats}
          title="Clear Chats"
          description="Are you sure you want to clear all chats? This action cannot be undone."
        />
        <InputDialog
          isOpen={isSaveDialogOpen}
          onOpenChange={setIsSaveDialogOpen}
          onSubmit={handleSaveSubmit}
          title="Save Transcript"
          description="Enter a name for your transcript file"
          value={saveFileName}
          onChange={setSaveFileName}
        />
        <InputDialog
          isOpen={isUsernameDialogOpen}
          onOpenChange={setIsUsernameDialogOpen}
          onSubmit={handleUsernameSubmit}
          title="Set Username"
          description="Enter the username you want to use in chat rooms"
          value={newUsername}
          onChange={(value) => { setNewUsername(value); setUsernameError(null); }}
          isLoading={isSettingUsername}
          errorMessage={usernameError}
        />
        <InputDialog
          isOpen={isNewRoomDialogOpen}
          onOpenChange={setIsNewRoomDialogOpen}
          onSubmit={handleRoomSubmit}
          title="Create New Room"
          description="Enter a name for the new chat room"
          value={newRoomName}
          onChange={(value) => { setNewRoomName(value); setRoomError(null); }}
          isLoading={isCreatingRoom}
          errorMessage={roomError}
        />
        <ConfirmDialog
          isOpen={isDeleteRoomDialogOpen}
          onOpenChange={setIsDeleteRoomDialogOpen}
          onConfirm={confirmDeleteRoom}
          title="Delete Chat Room"
          description={`Are you sure you want to delete the room "${roomToDelete?.name}"? This action cannot be undone.`}
        />
      </WindowFrame>
    </>
  );
}
