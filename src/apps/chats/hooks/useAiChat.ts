import { useState, useEffect, useCallback, useRef } from 'react';
import { useChat, type Message } from 'ai/react';
import { useChatsStore } from '../../../stores/useChatsStore';
import { useAppStore } from "@/stores/useAppStore";
import { useInternetExplorerStore } from "@/stores/useInternetExplorerStore";
import { useVideoStore } from "@/stores/useVideoStore";
import { useIpodStore } from "@/stores/useIpodStore";
import { useTextEditStore } from "@/stores/useTextEditStore";
import { toast } from "@/hooks/useToast";
import { useLaunchApp } from "@/hooks/useLaunchApp";
import { AppId } from "@/config/appRegistry";

// TODO: Move relevant state and logic from ChatsAppComponent here
// - AI chat state (useChat hook)
// - Message processing (app control markup)
// - System state generation
// - Dialog states (clear, save)

// Define types for app control markup
interface AppControlOperation {
    type: "launch" | "close";
    id: string;
}

// Helper function to parse app control markup
const parseAppControlMarkup = (message: string): AppControlOperation[] => {
    const operations: AppControlOperation[] = [];
    try {
        const launchRegex = /<app:launch\s+id\s*=\s*"([^"]+)"\s*\/>/g;
        const closeRegex = /<app:close\s+id\s*=\s*"([^"]+)"\s*\/>/g;
        let match;
        while ((match = launchRegex.exec(message)) !== null) {
            operations.push({ type: "launch", id: match[1] });
        }
        while ((match = closeRegex.exec(message)) !== null) {
            operations.push({ type: "close", id: match[1] });
        }
    } catch (error) {
        console.error("Error parsing app control markup:", error);
    }
    return operations;
};

// Helper function to clean app control markup from message
const cleanAppControlMarkup = (message: string): string => {
    message = message.replace(
        /<app:launch\s+id\s*=\s*"([^"]+)"\s*\/>/g,
        (_match, id) => `*opened ${id}*`
    );
    message = message.replace(
        /<app:close\s+id\s*=\s*"([^"]+)"\s*\/>/g,
        (_match, id) => `*closed ${id}*`
    );
    return message.trim();
};

// Replace or update the getSystemState function to use stores
const getSystemState = () => {
    const appStore = useAppStore.getState();
    const ieStore = useInternetExplorerStore.getState();
    const videoStore = useVideoStore.getState();
    const ipodStore = useIpodStore.getState();

    const currentVideo = videoStore.videos[videoStore.currentIndex];
    const currentTrack = ipodStore.tracks[ipodStore.currentIndex];

    const runningApps = Object.entries(appStore.apps)
      .filter(([_, appState]) => appState.isOpen)
      .map(([appId, appState]) => ({ id: appId, isForeground: appState.isForeground || false }));

    const foregroundApp = runningApps.find(app => app.isForeground)?.id || null;
    const backgroundApps = runningApps.filter(app => !app.isForeground).map(app => app.id);

    return {
      apps: appStore.apps,
      runningApps: {
        foreground: foregroundApp,
        background: backgroundApps,
        windowOrder: appStore.windowOrder
      },
      internetExplorer: {
        url: ieStore.url,
        year: ieStore.year,
        status: ieStore.status,
        currentPageTitle: ieStore.currentPageTitle,
        aiGeneratedHtml: ieStore.aiGeneratedHtml,
      },
      video: {
        currentVideo: currentVideo ? { id: currentVideo.id, url: currentVideo.url, title: currentVideo.title, artist: currentVideo.artist } : null,
        isPlaying: videoStore.isPlaying,
        loopAll: videoStore.loopAll,
        loopCurrent: videoStore.loopCurrent,
        isShuffled: videoStore.isShuffled,
      },
      ipod: {
        currentTrack: currentTrack ? { id: currentTrack.id, url: currentTrack.url, title: currentTrack.title, artist: currentTrack.artist } : null,
        isPlaying: ipodStore.isPlaying,
        loopAll: ipodStore.loopAll,
        loopCurrent: ipodStore.loopCurrent,
        isShuffled: ipodStore.isShuffled,
      },
    };
};

export function useAiChat() {
    const { aiMessages, setAiMessages, username } = useChatsStore();
    const launchApp = useLaunchApp();
    const closeApp = useAppStore((state) => state.closeApp);

    const componentMountedAt = useRef(new Date()); // To track historical messages

    // --- AI Chat Hook (Vercel AI SDK) ---
    const {
        messages: currentSdkMessages,
        input,
        handleInputChange,
        handleSubmit: originalHandleSubmit,
        isLoading,
        reload,
        error,
        stop,
        setMessages: setSdkMessages,
        append,
    } = useChat({
        initialMessages: aiMessages, // Initialize from store
        experimental_throttle: 50,
        body: {
            systemState: getSystemState(), // Initial system state
        },
        onFinish: (message) => {
            // Optional: Any actions after AI finishes responding
            console.log("AI finished:", message);
        },
        onError: (err) => {
            console.error("AI Chat Error:", err);
            toast("AI Error", { description: err.message || "Failed to get response." });
        }
    });

    // --- State Synchronization & Message Processing ---
    useEffect(() => {
        // Sync SDK state back to Zustand store
        // Avoid deep comparison issues by comparing lengths and last message ID/content
        if (currentSdkMessages.length !== aiMessages.length ||
            (currentSdkMessages.length > 0 &&
             (currentSdkMessages[currentSdkMessages.length - 1].id !== aiMessages[aiMessages.length - 1]?.id ||
              currentSdkMessages[currentSdkMessages.length - 1].content !== aiMessages[aiMessages.length - 1]?.content)))
        {

            const lastMessage = currentSdkMessages[currentSdkMessages.length - 1];
            let processedMessages = [...currentSdkMessages];

            // Process last message for app control markup if it's from assistant and new
            if (currentSdkMessages.length > 0 && lastMessage.role === "assistant") {
                // Check if message is historical (loaded from store initially)
                const isHistorical = lastMessage.createdAt && lastMessage.createdAt < componentMountedAt.current;
                const alreadyProcessed = lastMessage.content.includes("*opened") || lastMessage.content.includes("*closed");

                if (!isHistorical && !alreadyProcessed) {
                    const containsAppControl = /<app:(launch|close)/i.test(lastMessage.content);
                    if (containsAppControl) {
                        console.log("Processing app control markup for message:", lastMessage.id);
                        const operations = parseAppControlMarkup(lastMessage.content);
                        if (operations.length > 0) {
                            operations.forEach((op) => {
                                console.log(`Executing app control: ${op.type} ${op.id}`);
                                if (op.type === "launch") launchApp(op.id as AppId);
                                else if (op.type === "close") closeApp(op.id as AppId);
                            });

                            const cleanedMessage = cleanAppControlMarkup(lastMessage.content);
                            processedMessages = [...currentSdkMessages]; // Create new array instance
                            processedMessages[processedMessages.length - 1] = { ...lastMessage, content: cleanedMessage };
                        } else {
                             console.log("No operations found in markup:", lastMessage.content);
                        }
                    } else {
                         console.log("No app control markup found in message:", lastMessage.id);
                    }
                } else {
                     console.log("Skipping app control processing (historical or already processed):", lastMessage.id);
                }
            }

            console.log("Syncing SDK messages to Zustand store.");
            setAiMessages(processedMessages);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentSdkMessages, setAiMessages, launchApp, closeApp]); // Add aiMessages to deps? Careful with loops.

    // When store messages change (e.g., loaded from persistence), update SDK state
    useEffect(() => {
        // Compare deeply to avoid unnecessary updates if the array reference changes but content is identical
        if (JSON.stringify(aiMessages) !== JSON.stringify(currentSdkMessages)) {
            console.log("Syncing Zustand store messages to SDK.");
            setSdkMessages(aiMessages);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [aiMessages, setSdkMessages]); // Add setSdkMessages dependency

    // --- Action Handlers ---
    const handleSubmit = useCallback(
        (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const freshSystemState = getSystemState();
            console.log("Submitting AI chat with system state:", freshSystemState);
            originalHandleSubmit(e, {
                body: { systemState: freshSystemState },
            });
        },
        [originalHandleSubmit]
    );

    const handleDirectMessageSubmit = useCallback(
        (message: string) => {
            console.log("Appending direct message to AI chat");
            append(
                { content: message, role: "user" },
                { body: { systemState: getSystemState() } }
            );
        },
        [append]
    );

    const handleNudge = useCallback(() => {
        handleDirectMessageSubmit("👋 *nudge sent*");
        // Consider adding shake effect trigger here if needed
    }, [handleDirectMessageSubmit]);

    const clearChats = useCallback(() => {
        console.log("Clearing AI chats");
        // Define the initial message
        const initialMessage: Message = {
            id: "1", // Ensure consistent ID for the initial message
            role: "assistant",
            content: "👋 hey! i'm ryo. ask me anything!",
            createdAt: new Date(),
        };
        // Update both the Zustand store and the SDK state directly
        setAiMessages([initialMessage]);
        setSdkMessages([initialMessage]);
    }, [setAiMessages, setSdkMessages]);

    // --- Dialog States & Handlers ---
    const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [saveFileName, setSaveFileName] = useState("");

    const confirmClearChats = useCallback(() => {
        setIsClearDialogOpen(false);
        // Add small delay for dialog close animation
        setTimeout(() => {
            clearChats();
            handleInputChange({ target: { value: "" } } as React.ChangeEvent<HTMLInputElement>); // Clear input field
        }, 100);
    }, [clearChats, handleInputChange]);

    const handleSaveTranscript = useCallback(() => {
        const now = new Date();
        const date = now.toISOString().split("T")[0];
        const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase().replace(":", "-").replace(" ", "");
        setSaveFileName(`chat-${date}-${time}.md`);
        setIsSaveDialogOpen(true);
    }, []);

    const handleSaveSubmit = useCallback((fileName: string) => {
        const transcript = aiMessages // Use messages from store
            .map((msg: Message) => {
                const time = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
                const sender = msg.role === 'user' ? (username || 'You') : 'Ryo';
                return `**${sender}** (${time}):\n${msg.content}`;
            })
            .join("\n\n");

        const finalFileName = fileName.endsWith(".md") ? fileName : `${fileName}.md`;
        const filePath = `/Documents/${finalFileName}`;

        const saveEvent = new CustomEvent("saveFile", {
            detail: { name: finalFileName, path: filePath, content: transcript, icon: "/icons/file-text.png", isDirectory: false },
        });
        window.dispatchEvent(saveEvent);

        // Update TextEditStore
        const textEditStore = useTextEditStore.getState();
        textEditStore.setLastFilePath(null);
        setIsSaveDialogOpen(false);

        toast.success("Transcript saved", {
            description: `Saved to ${finalFileName}`,
            duration: 3000,
        });
    }, [aiMessages, username]);

    return {
        // AI Chat State & Actions
        messages: aiMessages, // Return messages from store
        input,
        handleInputChange,
        handleSubmit,
        isLoading,
        reload,
        error,
        stop,
        append,
        handleDirectMessageSubmit,
        handleNudge,
        clearChats, // Expose the action
        handleSaveTranscript, // Expose the action

        // Dialogs
        isClearDialogOpen,
        setIsClearDialogOpen,
        confirmClearChats,

        isSaveDialogOpen,
        setIsSaveDialogOpen,
        saveFileName,
        setSaveFileName,
        handleSaveSubmit,
    };
} 