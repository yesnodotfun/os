import { useState, useEffect, useCallback, useRef } from "react";
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

// Function to parse TextEdit XML markup in chat messages
const parseTextEditMarkup = (message: string) => {
  const edits: {
    type: "insert" | "replace" | "delete";
    line: number;
    count?: number;
    content?: string;
  }[] = [];

  try {
    // Regular expressions to match the XML tags - more robust with whitespace handling
    const insertRegex =
      /<textedit:insert\s+line\s*=\s*"(\d+)"\s*>([\s\S]*?)<\/textedit:insert>/g;
    const replaceRegex =
      /<textedit:replace\s+line\s*=\s*"(\d+)"(?:\s+count\s*=\s*"(\d+)")?\s*>([\s\S]*?)<\/textedit:replace>/g;
    const deleteRegex =
      /<textedit:delete\s+line\s*=\s*"(\d+)"(?:\s+count\s*=\s*"(\d+)")?\s*\/>/g;

    // Process inserts with additional validation
    let match;
    while ((match = insertRegex.exec(message)) !== null) {
      const lineNumber = parseInt(match[1], 10);
      if (lineNumber > 0) {
        // Ensure line numbers are positive
        edits.push({
          type: "insert",
          line: lineNumber,
          content: match[2],
        });
      }
    }

    // Process replaces with additional validation
    while ((match = replaceRegex.exec(message)) !== null) {
      const lineNumber = parseInt(match[1], 10);
      const count = match[2] ? parseInt(match[2], 10) : 1;

      if (lineNumber > 0 && count > 0) {
        // Ensure line numbers and count are positive
        edits.push({
          type: "replace",
          line: lineNumber,
          count: count,
          content: match[3],
        });
      }
    }

    // Process deletes with additional validation
    while ((match = deleteRegex.exec(message)) !== null) {
      const lineNumber = parseInt(match[1], 10);
      const count = match[2] ? parseInt(match[2], 10) : 1;

      if (lineNumber > 0 && count > 0) {
        // Ensure line numbers and count are positive
        edits.push({
          type: "delete",
          line: lineNumber,
          count: count,
        });
      }
    }

    // Log the edits for debugging
    if (edits.length > 0) {
      console.log(
        "Detected TextEdit markup edits:",
        JSON.stringify(edits, null, 2)
      );
    }
  } catch (error) {
    console.error("Error parsing TextEdit markup:", error);
  }

  return edits;
};

// Define the type for text edit operations
type TextEditOperation = {
  type: "insert" | "replace" | "delete";
  line: number;
  count?: number;
  content?: string;
};

// Function to apply edits to TextEdit content
const applyTextEditChanges = (content: string, edits: TextEditOperation[]) => {
  if (!edits.length) return content;

  // Split content into lines for easier processing
  const lines = content.split("\n");

  // Create a copy of edits to avoid modifying the original array
  const editsCopy = [...edits];

  // Sort edits by line number in ascending order to process them sequentially
  editsCopy.sort((a, b) => a.line - b.line);

  console.log("Processing edits in order:", JSON.stringify(editsCopy, null, 2));

  // Apply each edit and track line number changes
  for (let i = 0; i < editsCopy.length; i++) {
    const edit = editsCopy[i];
    const lineIndex = edit.line - 1; // Convert to 0-indexed

    // Track how many lines were added or removed by this edit
    let lineCountChange = 0;

    switch (edit.type) {
      case "insert":
        if (lineIndex >= 0 && edit.content) {
          const newLines = edit.content.split("\n");

          // If trying to insert beyond the end of the document, add empty lines to fill the gap
          if (lineIndex > lines.length) {
            console.log(
              `Inserting at future line ${edit.line}, adding ${
                lineIndex - lines.length
              } empty lines`
            );
            // Add empty lines to reach the desired position
            const emptyLinesToAdd = lineIndex - lines.length;
            for (let j = 0; j < emptyLinesToAdd; j++) {
              lines.push("");
            }
          }

          // Now insert at the specified position (which is now valid)
          lines.splice(Math.min(lineIndex, lines.length), 0, ...newLines);

          // Track how many lines were added
          lineCountChange = newLines.length;
        }
        break;

      case "replace":
        if (lineIndex >= 0 && lineIndex < lines.length && edit.content) {
          const count = Math.min(edit.count || 1, lines.length - lineIndex);
          const newLines = edit.content.split("\n");
          lines.splice(lineIndex, count, ...newLines);

          // Track how many lines were added or removed
          lineCountChange = newLines.length - count;
        }
        break;

      case "delete":
        if (lineIndex >= 0 && lineIndex < lines.length) {
          const count = Math.min(edit.count || 1, lines.length - lineIndex);
          lines.splice(lineIndex, count);

          // Track how many lines were removed
          lineCountChange = -count;
        }
        break;
    }

    // If we added or removed lines, adjust the line numbers of subsequent edits
    if (lineCountChange !== 0) {
      console.log(
        `Edit at line ${edit.line} changed line count by ${lineCountChange}`
      );

      // Update line numbers for all subsequent edits
      for (let j = i + 1; j < editsCopy.length; j++) {
        // Only adjust if the edit is at or after the current edit's line
        if (editsCopy[j].line >= edit.line) {
          editsCopy[j].line += lineCountChange;
          console.log(
            `Adjusted edit at original line ${
              editsCopy[j].line - lineCountChange
            } to new line ${editsCopy[j].line}`
          );
        }
      }
    }
  }

  // Join lines back into a single string
  return lines.join("\n");
};

// Function to update TextEdit content in localStorage
const updateTextEditContent = (newContent: string) => {
  try {
    // Get current content as JSON
    const contentJson = localStorage.getItem(APP_STORAGE_KEYS.textedit.CONTENT);
    if (!contentJson) return false;

    // Get the current file path
    const currentFilePath = localStorage.getItem(
      APP_STORAGE_KEYS.textedit.LAST_FILE_PATH
    );
    if (!currentFilePath) return false;

    // Parse the JSON content and save the original structure
    const jsonContent = JSON.parse(contentJson) as TextEditContent;
    const originalStructure = JSON.parse(contentJson); // Keep exact original structure

    if (!jsonContent.content) return false;

    // Split the new content into paragraphs
    const paragraphs = newContent.split("\n");

    // Create a deep clone of the original structure to preserve all properties
    const updatedContent = JSON.parse(JSON.stringify(originalStructure));

    // Replace only the text content while preserving the structure
    if (Array.isArray(updatedContent.content)) {
      // If we have fewer paragraphs than the original, remove excess items
      while (updatedContent.content.length > paragraphs.length) {
        updatedContent.content.pop();
      }

      // Update existing paragraphs
      for (
        let i = 0;
        i < Math.min(paragraphs.length, updatedContent.content.length);
        i++
      ) {
        const paragraph = paragraphs[i];
        // Preserve the original paragraph structure but update the text
        if (
          updatedContent.content[i].type === "paragraph" &&
          Array.isArray(updatedContent.content[i].content)
        ) {
          // Update existing text node or create one if empty
          if (updatedContent.content[i].content.length > 0) {
            updatedContent.content[i].content[0].text = paragraph;
            // Ensure the text node has a type property if it's missing
            if (!updatedContent.content[i].content[0].type) {
              updatedContent.content[i].content[0].type = "text";
            }
          } else if (paragraph.trim()) {
            updatedContent.content[i].content.push({
              type: "text",
              text: paragraph,
            });
          }
        }
      }

      // Add new paragraphs if needed
      for (let i = updatedContent.content.length; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i];
        updatedContent.content.push({
          type: "paragraph",
          content: paragraph.trim() ? [{ type: "text", text: paragraph }] : [],
        });
      }
    }

    // Convert to JSON string
    const jsonString = JSON.stringify(updatedContent);

    console.log("Prepared updated content for TextEdit", {
      filePath: currentFilePath,
      paragraphs: paragraphs.length,
    });

    // Update the document in TextEdit directly using the same event it uses
    // This ensures we're working with TextEdit's expected file handling mechanism
    const fileName = currentFilePath.split("/").pop() || "Untitled";

    // First update localStorage directly to ensure consistency
    localStorage.setItem(APP_STORAGE_KEYS.textedit.CONTENT, jsonString);

    // New approach: First try to notify TextEdit that file will change
    // This helps with already-opened documents
    window.dispatchEvent(
      new CustomEvent("fileWillChange", {
        detail: {
          path: currentFilePath,
        },
      })
    );

    // Short delay to allow TextEdit to prepare for change
    setTimeout(() => {
      // Then create a saveFile event - this is what TextEdit uses to save files
      const saveEvent = new CustomEvent("saveFile", {
        detail: {
          name: fileName,
          path: currentFilePath,
          content: jsonString,
          icon: "/icons/file-text.png",
          isDirectory: false,
          updateExisting: true,
          skipBackup: true,
        },
      });

      console.log(
        "Dispatching saveFile event to update TextEdit document:",
        currentFilePath
      );
      window.dispatchEvent(saveEvent);

      // Wait for the save event to be processed
      setTimeout(() => {
        // Force a content change notification
        window.dispatchEvent(
          new CustomEvent("contentChanged", {
            detail: {
              path: currentFilePath,
              content: jsonString,
            },
          })
        );

        // Dispatch an event to notify TextEdit to reload the document from filesystem
        window.dispatchEvent(
          new CustomEvent("documentUpdated", {
            detail: {
              path: currentFilePath,
              content: jsonString,
            },
          })
        );

        // Force a full document refresh
        setTimeout(() => {
          // Try closing and reopening the document to ensure refresh
          // First try to close it (if it's open)
          window.dispatchEvent(
            new CustomEvent("closeFile", {
              detail: {
                path: currentFilePath,
              },
            })
          );

          // Then reopen it with the updated content
          setTimeout(() => {
            window.dispatchEvent(
              new CustomEvent("openFile", {
                detail: {
                  path: currentFilePath,
                  content: jsonString,
                  forceReload: true,
                },
              })
            );

            // Also try to send a direct update to the editor if possible
            window.dispatchEvent(
              new CustomEvent("updateEditorContent", {
                detail: {
                  path: currentFilePath,
                  content: jsonString,
                },
              })
            );
          }, 50);
        }, 100);
      }, 50);
    }, 50);

    return true;
  } catch (error) {
    console.error("Error updating TextEdit content:", error);
    console.error("Error details:", error);
  }
  return false;
};

// Function to clean XML markup from a message
const cleanTextEditMarkup = (message: string) => {
  let cleanedMessage = message;
  let editCount = 0;

  // Count the number of edits
  const insertMatches =
    message.match(/<textedit:insert[^>]*>[\s\S]*?<\/textedit:insert>/g) || [];
  const replaceMatches =
    message.match(/<textedit:replace[^>]*>[\s\S]*?<\/textedit:replace>/g) || [];
  const deleteMatches = message.match(/<textedit:delete[^>]*\/>/g) || [];

  editCount =
    insertMatches.length + replaceMatches.length + deleteMatches.length;

  // Log the edit count for debugging
  console.log(`Cleaning message with ${editCount} edits`);

  // Remove all TextEdit XML tags
  cleanedMessage = cleanedMessage.replace(
    /<textedit:insert[^>]*>[\s\S]*?<\/textedit:insert>/g,
    ""
  );
  cleanedMessage = cleanedMessage.replace(
    /<textedit:replace[^>]*>[\s\S]*?<\/textedit:replace>/g,
    ""
  );
  cleanedMessage = cleanedMessage.replace(/<textedit:delete[^>]*\/>/g, "");

  // Normalize line endings
  cleanedMessage = cleanedMessage.replace(/\r\n/g, "\n");

  // First clean up all existing status messages using a single comprehensive regex
  // This handles all possible status message formats at once
  cleanedMessage = cleanedMessage.replace(
    /[\r\n]*(?:\n\n|\s)*(?:\*document updated with \d+ (?:operation|operations)\*|_\[(?:TextEdit document updated with \d+ (?:operation|operations)|Processing TextEdit document updates\.\.\.|Saving TextEdit document before applying edits\.\.\.|Error: .*?)\]_)$/g,
    ""
  );

  // Double-check with individual cleaners for any messages that might have been missed
  cleanedMessage = cleanedMessage.replace(
    /[\r\n][\r\n]*\*document updated with.*?\*/g,
    ""
  );
  cleanedMessage = cleanedMessage.replace(
    /[\r\n][\r\n]*_\[TextEdit document updated.*?\]_/g,
    ""
  );
  cleanedMessage = cleanedMessage.replace(
    /[\r\n][\r\n]*_\[Processing TextEdit.*?\]_/g,
    ""
  );
  cleanedMessage = cleanedMessage.replace(
    /[\r\n][\r\n]*_\[Saving TextEdit.*?\]_/g,
    ""
  );
  cleanedMessage = cleanedMessage.replace(/[\r\n][\r\n]*_\[Error:.*?\]_/g, "");

  // Clean any inline status messages without newlines
  cleanedMessage = cleanedMessage.replace(/\*document updated with.*?\*$/g, "");
  cleanedMessage = cleanedMessage.replace(
    /_\[TextEdit document updated.*?\]_$/g,
    ""
  );
  cleanedMessage = cleanedMessage.replace(/_\[Processing TextEdit.*?\]_$/g, "");
  cleanedMessage = cleanedMessage.replace(/_\[Saving TextEdit.*?\]_$/g, "");
  cleanedMessage = cleanedMessage.replace(/_\[Error:.*?\]_$/g, "");

  // Trim consecutive empty lines and whitespace
  cleanedMessage = cleanedMessage.replace(/\n{3,}/g, "\n\n");
  cleanedMessage = cleanedMessage.trim();

  // Add a note that edits were applied
  const hasAppliedEdits = editCount > 0;
  if (hasAppliedEdits) {
    const operationText = editCount === 1 ? "operation" : "operations";
    cleanedMessage += `\n\n*document updated with ${editCount} ${operationText}*`;
    console.log(`Added success message: ${editCount} ${operationText}`);
  }

  return cleanedMessage;
};

// Function to get the most current TextEdit content
const getCurrentTextEditContent = (): string | null => {
  try {
    // Get current content as JSON
    const contentJson = localStorage.getItem(APP_STORAGE_KEYS.textedit.CONTENT);
    if (!contentJson) return null;

    // Extract text content
    return extractTextFromTextEditContent(contentJson);
  } catch (error) {
    console.error("Error getting current TextEdit content:", error);
    return null;
  }
};

// Function to ensure TextEdit document is saved before editing
const ensureDocumentSaved = async (content: string): Promise<string | null> => {
  // Check if there's a current file path
  const currentFilePath = localStorage.getItem(
    APP_STORAGE_KEYS.textedit.LAST_FILE_PATH
  );

  if (currentFilePath) {
    return currentFilePath; // Document already has a path
  }

  // Create a new document since there's no current path
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `Untitled-${timestamp}.md`;
  const newPath = `/Documents/${fileName}`;

  console.log("Creating new document for unsaved TextEdit content:", newPath);

  // Prepare the document content in the format TextEdit expects
  const paragraphs = content.split("\n");
  const jsonContent = {
    type: "doc",
    content: paragraphs.map((paragraph) => ({
      type: "paragraph",
      content: paragraph.trim() ? [{ type: "text", text: paragraph }] : [],
    })),
  };

  const jsonString = JSON.stringify(jsonContent);

  // Create save file event
  const savePromise = new Promise<boolean>((resolve) => {
    // Create a one-time listener to detect when the file is saved
    const handleSaved = (e: CustomEvent) => {
      if (e.detail?.path === newPath) {
        window.removeEventListener("fileSaved", handleSaved as EventListener);
        resolve(true);
      }
    };

    window.addEventListener("fileSaved", handleSaved as EventListener);

    // Set a timeout to resolve anyway
    setTimeout(() => {
      window.removeEventListener("fileSaved", handleSaved as EventListener);
      resolve(false);
    }, 2000);

    // Dispatch saveFile event
    const saveEvent = new CustomEvent("saveFile", {
      detail: {
        name: fileName,
        path: newPath,
        content: jsonString,
        icon: "/icons/file-text.png",
        isDirectory: false,
        openAfterSave: true,
      },
    });

    window.dispatchEvent(saveEvent);
  });

  // Wait for save to complete
  const saved = await savePromise;

  if (saved) {
    console.log("Successfully created new document:", newPath);
    return newPath;
  } else {
    console.error("Failed to create new document");
    return null;
  }
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
  // Add ref to track edit processing to avoid infinite loops
  const isProcessingEdits = useRef(false);
  // Add ref to track processed message IDs
  const processedMessageIds = useRef<Set<string>>(new Set());
  // Add ref to track if initial messages have been loaded
  const initialMessagesLoaded = useRef(false);
  // Add ref to track the timestamp when the component was mounted
  const componentMountedAt = useRef(new Date());

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

  // Mark initial messages as loaded after the first render
  useEffect(() => {
    if (!initialMessagesLoaded.current && aiMessages.length > 0) {
      console.log("Initial messages loaded, marking as historical");
      initialMessagesLoaded.current = true;

      // Mark all initial messages as processed to prevent applying edits
      aiMessages.forEach((msg) => {
        processedMessageIds.current.add(msg.id);
      });
    }
  }, [aiMessages]);

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

    // Process messages for TextEdit markup and apply edits
    if (
      aiMessages.length > 0 &&
      !isProcessingEdits.current &&
      textEditContext
    ) {
      const lastMessage = aiMessages[aiMessages.length - 1];

      // Log for debugging
      console.log("Checking message for processing:", {
        id: lastMessage.id,
        role: lastMessage.role,
        contentStart: lastMessage.content.substring(0, 50) + "...",
        processed: processedMessageIds.current.has(lastMessage.id),
        createdAt: lastMessage.createdAt,
      });

      // Skip if this isn't an assistant message or it's already being processed
      if (lastMessage.role !== "assistant" || isProcessingEdits.current) {
        return;
      }

      // Skip if already processed
      if (processedMessageIds.current.has(lastMessage.id)) {
        console.log("Skipping already processed message:", lastMessage.id);
        return;
      }

      // Skip historical messages (created before the component was mounted)
      if (
        lastMessage.createdAt &&
        lastMessage.createdAt < componentMountedAt.current
      ) {
        console.log("Skipping historical message:", lastMessage.id);
        processedMessageIds.current.add(lastMessage.id);
        return;
      }

      // First check if the message actually contains XML markup tags
      const containsMarkup = /<textedit:(insert|replace|delete)/i.test(
        lastMessage.content
      );

      if (!containsMarkup) {
        // No markup, no processing needed
        return;
      }

      // Check for status messages that indicate processing already happened
      const hasStatusMessage =
        lastMessage.content.includes("*document updated with") ||
        lastMessage.content.includes("[TextEdit document updated with") ||
        lastMessage.content.includes("[Processing TextEdit document") ||
        lastMessage.content.includes("[Saving TextEdit document") ||
        lastMessage.content.includes("[Error:");

      if (hasStatusMessage) {
        // Already has a status message, mark as processed and skip
        processedMessageIds.current.add(lastMessage.id);
        console.log("Skipping message with existing status:", lastMessage.id);
        return;
      }

      // If we got here, this message needs processing
      console.log("Processing TextEdit markup in message:", lastMessage.id);
      const edits = parseTextEditMarkup(lastMessage.content);

      if (edits.length === 0) {
        console.log("No valid edits found in message, skipping");
        return;
      }

      console.log("Found TextEdit markup edits:", edits);

      // Set processing flag immediately to prevent race conditions
      isProcessingEdits.current = true;

      // Show a temporary "processing" message to the user
      const updatedMessages = [...aiMessages];
      const processingMsg = `${lastMessage.content}\n\n_[Processing TextEdit document updates...]_`;
      updatedMessages[updatedMessages.length - 1] = {
        ...lastMessage,
        content: processingMsg,
      };
      setMessages(updatedMessages);

      // Get the most current content before applying edits
      const currentContent =
        getCurrentTextEditContent() || textEditContext.content;

      // Handle the document saving and editing process
      (async () => {
        try {
          // Check if there's a current file path, if not, save the document first
          const currentFilePath = localStorage.getItem(
            APP_STORAGE_KEYS.textedit.LAST_FILE_PATH
          );

          if (!currentFilePath) {
            console.log("No file path found - saving document before editing");

            // Show saving message to user
            const savingMsg = `${lastMessage.content}\n\n_[Saving TextEdit document before applying edits...]_`;
            updatedMessages[updatedMessages.length - 1] = {
              ...lastMessage,
              content: savingMsg,
            };
            setMessages(updatedMessages);

            // Try to save the document and get a path
            const savedFilePath = await ensureDocumentSaved(currentContent);

            if (!savedFilePath) {
              console.error("Failed to save document before editing");
              // Show error message to user
              const errorMsg = `${lastMessage.content}\n\n_[Error: Could not save TextEdit document before editing. Please save the document manually first.]_`;
              updatedMessages[updatedMessages.length - 1] = {
                ...lastMessage,
                content: errorMsg,
              };
              setAiMessages(updatedMessages);
              setMessages(updatedMessages);
              isProcessingEdits.current = false;
              return;
            }

            // Short delay to let the document saving complete
            await new Promise((resolve) => setTimeout(resolve, 500));
          }

          // Get the current file path again (it might have been updated)
          const filePath = localStorage.getItem(
            APP_STORAGE_KEYS.textedit.LAST_FILE_PATH
          );

          if (!filePath) {
            throw new Error("No file path available after saving attempt");
          }

          console.log(
            "Current document line count:",
            currentContent.split("\n").length
          );

          // Apply edits to the TextEdit content
          const newContent = applyTextEditChanges(currentContent, edits);

          console.log(
            "TextEdit content before update:",
            currentContent.substring(0, 100) + "..."
          );
          console.log(
            "TextEdit content after edits:",
            newContent.substring(0, 100) + "..."
          );

          // Update TextEdit content in localStorage
          const updated = updateTextEditContent(newContent);

          if (updated) {
            console.log("TextEdit document updated successfully");

            // Update the local context
            setTextEditContext({
              ...textEditContext,
              content: newContent,
            });

            // Clean up the message content to remove XML markup
            const cleanedMessage = cleanTextEditMarkup(lastMessage.content);

            // Update the message in the UI
            updatedMessages[updatedMessages.length - 1] = {
              ...lastMessage,
              content: cleanedMessage,
            };

            // Update the messages without triggering this effect again
            setAiMessages(updatedMessages);
            setMessages(updatedMessages);

            // Add this message ID to the set of processed messages to prevent reprocessing
            processedMessageIds.current.add(lastMessage.id);

            // As a final attempt to ensure the TextEdit app shows the updates,
            // try reopening the file after a brief delay
            setTimeout(() => {
              const currentFilePath = localStorage.getItem(
                APP_STORAGE_KEYS.textedit.LAST_FILE_PATH
              );
              if (currentFilePath) {
                // Force reload the current document in TextEdit
                window.dispatchEvent(
                  new CustomEvent("openFile", {
                    detail: {
                      path: currentFilePath,
                      forceReload: true,
                    },
                  })
                );
              }
            }, 500);
          } else {
            console.error("Failed to update TextEdit document");

            // Update the message to indicate failure
            updatedMessages[updatedMessages.length - 1] = {
              ...lastMessage,
              content: `${lastMessage.content}\n\n_[Error: Failed to update TextEdit document. Please try saving your document first then try editing again.]_`,
            };
            setAiMessages(updatedMessages);
            setMessages(updatedMessages);
          }
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          console.error("Error during TextEdit document update:", error);
          // Show error message to user
          const errorMsg = `${lastMessage.content}\n\n_[Error: Could not update TextEdit document: ${error.message}]_`;
          updatedMessages[updatedMessages.length - 1] = {
            ...lastMessage,
            content: errorMsg,
          };
          setAiMessages(updatedMessages);
          setMessages(updatedMessages);
        } finally {
          // Add this message ID to the set of processed messages to prevent reprocessing
          processedMessageIds.current.add(lastMessage.id);

          // Get the most up-to-date content from the messages array
          const currentMessage = updatedMessages[updatedMessages.length - 1];
          const currentContent = currentMessage.content;

          // Only add error message if no status message exists yet
          if (
            !currentContent.includes("*document updated with") &&
            !currentContent.includes("[Error:") &&
            !currentContent.includes("[Processing TextEdit document") &&
            !currentContent.includes("[Saving TextEdit document")
          ) {
            console.log("Adding error status to message ID:", lastMessage.id);

            // Clean any existing status messages before adding the error
            let cleanContent = currentContent;
            cleanContent = cleanContent.replace(/\n\n_\[.*?\]_$/, "");

            const errorMsg = `${cleanContent}\n\n_[Error: Document update process was interrupted]_`;

            // Create a new message array to avoid reference issues
            const finalMessages = [...updatedMessages];
            finalMessages[finalMessages.length - 1] = {
              ...currentMessage,
              content: errorMsg,
            };

            // Update both message states at once to avoid duplication
            setAiMessages(finalMessages);
            setMessages(finalMessages);
          }

          // Reset processing flag with a delay
          setTimeout(() => {
            isProcessingEdits.current = false;
            console.log(
              "TextEdit processing flag reset - safe to process new edits"
            );
          }, 800);
        }
      })();
    }
  }, [aiMessages, textEditContext, setAiMessages]);

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
