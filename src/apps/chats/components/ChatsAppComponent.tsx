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

// Helper function to parse document edit commands from chat response
const parseDocumentEdits = (
  content: string
): Array<{
  type: "append" | "replace" | "insert" | "delete";
  content: string;
  oldContent?: string;
  position?: string;
}> => {
  const edits: Array<{
    type: "append" | "replace" | "insert" | "delete";
    content: string;
    oldContent?: string;
    position?: string;
  }> = [];

  // Parse append commands
  const appendRegex = /\[append\](.*?)\[\/append\]/gs;
  let match;
  while ((match = appendRegex.exec(content)) !== null) {
    edits.push({
      type: "append",
      content: match[1].trim(),
    });
  }

  // Parse replace commands
  const replaceRegex = /\[replace\](.*?)\[\/replace\](.*?)\[\/replace\]/gs;
  while ((match = replaceRegex.exec(content)) !== null) {
    edits.push({
      type: "replace",
      oldContent: match[1].trim(),
      content: match[2].trim(),
    });
  }

  // Parse insert commands
  const insertRegex = /\[insert at="(.*?)"\](.*?)\[\/insert\]/gs;
  while ((match = insertRegex.exec(content)) !== null) {
    edits.push({
      type: "insert",
      position: match[1].trim(),
      content: match[2].trim(),
    });
  }

  // Parse delete commands
  const deleteRegex = /\[delete\](.*?)\[\/delete\]/gs;
  while ((match = deleteRegex.exec(content)) !== null) {
    edits.push({
      type: "delete",
      content: match[1].trim(),
    });
  }

  return edits;
};

// Helper function to apply document edits
const applyDocumentEdits = (
  content: string,
  edits: Array<{
    type: "append" | "replace" | "insert" | "delete";
    content: string;
    oldContent?: string;
    position?: string;
  }>
): string => {
  let result = content;

  for (const edit of edits) {
    let lines: string[];
    let insertIndex: number;

    switch (edit.type) {
      case "append":
        if (result) {
          result += "\n" + edit.content;
        } else {
          result = edit.content;
        }
        break;
      case "replace":
        if (edit.oldContent) {
          // Split into lines and replace only exact matches
          lines = result.split("\n");
          const newLines = lines.map((line) => {
            // Only replace if the line exactly matches the old content
            if (line.trim() === edit.oldContent?.trim()) {
              return edit.content;
            }
            return line;
          });
          result = newLines.join("\n");
        }
        break;
      case "insert":
        lines = result.split("\n");
        insertIndex =
          edit.position === "beginning"
            ? 0
            : edit.position === "end"
            ? lines.length
            : parseInt(edit.position || "0", 10);

        if (
          !isNaN(insertIndex) &&
          insertIndex >= 0 &&
          insertIndex <= lines.length
        ) {
          // Check if the line already exists to prevent duplicates
          const lineExists = lines.some(
            (line) => line.trim() === edit.content.trim()
          );
          if (!lineExists) {
            lines.splice(insertIndex, 0, edit.content);
            result = lines.join("\n");
          }
        }
        break;
      case "delete":
        // Split into lines and remove only exact matches
        lines = result.split("\n");
        result = lines
          .filter((line) => line.trim() !== edit.content.trim())
          .join("\n");
        break;
    }
  }

  return result;
};

// Add this function to handle document edits
const handleDocumentEdits = (content: string) => {
  const edits = parseDocumentEdits(content);
  if (edits.length === 0) return;

  try {
    // Get current content
    const currentContent = localStorage.getItem(
      APP_STORAGE_KEYS.textedit.CONTENT
    );
    if (!currentContent) return;

    // Parse current content as JSON
    const jsonContent = JSON.parse(currentContent) as TextEditContent;
    if (!jsonContent.content) return;

    // Extract text from current content
    const currentText = extractTextFromTextEditContent(currentContent);

    // Apply edits
    const newText = applyDocumentEdits(currentText, edits);

    // Convert new text back to JSON format while preserving structure
    // Filter out empty lines and ensure each paragraph has content
    const newContent = {
      type: "doc",
      content: newText
        .split("\n")
        .filter((line) => line.trim() !== "") // Remove empty lines
        .map((text) => ({
          type: "paragraph",
          content: [
            {
              type: "text",
              text: text.trim(), // Ensure text is not empty
            },
          ],
        })),
    };

    // If there's no content, add an empty paragraph to maintain valid structure
    if (newContent.content.length === 0) {
      newContent.content = [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: " ",
            },
          ],
        },
      ];
    }

    // Save new content
    localStorage.setItem(
      APP_STORAGE_KEYS.textedit.CONTENT,
      JSON.stringify(newContent)
    );

    // Dispatch event to notify TextEdit of changes
    const contentChangeEvent = new CustomEvent("textEditContentChange", {
      detail: {
        content: JSON.stringify(newContent),
      },
    });
    window.dispatchEvent(contentChangeEvent);
  } catch (error) {
    console.error("Error applying document edits:", error);
  }
};

// Add this helper function at the top of the file
const truncateFileName = (fileName: string, maxLength: number = 20): string => {
  if (fileName.length <= maxLength) return fileName;
  const extension = fileName.split(".").pop() || "";
  const nameWithoutExt = fileName.slice(0, -(extension.length + 1));
  const truncatedName =
    nameWithoutExt.slice(0, maxLength - extension.length - 3) + "...";
  return `${truncatedName}.${extension}`;
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

    // Check for document edits in the latest assistant message
    const lastMessage = aiMessages[aiMessages.length - 1];
    if (lastMessage?.role === "assistant") {
      handleDocumentEdits(lastMessage.content);
    }
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
                <strong>{truncateFileName(textEditContext.fileName)}</strong>
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
