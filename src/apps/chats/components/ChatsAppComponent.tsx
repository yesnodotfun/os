import { useState, useEffect, useCallback } from "react";
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { ChatsMenuBar } from "./ChatsMenuBar";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { InputDialog } from "@/components/dialogs/InputDialog";
import { helpItems, appMetadata } from "..";
import { useChat } from "ai/react";
import {
  loadChatMessages,
  saveChatMessages,
  APP_STORAGE_KEYS,
} from "@/utils/storage";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { useAppContext } from "@/contexts/AppContext";
import { FileText } from "lucide-react";

// Define types for TextEdit content structure
interface TextNode {
  text?: string;
  // Using Record instead of any for better type safety
  [key: string]: unknown;
}

interface ContentNode {
  type: string;
  content?: TextNode[];
  // Using Record instead of any for better type safety
  [key: string]: unknown;
}

interface TextEditContent {
  content?: ContentNode[];
  // Using Record instead of any for better type safety
  [key: string]: unknown;
}

// Helper function to extract text from TextEdit JSON content
const extractTextFromTextEditContent = (content: string): string => {
  try {
    const jsonContent = JSON.parse(content) as TextEditContent;
    if (!jsonContent.content) return "";

    return jsonContent.content
      .map((node: ContentNode) => {
        if (
          (node.type === "paragraph" || node.type === "heading") &&
          node.content
        ) {
          return node.content
            .map((textNode: TextNode) => textNode.text || "")
            .join("");
        }
        return "";
      })
      .join("\n");
  } catch {
    // If not valid JSON, return as is
    return content;
  }
};

// Helper function to truncate filename
const truncateFilename = (filename: string, maxLength: number = 20): string => {
  if (filename.length <= maxLength) return filename;

  // Get file extension
  const lastDotIndex = filename.lastIndexOf(".");
  const extension = lastDotIndex !== -1 ? filename.slice(lastDotIndex) : "";

  // Calculate how much of the name we can keep
  const nameLength = maxLength - extension.length - 3; // 3 for the ellipsis

  if (nameLength <= 0) {
    // If the extension is too long, just truncate the whole thing
    return filename.slice(0, maxLength - 3) + "...";
  }

  // Truncate the name part but keep the extension
  const namePart = filename.slice(
    0,
    lastDotIndex !== -1 ? lastDotIndex : filename.length
  );
  return namePart.slice(0, nameLength) + "..." + extension;
};

export function ChatsAppComponent({
  isWindowOpen,
  onClose,
  isForeground,
}: AppProps) {
  const initialMessage = {
    id: "1",
    role: "assistant" as const,
    content: "👋 hey! i'm ryo. ask me anything!",
    createdAt: new Date(),
  };

  const { appStates } = useAppContext();
  const isTextEditOpen = appStates["textedit"]?.isOpen || false;
  const [textEditContext, setTextEditContext] = useState<{
    fileName: string;
    content: string;
  } | null>(null);

  // Check for TextEdit content when needed
  useEffect(() => {
    const updateTextEditContext = () => {
      if (isTextEditOpen) {
        try {
          // Get the current file path
          const lastFilePath = localStorage.getItem(
            APP_STORAGE_KEYS.textedit.LAST_FILE_PATH
          );
          const fileName = lastFilePath
            ? lastFilePath.split("/").pop() || "Untitled"
            : "Untitled";

          // Get the document content
          const content = localStorage.getItem(
            APP_STORAGE_KEYS.textedit.CONTENT
          );
          if (content) {
            const extractedText = extractTextFromTextEditContent(content);
            setTextEditContext({
              fileName,
              content: extractedText,
            });
          } else {
            setTextEditContext(null);
          }
        } catch (error) {
          console.error("Error accessing TextEdit content:", error);
          setTextEditContext(null);
        }
      } else {
        setTextEditContext(null);
      }
    };

    // Initial update
    updateTextEditContext();

    // Listen for storage events to detect TextEdit content changes
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === APP_STORAGE_KEYS.textedit.CONTENT ||
        e.key === APP_STORAGE_KEYS.textedit.LAST_FILE_PATH
      ) {
        updateTextEditContext();
      }
    };

    // Listen for custom saveFile events which TextEdit dispatches when saving
    const handleSaveFile = (e: CustomEvent) => {
      if (e.detail?.path?.startsWith("/Documents/")) {
        updateTextEditContext();
      }
    };

    // Set up event listeners
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("saveFile", handleSaveFile as EventListener);

    // Also poll for changes every 2 seconds as a fallback
    // This helps catch changes that might not trigger storage events
    const intervalId = setInterval(updateTextEditContext, 2000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("saveFile", handleSaveFile as EventListener);
      clearInterval(intervalId);
    };
  }, [isTextEditOpen]);

  // Listen for app state changes
  useEffect(() => {
    const handleAppStateChange = (
      e: CustomEvent<{
        appId: string;
        isOpen: boolean;
        isForeground: boolean;
      }>
    ) => {
      if (e.detail?.appId === "textedit") {
        // If TextEdit app state changed, check if it's now open or closed
        const isNowOpen = e.detail.isOpen;
        if (isNowOpen !== isTextEditOpen) {
          // Force a re-check of the TextEdit context
          setTimeout(() => {
            if (isNowOpen) {
              // TextEdit was just opened, wait a moment for it to initialize
              setTimeout(() => {
                const content = localStorage.getItem(
                  APP_STORAGE_KEYS.textedit.CONTENT
                );
                const lastFilePath = localStorage.getItem(
                  APP_STORAGE_KEYS.textedit.LAST_FILE_PATH
                );

                if (content && lastFilePath) {
                  const fileName = lastFilePath.split("/").pop() || "Untitled";
                  const extractedText = extractTextFromTextEditContent(content);
                  setTextEditContext({
                    fileName,
                    content: extractedText,
                  });
                }
              }, 500);
            } else {
              // TextEdit was closed, clear the context
              setTextEditContext(null);
            }
          }, 0);
        }
      }
    };

    window.addEventListener(
      "appStateChange",
      handleAppStateChange as EventListener
    );

    return () => {
      window.removeEventListener(
        "appStateChange",
        handleAppStateChange as EventListener
      );
    };
  }, [isTextEditOpen]);

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
    body: textEditContext ? { textEditContext } : undefined,
  });

  // Wrap handleSubmit to include textEditContext
  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      originalHandleSubmit(e, {
        body: textEditContext ? { textEditContext } : undefined,
      });
    },
    [originalHandleSubmit, textEditContext]
  );

  const [messages, setMessages] = useState(aiMessages);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    setMessages(aiMessages);
    saveChatMessages(aiMessages);
  }, [aiMessages]);

  const handleDirectMessageSubmit = useCallback(
    (message: string) => {
      append(
        {
          content: message,
          role: "user",
        },
        { body: textEditContext ? { textEditContext } : undefined }
      );
    },
    [append, textEditContext]
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

  const clearChats = () => {
    setIsClearDialogOpen(true);
  };

  const confirmClearChats = () => {
    setAiMessages([initialMessage]);
    saveChatMessages([initialMessage]);
    setIsClearDialogOpen(false);
  };

  const handleSaveTranscript = () => {
    setIsSaveDialogOpen(true);
    const now = new Date();
    const date = now.toISOString().split("T")[0];
    const time = now
      .toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .toLowerCase()
      .replace(":", "-")
      .replace(" ", "");
    setSaveFileName(`chat-${date}-${time}.md`);
  };

  const handleSaveSubmit = (fileName: string) => {
    const transcript = messages
      .map((msg) => {
        const time = msg.createdAt
          ? new Date(msg.createdAt).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })
          : "";
        return `**${msg.role === "user" ? "You" : "Ryo"}** (${time}):\n${
          msg.content
        }\n`;
      })
      .join("\n");

    const finalFileName = fileName.endsWith(".md")
      ? fileName
      : `${fileName}.md`;
    const filePath = `/Documents/${finalFileName}`;

    const saveEvent = new CustomEvent("saveFile", {
      detail: {
        name: finalFileName,
        path: filePath,
        content: transcript,
        icon: "/icons/file-text.png",
        isDirectory: false,
      },
    });
    window.dispatchEvent(saveEvent);

    setIsSaveDialogOpen(false);
  };

  if (!isWindowOpen) return null;

  return (
    <>
      <ChatsMenuBar
        onClose={onClose}
        onShowHelp={() => setIsHelpDialogOpen(true)}
        onShowAbout={() => setIsAboutDialogOpen(true)}
        onClearChats={clearChats}
        onSaveTranscript={handleSaveTranscript}
      />
      <WindowFrame
        title="Chats"
        onClose={onClose}
        isForeground={isForeground}
        appId="chats"
        isShaking={isShaking}
        windowConstraints={{
          maxHeight: window.innerWidth <= 768 ? 360 : undefined,
        }}
      >
        <div className="flex flex-col h-full bg-[#c0c0c0] p-2 w-full">
          <ChatMessages
            messages={messages}
            isLoading={isLoading}
            error={error}
            onRetry={reload}
            onClear={clearChats}
          />

          <ChatInput
            input={input}
            isLoading={isLoading}
            isForeground={isForeground}
            onInputChange={handleInputChange}
            onSubmit={handleSubmit}
            onStop={stop}
            onDirectMessageSubmit={handleDirectMessageSubmit}
            onNudge={handleNudge}
          />
          {textEditContext && (
            <div className="font-geneva-12 flex items-center gap-1 text-[10px] text-gray-600 mt-1 px-0 py-0.5">
              <FileText className="w-3 h-3" />
              <span>
                Using{" "}
                <strong>{truncateFilename(textEditContext.fileName)}</strong>
              </span>
            </div>
          )}
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
      </WindowFrame>
    </>
  );
}
