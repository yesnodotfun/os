import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { AppProps } from "@/apps/base/types";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { TerminalMenuBar } from "./TerminalMenuBar";
import { appMetadata, helpItems } from "../index";
import { useFileSystem } from "@/apps/finder/hooks/useFileSystem";
import {
  loadTerminalCommandHistory,
  saveTerminalCommandHistory,
  loadTerminalCurrentPath,
  saveTerminalCurrentPath,
  TerminalCommand,
} from "@/utils/storage";
import { useLaunchApp } from "@/hooks/useLaunchApp";
import { useChat } from "ai/react";
import { useAppContext } from "@/contexts/AppContext";
import { AppId } from "@/config/appRegistry";
import { useTerminalSounds } from "@/hooks/useTerminalSounds";
import { Maximize, Minimize, Copy, Check, Save } from "lucide-react";
import { useWindowManager } from "@/hooks/useWindowManager";

interface CommandHistory {
  command: string;
  output: string;
  path: string;
  messageId?: string; // Optional since not all commands will have a message ID
}

// Available commands for autocompletion
const AVAILABLE_COMMANDS = [
  "help",
  "clear",
  "pwd",
  "ls",
  "cd",
  "cat",
  "mkdir",
  "touch",
  "rm",
  "edit",
  "history",
  "about",
  "ryo",
  "ai",
  "chat",
];

// Helper function to parse app control markup
const parseAppControlMarkup = (
  message: string
): {
  type: "launch" | "close";
  id: string;
}[] => {
  const operations: { type: "launch" | "close"; id: string }[] = [];

  try {
    // Find all app control tags
    const launchRegex = /<app:launch\s+id\s*=\s*"([^"]+)"\s*\/>/g;
    const closeRegex = /<app:close\s+id\s*=\s*"([^"]+)"\s*\/>/g;

    // Find all launch operations
    let match;
    while ((match = launchRegex.exec(message)) !== null) {
      operations.push({
        type: "launch" as const,
        id: match[1],
      });
    }

    // Find all close operations
    while ((match = closeRegex.exec(message)) !== null) {
      operations.push({
        type: "close" as const,
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

// Component to render HTML previews
interface HtmlPreviewProps {
  htmlContent: string;
  onInteractionChange: (isInteracting: boolean) => void;
  isStreaming?: boolean;
  terminalRef: React.RefObject<HTMLDivElement>;
}

function HtmlPreview({
  htmlContent,
  onInteractionChange,
  isStreaming = false,
  terminalRef,
}: HtmlPreviewProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const { windowSize } = useWindowManager({ appId: "terminal" });
  const { playElevatorMusic, stopElevatorMusic, playDingSound } =
    useTerminalSounds();
  const prevStreamingRef = useRef(isStreaming);
  const previewRef = useRef<HTMLDivElement>(null);

  // Add font stack and base styling to HTML content
  const processedHtmlContent = useMemo(() => {
    // Check if content already has complete HTML structure
    if (
      htmlContent.includes("<!DOCTYPE html>") ||
      htmlContent.includes("<html")
    ) {
      return htmlContent;
    }

    // Wrap with proper HTML tags
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 8px;
      font-size: 12px;
      line-height: 1.4;
      max-width: 100%;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;
  }, [htmlContent]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(processedHtmlContent);
      setCopySuccess(true);

      // Reset after 2 seconds
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const handleSaveToDisk = (e: React.MouseEvent) => {
    e.stopPropagation();
    const blob = new Blob([processedHtmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .substring(0, 19);
    a.href = url;
    a.download = `terminal-output-${timestamp}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Play elevator music when streaming starts, stop when streaming ends
  useEffect(() => {
    if (isStreaming) {
      playElevatorMusic();
    } else if (prevStreamingRef.current && !isStreaming) {
      // If we were streaming but now we're not, stop music and play ding
      stopElevatorMusic();
      playDingSound();
    }

    prevStreamingRef.current = isStreaming;

    // Clean up on unmount
    return () => {
      stopElevatorMusic();
    };
  }, [isStreaming, playElevatorMusic, stopElevatorMusic, playDingSound]);

  // Adjust for the terminal interface elements
  const contentHeight = windowSize.height - 30; // Adjust for header, input, padding

  // Function to scroll to the preview's top edge
  const scrollToPreview = useCallback(() => {
    if (previewRef.current && terminalRef.current) {
      const previewRect = previewRef.current.getBoundingClientRect();
      const terminalRect = terminalRef.current.getBoundingClientRect();
      const scrollOffset =
        previewRect.top - terminalRect.top + terminalRef.current.scrollTop - 8; // 8px for padding
      terminalRef.current.scrollTo({
        top: scrollOffset,
        behavior: "smooth",
      });
    }
  }, []);

  // Normal inline display with optional maximized height
  return (
    <motion.div
      ref={previewRef}
      className="border rounded bg-white/100 overflow-auto my-2 relative"
      style={{
        maxHeight: isFullScreen ? `${contentHeight}px` : "800px",
        pointerEvents: isStreaming ? "none" : "auto",
      }}
      animate={{
        opacity: isStreaming ? [0.6, 0.8, 0.6] : 1,
      }}
      transition={{
        opacity: {
          duration: 2.5,
          repeat: isStreaming ? Infinity : 0,
          ease: "easeInOut",
        },
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseEnter={() => !isStreaming && onInteractionChange(true)}
      onMouseLeave={() => !isStreaming && onInteractionChange(false)}
      tabIndex={-1}
    >
      <motion.div
        className="flex justify-end p-1 absolute top-2 right-4 z-20"
        animate={{
          opacity: isStreaming ? 0 : 1,
        }}
        transition={{
          duration: 0.3,
        }}
        style={{
          pointerEvents: isStreaming ? "none" : "auto",
        }}
      >
        <button
          onClick={handleSaveToDisk}
          onMouseDown={(e) => e.stopPropagation()}
          className="flex items-center justify-center w-6 h-6 hover:bg-black/10 rounded mr-1 group"
          aria-label="Save HTML to disk"
          disabled={isStreaming}
        >
          <Save
            size={16}
            className="text-neutral-400/50 group-hover:text-neutral-300"
          />
        </button>
        <button
          onClick={handleCopy}
          onMouseDown={(e) => e.stopPropagation()}
          className="flex items-center justify-center w-6 h-6 hover:bg-black/10 rounded mr-1 group"
          aria-label="Copy HTML code"
          disabled={isStreaming}
        >
          {copySuccess ? (
            <Check
              size={16}
              className="text-neutral-400/50 group-hover:text-neutral-300"
            />
          ) : (
            <Copy
              size={16}
              className="text-neutral-400/50 group-hover:text-neutral-300"
            />
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsFullScreen(!isFullScreen);
            // Scroll to preview when maximizing
            if (!isFullScreen) {
              setTimeout(scrollToPreview, 50); // Small delay to ensure the resize has completed
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="flex items-center justify-center w-6 h-6 hover:bg-black/10 rounded group"
          aria-label={isFullScreen ? "Minimize preview" : "Maximize preview"}
          disabled={isStreaming}
        >
          {isFullScreen ? (
            <Minimize
              size={16}
              className="text-neutral-400/50 group-hover:text-neutral-300"
            />
          ) : (
            <Maximize
              size={16}
              className="text-neutral-400/50 group-hover:text-neutral-300"
            />
          )}
        </button>
      </motion.div>
      <motion.iframe
        srcDoc={processedHtmlContent}
        title="HTML Preview"
        className="w-full h-full border-0"
        sandbox="allow-scripts"
        style={{
          height: isFullScreen ? `${contentHeight - 40}px` : "250px",
          display: "block",
          pointerEvents: isStreaming ? "none" : "auto",
        }}
        animate={{
          opacity: isStreaming ? [0.6, 0.8, 0.6] : 1,
        }}
        transition={{
          opacity: {
            duration: 2.5,
            repeat: isStreaming ? Infinity : 0,
            ease: "easeInOut",
          },
        }}
        onMouseDown={(e) => e.stopPropagation()}
      />
    </motion.div>
  );
}

// Check if a string is a HTML code block
const isHtmlCodeBlock = (
  text: string
): { isHtml: boolean; content: string } => {
  // Check for markdown code blocks with html tag
  const codeBlockRegex = /```(?:html)?\s*([\s\S]*?)```/;
  const match = text.match(codeBlockRegex);

  if (match && match[1]) {
    const content = match[1].trim();
    // Check if content appears to be HTML (starts with a tag or has HTML elements)
    if (content.startsWith("<") || /<\/?[a-z][\s\S]*>/i.test(content)) {
      return { isHtml: true, content };
    }
  }

  // Also check for HTML content outside of code blocks
  const trimmedText = text.trim();
  if (
    trimmedText.startsWith("<") &&
    (/<\/[a-z][^>]*>/i.test(trimmedText) || // Has a closing tag
      /<[a-z][^>]*\/>/i.test(trimmedText) || // Has a self-closing tag
      trimmedText.includes("<style>") ||
      trimmedText.includes("<div>") ||
      trimmedText.includes("<span>"))
  ) {
    return { isHtml: true, content: trimmedText };
  }

  return { isHtml: false, content: "" };
};

// Extract HTML content even if the code block is incomplete/being streamed
const extractHtmlContent = (
  text: string
): {
  htmlContent: string;
  textContent: string;
  hasHtml: boolean;
} => {
  // Check for complete HTML code blocks
  const completeRegex = /```(?:html)?\s*([\s\S]*?)```/g;
  let processedText = text;
  const htmlParts: string[] = [];
  let match;
  let hasHtml = false;

  // First check for complete HTML blocks
  while ((match = completeRegex.exec(text)) !== null) {
    const content = match[1].trim();
    if (
      content &&
      (content.startsWith("<") || /<\/?[a-z][\s\S]*>/i.test(content))
    ) {
      htmlParts.push(content);
      hasHtml = true;
      // Remove complete HTML blocks from text
      processedText = processedText.replace(match[0], "");
    }
  }

  // Then check for incomplete HTML blocks that are still streaming
  const incompleteRegex = /```(?:html)?\s*([\s\S]*?)$/;
  const incompleteMatch = processedText.match(incompleteRegex);

  if (
    incompleteMatch &&
    incompleteMatch[1] &&
    (incompleteMatch[1].trim().startsWith("<") ||
      /<\/?[a-z][\s\S]*>/i.test(incompleteMatch[1].trim()))
  ) {
    htmlParts.push(incompleteMatch[1].trim());
    hasHtml = true;
    // Remove incomplete HTML block from text
    processedText = processedText.replace(incompleteMatch[0], "");
  }

  // Check for standalone HTML content outside of code blocks
  const trimmedText = processedText.trim();
  if (
    !hasHtml &&
    trimmedText.startsWith("<") &&
    (/<\/[a-z][^>]*>/i.test(trimmedText) || // Has a closing tag
      /<[a-z][^>]*\/>/i.test(trimmedText) || // Has a self-closing tag
      trimmedText.includes("<style>") ||
      trimmedText.includes("<div>") ||
      trimmedText.includes("<span>"))
  ) {
    htmlParts.push(trimmedText);
    hasHtml = true;
    processedText = "";
  }

  // Join all HTML parts
  const htmlContent = htmlParts.join("\n\n");

  return {
    htmlContent,
    textContent: processedText,
    hasHtml,
  };
};

// TypewriterText component for terminal output
function TypewriterText({
  text,
  className,
  speed = 15,
}: {
  text: string;
  className?: string;
  speed?: number;
}) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const textRef = useRef(text);

  useEffect(() => {
    // Reset when text changes
    setDisplayedText("");
    setIsComplete(false);
    textRef.current = text;

    // Skip animation for long text (performance)
    if (text.length > 200) {
      setDisplayedText(text);
      setIsComplete(true);
      return;
    }

    // Adjust speed based on text length - faster for longer text
    const adjustedSpeed =
      text.length > 100 ? speed * 0.7 : text.length > 50 ? speed * 0.85 : speed;

    // Split into reasonable chunks for better performance
    // This makes animation smoother by reducing React state updates
    const chunkSize = text.length > 100 ? 3 : text.length > 50 ? 2 : 1;
    const chunks: string[] = [];

    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.substring(i, Math.min(i + chunkSize, text.length)));
    }

    // Use a recursive setTimeout for more reliable animation
    let currentIndex = 0;
    let timeoutId: NodeJS.Timeout;

    const typeNextChunk = () => {
      if (currentIndex < chunks.length) {
        const chunk = chunks[currentIndex];
        setDisplayedText((prev) => prev + chunk);
        currentIndex++;

        // Pause longer after punctuation for natural rhythm
        const endsWithPunctuation = /[.,!?;:]$/.test(chunk);
        const delay = endsWithPunctuation ? adjustedSpeed * 3 : adjustedSpeed;

        timeoutId = setTimeout(typeNextChunk, delay);
      } else {
        setIsComplete(true);
      }
    };

    // Start the typing animation
    timeoutId = setTimeout(typeNextChunk, adjustedSpeed);

    // Clean up on unmount
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [text, speed]);

  return (
    <span className={className}>
      {displayedText}
      {!isComplete && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
        >
          _
        </motion.span>
      )}
    </span>
  );
}

// Animated ellipsis component for thinking indicator
function AnimatedEllipsis() {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const patterns = [".", "..", "...", "..", ".", ".", "..", "..."];
    let index = 0;

    const interval = setInterval(() => {
      setDots(patterns[index]);
      index = (index + 1) % patterns.length;
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return <span>{dots}</span>;
}

export function TerminalAppComponent({
  onClose,
  isWindowOpen,
  isForeground = true,
}: AppProps) {
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const [currentCommand, setCurrentCommand] = useState("");
  const [commandHistory, setCommandHistory] = useState<CommandHistory[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [historyCommands, setHistoryCommands] = useState<string[]>([]);
  const [fontSize, setFontSize] = useState(12); // Default font size in pixels
  const [isInAiMode, setIsInAiMode] = useState(false);
  const [spinnerIndex, setSpinnerIndex] = useState(0);
  const [isInteractingWithPreview, setIsInteractingWithPreview] =
    useState(false);
  const spinnerChars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

  // Track if auto-scrolling is enabled
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

  // Reference to track if user is at the bottom
  const isAtBottomRef = useRef(true);
  const hasScrolledRef = useRef(false);
  const previousCommandHistoryLength = useRef(0);

  // Keep track of the last processed message ID to avoid duplicates
  const lastProcessedMessageIdRef = useRef<string | null>(null);
  // Keep track of apps already launched in the current session
  const launchedAppsRef = useRef<Set<string>>(new Set());

  // Add useChat hook
  const {
    messages: aiMessages,
    append: appendAiMessage,
    isLoading: isAiLoading,
    stop: stopAiResponse,
    setMessages: setAiChatMessages,
  } = useChat({
    initialMessages: [
      {
        id: "system",
        role: "system",
        content:
          "You are a helpful AI assistant and genius web front-end programmer running in a terminal on ryOS.",
      },
    ],
    experimental_throttle: 50,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  const { currentPath, files, navigateToPath, saveFile, moveToTrash } =
    useFileSystem(loadTerminalCurrentPath());

  const launchApp = useLaunchApp();
  const { toggleApp, bringToForeground } = useAppContext();

  const {
    playCommandSound,
    playErrorSound,
    playAiResponseSound,
    toggleMute,
    isMuted,
  } = useTerminalSounds();

  // Load command history from storage
  useEffect(() => {
    const savedCommands = loadTerminalCommandHistory();
    setHistoryCommands(savedCommands.map((cmd) => cmd.command));
  }, []);

  // Initialize with welcome message
  useEffect(() => {
    setCommandHistory([
      {
        command: "",
        output:
          "Welcome to ryOS Terminal\nType 'help' for a list of available commands.",
        path: currentPath,
      },
    ]);
  }, []);

  // Handle scroll events to enable/disable auto-scroll
  const handleScroll = () => {
    if (terminalRef.current) {
      hasScrolledRef.current = true;
      const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
      // Check if user is at the bottom (allowing for a small buffer of 10px)
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;

      // If we were at bottom and scrolled up, disable auto-scroll
      if (isAtBottomRef.current && !isAtBottom) {
        setAutoScrollEnabled(false);
      }
      // If we're at bottom, enable auto-scroll
      if (isAtBottom) {
        setAutoScrollEnabled(true);
        isAtBottomRef.current = true;
      }
    }
  };

  // Improved scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, []);

  // Auto-scroll to bottom when command history changes
  useEffect(() => {
    if (!terminalRef.current) return;

    // Always scroll to bottom on initial load
    if (!hasScrolledRef.current) {
      scrollToBottom();
      return;
    }

    // For subsequent updates, only scroll if auto-scroll is enabled
    if (autoScrollEnabled) {
      scrollToBottom();
    }

    previousCommandHistoryLength.current = commandHistory.length;
  }, [commandHistory, autoScrollEnabled, scrollToBottom]);

  // Modify the focus effect to respect preview interaction
  useEffect(() => {
    if (inputRef.current && isForeground && !isInteractingWithPreview) {
      inputRef.current.focus();
    }
  }, [isForeground, commandHistory, isInteractingWithPreview]);

  // Save current path when it changes
  useEffect(() => {
    saveTerminalCurrentPath(currentPath);
  }, [currentPath]);

  // Spinner animation effect
  useEffect(() => {
    if (isAiLoading) {
      const interval = setInterval(() => {
        setSpinnerIndex((prevIndex) => (prevIndex + 1) % spinnerChars.length);
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isAiLoading, spinnerChars.length]);

  const [isClearingTerminal, setIsClearingTerminal] = useState(false);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentCommand.trim()) return;

    if (isInAiMode) {
      // Handle AI mode commands
      handleAiCommand(currentCommand);
      return;
    }

    // Add command to history commands array
    const newHistoryCommands = [...historyCommands, currentCommand];
    setHistoryCommands(newHistoryCommands);
    setHistoryIndex(-1);

    // Save to storage
    const savedCommands = loadTerminalCommandHistory();
    const newCommands: TerminalCommand[] = [
      ...savedCommands,
      { command: currentCommand, timestamp: Date.now() },
    ];
    saveTerminalCommandHistory(newCommands);

    // Process the command
    const result = processCommand(currentCommand);

    // Play appropriate sound based on command result
    if (result.isError) {
      playErrorSound();
    } else {
      playCommandSound();
    }

    // Reset animated lines to ensure only new content gets animated
    setAnimatedLines(new Set());

    // Add to command history
    setCommandHistory([
      ...commandHistory,
      {
        command: currentCommand,
        output: result.output,
        path: currentPath,
      },
    ]);

    // Clear current command
    setCurrentCommand("");
  };

  // Parse command respecting quotes for arguments with spaces
  const parseCommand = (command: string): { cmd: string; args: string[] } => {
    const trimmedCommand = command.trim();
    if (!trimmedCommand) return { cmd: "", args: [] };

    // Handle quoted arguments
    const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
    const parts: string[] = [];
    let match;

    // Extract all parts including quoted sections
    while ((match = regex.exec(trimmedCommand)) !== null) {
      // If it's a quoted string, use the capture group (without quotes)
      if (match[1]) parts.push(match[1]);
      else if (match[2]) parts.push(match[2]);
      else parts.push(match[0]);
    }

    return {
      cmd: parts[0].toLowerCase(),
      args: parts.slice(1),
    };
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      // Navigate up through command history
      if (historyCommands.length > 0) {
        const newIndex =
          historyIndex < historyCommands.length - 1
            ? historyIndex + 1
            : historyIndex;
        setHistoryIndex(newIndex);
        const historicCommand =
          historyCommands[historyCommands.length - 1 - newIndex] || "";

        // If we're not in AI mode and the historic command was from AI mode
        // (doesn't start with 'ryo' and was saved with 'ryo' prefix)
        const savedCommands = loadTerminalCommandHistory();
        const commandEntry = savedCommands[savedCommands.length - 1 - newIndex];
        if (
          !isInAiMode &&
          commandEntry &&
          commandEntry.command.startsWith("ryo ") &&
          !historicCommand.startsWith("ryo ")
        ) {
          setCurrentCommand("ryo " + historicCommand);
        } else {
          setCurrentCommand(historicCommand);
        }
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      // Navigate down through command history
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        const historicCommand =
          historyCommands[historyCommands.length - 1 - newIndex] || "";

        // Same logic for down arrow
        const savedCommands = loadTerminalCommandHistory();
        const commandEntry = savedCommands[savedCommands.length - 1 - newIndex];
        if (
          !isInAiMode &&
          commandEntry &&
          commandEntry.command.startsWith("ryo ") &&
          !historicCommand.startsWith("ryo ")
        ) {
          setCurrentCommand("ryo " + historicCommand);
        } else {
          setCurrentCommand(historicCommand);
        }
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentCommand("");
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const completedCommand = autoComplete(currentCommand);
      setCurrentCommand(completedCommand);
    }
  };

  // Update autoComplete to handle quotes
  const autoComplete = (input: string): string => {
    // If the input ends with a space, don't try to autocomplete
    if (input.endsWith(" ")) return input;

    const { cmd, args } = parseCommand(input);

    // If this is the first word (command autocomplete)
    if (!input.includes(" ")) {
      const matches = AVAILABLE_COMMANDS.filter((availableCmd) =>
        availableCmd.startsWith(cmd)
      );

      if (matches.length === 1) {
        // Exact match, replace the command
        return matches[0];
      } else if (matches.length > 1) {
        // Show matching commands
        setCommandHistory([
          ...commandHistory,
          {
            command: input,
            output: matches.join("  "),
            path: currentPath,
          },
        ]);
        return input;
      }
    }
    // File/directory autocompletion (for commands that take file arguments)
    else if (["cd", "cat", "rm", "edit"].includes(cmd)) {
      const lastArg = args.length > 0 ? args[args.length - 1] : "";

      const matches = files
        .filter((file) =>
          file.name.toLowerCase().startsWith(lastArg.toLowerCase())
        )
        .map((file) => file.name);

      if (matches.length === 1) {
        // Exact match, replace the last part
        // Handle filenames with spaces by adding quotes if needed
        const matchedName = matches[0];
        const needsQuotes = matchedName.includes(" ");

        // Rebuild the command with the matched filename
        const commandParts = input.split(" ");

        // Remove the last part (partial filename)
        commandParts.pop();

        // Add the completed filename (with quotes if needed)
        if (
          needsQuotes &&
          !lastArg.startsWith('"') &&
          !lastArg.startsWith("'")
        ) {
          commandParts.push(`"${matchedName}"`);
        } else {
          commandParts.push(matchedName);
        }

        return commandParts.join(" ");
      } else if (matches.length > 1) {
        // Show matching files/directories
        setCommandHistory([
          ...commandHistory,
          {
            command: input,
            output: matches.join("  "),
            path: currentPath,
          },
        ]);
        return input;
      }
    }

    return input; // Return original if no completions
  };

  const processCommand = (
    command: string
  ): { output: string; isError: boolean } => {
    const { cmd, args } = parseCommand(command);

    switch (cmd) {
      case "help":
        return {
          output: `
Available commands:
  help             - Show this help message
  clear            - Clear the terminal
  pwd              - Print working directory
  ls               - List files in current directory
  cd <directory>   - Change directory
  cat <file>       - Display file contents
  mkdir <name>     - Create a directory
  touch <name>     - Create an empty file
  rm <file>        - Delete a file (moves to trash)
  edit <file>      - Open file in TextEdit
  ryo <prompt>     - Start AI chat mode with optional initial prompt
  history          - Show command history
  about            - Display information about Terminal
`,
          isError: false,
        };

      case "clear":
        // Trigger clearing animation
        setIsClearingTerminal(true);
        // Stop any ongoing AI responses
        if (isInAiMode) {
          stopAiResponse();
        }
        setTimeout(() => {
          setIsClearingTerminal(false);
          setCommandHistory([]);
          // Reset tracking refs for AI responses
          lastProcessedMessageIdRef.current = null;
        }, 500); // Animation duration
        return { output: "", isError: false };

      case "pwd":
        return { output: currentPath, isError: false };

      case "ls": {
        if (files.length === 0) {
          return { output: "No files found", isError: false };
        }
        return {
          output: files
            .map((file) => (file.isDirectory ? file.name : file.name))
            .join("\n"),
          isError: false,
        };
      }

      case "cd": {
        if (args.length === 0) {
          navigateToPath("/");
          return { output: "", isError: false };
        }

        // Handle special case for parent directory
        if (args[0] === "..") {
          const pathParts = currentPath.split("/").filter(Boolean);
          const parentPath =
            pathParts.length > 0 ? "/" + pathParts.slice(0, -1).join("/") : "/";
          navigateToPath(parentPath);
          return { output: "", isError: false };
        }

        let newPath = args[0];

        // Handle relative paths
        if (!newPath.startsWith("/")) {
          newPath = `${currentPath === "/" ? "" : currentPath}/${newPath}`;
        }

        // Verify the path exists before navigating
        // First normalize the path to prevent issues with trailing slashes
        const normalizedPath =
          newPath.endsWith("/") && newPath !== "/"
            ? newPath.slice(0, -1)
            : newPath;

        // Get the parent directory to check if target exists
        const pathParts = normalizedPath.split("/").filter(Boolean);
        const targetDir = pathParts.pop(); // Remove the target directory from the path
        const parentPath =
          pathParts.length > 0 ? "/" + pathParts.join("/") : "/";

        // Special case for root directory
        if (normalizedPath === "/") {
          navigateToPath("/");
          return { output: "", isError: false };
        }

        // Get files in the parent directory
        const filesInParent = files.filter((file) => {
          const parentPathWithSlash = parentPath.endsWith("/")
            ? parentPath
            : parentPath + "/";
          return (
            file.path.startsWith(parentPathWithSlash) &&
            !file.path.replace(parentPathWithSlash, "").includes("/")
          );
        });

        // Check if the target directory exists
        const targetExists = filesInParent.some(
          (file) => file.name === targetDir && file.isDirectory
        );

        if (!targetExists) {
          return {
            output: `cd: ${args[0]}: No such directory`,
            isError: true,
          };
        }

        // Directory exists, navigate to it
        navigateToPath(normalizedPath);
        return { output: "", isError: false };
      }

      case "cat": {
        if (args.length === 0) {
          return {
            output: "Usage: cat <filename>",
            isError: true,
          };
        }

        const fileName = args[0];
        const file = files.find((f) => f.name === fileName);

        if (!file) {
          return {
            output: `File not found: ${fileName}`,
            isError: true,
          };
        }

        if (file.isDirectory) {
          return {
            output: `${fileName} is a directory, not a file`,
            isError: true,
          };
        }

        return {
          output: file.content || `${fileName} is empty`,
          isError: false,
        };
      }

      case "mkdir":
        return {
          output:
            "Command not implemented: mkdir requires filesystem write access",
          isError: true,
        };

      case "touch": {
        if (args.length === 0) {
          return {
            output: "Usage: touch <filename>",
            isError: true,
          };
        }

        const newFileName = args[0];

        // Check if file already exists
        if (files.find((f) => f.name === newFileName)) {
          return {
            output: `File already exists: ${newFileName}`,
            isError: true,
          };
        }

        // Create empty file
        saveFile({
          name: newFileName,
          path: `${currentPath}/${newFileName}`,
          content: "",
          isDirectory: false,
          icon: "/icons/file-text.png",
          type: "text",
        });

        return {
          output: `Created file: ${newFileName}`,
          isError: false,
        };
      }

      case "rm": {
        if (args.length === 0) {
          return {
            output: "Usage: rm <filename>",
            isError: true,
          };
        }

        const fileToDelete = args[0];
        const fileObj = files.find((f) => f.name === fileToDelete);

        if (!fileObj) {
          return {
            output: `File not found: ${fileToDelete}`,
            isError: true,
          };
        }

        moveToTrash(fileObj);
        return {
          output: `Moved to trash: ${fileToDelete}`,
          isError: false,
        };
      }

      case "edit": {
        if (args.length === 0) {
          return {
            output: "Usage: edit <filename>",
            isError: true,
          };
        }

        const fileToEdit = args[0];
        const fileToEditObj = files.find((f) => f.name === fileToEdit);

        if (!fileToEditObj) {
          return {
            output: `File not found: ${fileToEdit}`,
            isError: true,
          };
        }

        if (fileToEditObj.isDirectory) {
          return {
            output: `${fileToEdit} is a directory, not a file`,
            isError: true,
          };
        }

        // Check if the file is already in Documents folder
        let filePath = fileToEditObj.path;
        if (!filePath.startsWith("/Documents/")) {
          // Create a copy in the Documents folder
          const fileName = fileToEditObj.name;
          const documentsPath = `/Documents/${fileName}`;

          // Save file to Documents
          saveFile({
            name: fileName,
            path: documentsPath,
            content: fileToEditObj.content,
            isDirectory: false,
            icon: "/icons/file-text.png",
            type: "text",
          });

          filePath = documentsPath;
        }

        // Store the file content temporarily for TextEdit to open
        localStorage.setItem(
          "pending_file_open",
          JSON.stringify({
            path: filePath,
            content: fileToEditObj.content || "",
          })
        );

        // Launch TextEdit
        launchApp("textedit");

        return {
          output: `Opening ${fileToEdit} in TextEdit...`,
          isError: false,
        };
      }

      case "about":
        setTimeout(() => setIsAboutDialogOpen(true), 100);
        return {
          output: "Opening About dialog...",
          isError: false,
        };

      case "history": {
        const cmdHistory = loadTerminalCommandHistory();
        if (cmdHistory.length === 0) {
          return {
            output: "No command history",
            isError: false,
          };
        }
        return {
          output: cmdHistory
            .map((cmd, idx) => {
              const date = new Date(cmd.timestamp);
              return `${idx + 1}  ${cmd.command}  # ${date.toLocaleString()}`;
            })
            .join("\n"),
          isError: false,
        };
      }

      case "ai":
      case "chat":
      case "ryo": {
        // Enter AI chat mode
        setIsInAiMode(true);

        // Reset AI messages to just the system message
        setAiChatMessages([
          {
            id: "system",
            role: "system",
            content:
              "You are a helpful AI assistant running in a terminal on ryOS.",
          },
        ]);

        // If there's an initial prompt, add it to messages and immediately send it
        if (args.length > 0) {
          const initialPrompt = args.join(" ");

          // Add prompt to command history
          setCommandHistory((prev) => [
            ...prev,
            {
              command: initialPrompt,
              output: "",
              path: "ai-user",
            },
            {
              command: "",
              output: `${spinnerChars[spinnerIndex]} ryo is thinking...`,
              path: "ai-thinking",
            },
          ]);

          // Send the initial prompt
          appendAiMessage({
            role: "user",
            content: initialPrompt,
          });

          return {
            output: `Ask Ryo anything. Type 'exit' to return to terminal.\nSending initial prompt: ${initialPrompt}`,
            isError: false,
          };
        }

        return {
          output: `Ask Ryo anything. Type 'exit' to return to terminal.`,
          isError: false,
        };
      }

      default:
        return {
          output: `Command not found: ${cmd}. Type 'help' for a list of available commands.`,
          isError: true,
        };
    }
  };

  // Function to handle app controls - memoized to prevent recreation on every render
  const handleAppControls = useCallback(
    (messageContent: string) => {
      if (!/<app:(launch|close)/i.test(messageContent)) {
        return messageContent;
      }

      const operations = parseAppControlMarkup(messageContent);
      if (operations.length === 0) {
        return messageContent;
      }

      // Execute app control operations - but only once per app
      operations.forEach((op) => {
        if (op.type === "launch") {
          // Only launch each app once
          if (!launchedAppsRef.current.has(op.id)) {
            launchApp(op.id as AppId);
            launchedAppsRef.current.add(op.id);
          }
        } else if (op.type === "close") {
          toggleApp(op.id);
          // Remove from launched apps so it can be launched again later
          launchedAppsRef.current.delete(op.id);
        }
      });

      // Clean the message content of markup
      return cleanAppControlMarkup(messageContent);
    },
    [launchApp, toggleApp]
  );

  // Reset launched apps when leaving AI mode
  useEffect(() => {
    if (!isInAiMode) {
      launchedAppsRef.current.clear();
    }
  }, [isInAiMode]);

  // Memoize the AI response sound function to prevent dependency changes
  const playAiResponseSoundMemoized = useCallback(() => {
    playAiResponseSound();
  }, [playAiResponseSound]);

  // Watch for changes in the AI messages to update the terminal display
  useEffect(() => {
    if (!isInAiMode || aiMessages.length <= 1) return;

    // Get the most recent assistant message
    const lastMessage = aiMessages[aiMessages.length - 1];

    // Skip if this isn't an assistant message
    if (lastMessage.role !== "assistant") {
      return;
    }

    // Skip if we've already processed this exact message content
    const messageKey = `${lastMessage.id}-${lastMessage.content}`;
    if (messageKey === lastProcessedMessageIdRef.current) {
      return;
    }

    // Process the message and handle app controls
    const messageContent = lastMessage.content;
    const cleanedContent = handleAppControls(messageContent);

    // If we're clearing the terminal, don't update messages
    if (isClearingTerminal) return;

    // Update command history atomically
    setCommandHistory((prev) => {
      // Remove any thinking messages first
      const filteredHistory = prev.filter(
        (item) => item.path !== "ai-thinking"
      );

      // Check if this message already exists in the history
      const existingMessageIndex = filteredHistory.findIndex(
        (item) =>
          item.path === "ai-assistant" && item.messageId === lastMessage.id
      );

      // If message exists, update it only if content changed
      if (existingMessageIndex !== -1) {
        const existingMessage = filteredHistory[existingMessageIndex];
        if (existingMessage.output === cleanedContent) {
          return prev; // No change needed
        }

        const updatedHistory = [...filteredHistory];
        updatedHistory[existingMessageIndex] = {
          command: "",
          output: cleanedContent,
          path: "ai-assistant",
          messageId: lastMessage.id,
        };
        return updatedHistory;
      }

      // If it's a completely new message, play sound
      playAiResponseSoundMemoized();

      // Append new message
      return [
        ...filteredHistory,
        {
          command: "",
          output: cleanedContent,
          path: "ai-assistant",
          messageId: lastMessage.id,
        },
      ];
    });

    // Store the current message key being processed
    lastProcessedMessageIdRef.current = messageKey;
  }, [
    aiMessages,
    isInAiMode,
    isClearingTerminal,
    handleAppControls,
    playAiResponseSoundMemoized,
  ]);

  // Function to handle AI mode commands
  const handleAiCommand = (command: string) => {
    const lowerCommand = command.trim().toLowerCase();

    // Play command sound for AI mode commands too
    playCommandSound();

    // Add command to history commands array (for up/down arrow navigation)
    const newHistoryCommands = [...historyCommands, command];
    setHistoryCommands(newHistoryCommands);
    setHistoryIndex(-1);

    // Save to storage (including AI commands)
    const savedCommands = loadTerminalCommandHistory();
    const newCommands: TerminalCommand[] = [
      ...savedCommands,
      {
        command: command.startsWith("ryo ") ? command : `ryo ${command}`,
        timestamp: Date.now(),
      },
    ];
    saveTerminalCommandHistory(newCommands);

    // Reset animated lines to ensure only new content gets animated
    setAnimatedLines(new Set());

    // If user types 'exit' or 'quit', leave AI mode
    if (lowerCommand === "exit" || lowerCommand === "quit") {
      setIsInAiMode(false);
      stopAiResponse();
      setAiChatMessages([
        {
          id: "system",
          role: "system",
          content:
            "You are a helpful AI assistant running in a terminal on ryOS.",
        },
      ]);

      // Reset tracking refs
      lastProcessedMessageIdRef.current = null;
      launchedAppsRef.current.clear();

      // Add exit command to history
      setCommandHistory([
        ...commandHistory,
        {
          command: command,
          output: "Bye! ♥",
          path: currentPath,
        },
      ]);

      setCurrentCommand("");
      return;
    }

    // If user types 'clear', clear the chat history
    if (lowerCommand === "clear") {
      // Stop any ongoing AI response
      stopAiResponse();

      // Reset AI messages to just the system message
      setAiChatMessages([
        {
          id: "system",
          role: "system",
          content:
            "You are a helpful AI assistant running in a terminal on ryOS.",
        },
      ]);

      // Trigger clearing animation
      setIsClearingTerminal(true);

      // Reset animated lines to prevent typewriter effect on old content
      setAnimatedLines(new Set());

      // Reset tracking refs
      lastProcessedMessageIdRef.current = null;

      // Clear launched apps tracking
      launchedAppsRef.current.clear();

      setTimeout(() => {
        setIsClearingTerminal(false);
        // Set command history to just the welcome message
        setCommandHistory([
          {
            command: "",
            output:
              "Chat history cleared. You're still in ryo chat mode. Type 'exit' to return to terminal.",
            path: "ai-assistant",
          },
        ]);
      }, 300); // Short delay for animation

      setCurrentCommand("");
      return;
    }

    // Add user command to chat history with special AI mode formatting
    // Remove any existing thinking messages
    const filteredHistory = commandHistory.filter(
      (item) => item.path !== "ai-thinking"
    );

    // Add only the user message - no thinking message in history
    setCommandHistory([
      ...filteredHistory,
      {
        command: command,
        output: "",
        path: "ai-user", // Special marker for AI mode user message
      },
    ]);

    // Send the message using useChat hook
    appendAiMessage({
      role: "user",
      content: command,
    });

    // Clear current command
    setCurrentCommand("");
  };

  const increaseFontSize = () => {
    if (fontSize < 24) {
      setFontSize((prevSize) => prevSize + 2);
    }
  };

  const decreaseFontSize = () => {
    if (fontSize > 10) {
      setFontSize((prevSize) => prevSize - 2);
    }
  };

  const [terminalFlash, setTerminalFlash] = useState(false);

  const resetFontSize = () => {
    setFontSize(12); // Reset to default

    // Create a flash effect when resetting font size
    setTerminalFlash(true);
    setTimeout(() => setTerminalFlash(false), 300);
  };

  // Animation variants for terminal lines
  const lineVariants = {
    initial: {
      opacity: 0,
      y: 10,
      filter: "blur(2px)",
    },
    animate: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 25,
        mass: 0.8,
      },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.2 },
    },
  };

  // Track which output lines should use typewriter effect
  const [animatedLines, setAnimatedLines] = useState<Set<number>>(new Set());

  // Add new line to the animated lines set - optimize to prevent unnecessary updates
  useEffect(() => {
    if (commandHistory.length === 0) return;

    const newIndex = commandHistory.length - 1;
    const item = commandHistory[newIndex];

    // Skip adding animation if we've already processed this length
    if (previousCommandHistoryLength.current === commandHistory.length) return;
    previousCommandHistoryLength.current = commandHistory.length;

    setAnimatedLines((prev) => {
      // If the line is already animated, don't update the set
      if (prev.has(newIndex)) return prev;

      const newSet = new Set(prev);

      // Only animate certain types of output
      if (
        !item.path.startsWith("ai-") &&
        item.output &&
        item.output.length > 0 &&
        item.output.length < 150 &&
        !item.output.startsWith("Command not found") &&
        !item.output.startsWith("Usage:") &&
        !item.output.includes("Available commands") &&
        !item.output.includes("Welcome to ryOS Terminal") &&
        !item.output.includes("Ask Ryo anything.") &&
        // Don't animate ls command output
        !(item.command && item.command.trim().startsWith("ls"))
      ) {
        newSet.add(newIndex);
      }

      return newSet;
    });
  }, [commandHistory]);

  // Update HTML preview usage in the component
  const handleHtmlPreviewInteraction = (isInteracting: boolean) => {
    setIsInteractingWithPreview(isInteracting);
  };

  // Add the following style in a useEffect that runs once to add the global animation
  useEffect(() => {
    // Add breathing animation if it doesn't exist
    if (!document.getElementById("breathing-animation")) {
      const style = document.createElement("style");
      style.id = "breathing-animation";
      style.innerHTML = `
        @keyframes breathing {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        
        .shimmer-subtle {
          animation: shimmer-text 2.5s ease-in-out infinite;
        }
        
        @keyframes shimmer-text {
          0% { opacity: 0.5; }
          50% { opacity: 0.8; }
          100% { opacity: 0.5; }
        }
      `;
      document.head.appendChild(style);
    }
    return () => {
      // Clean up on unmount
      const styleElement = document.getElementById("breathing-animation");
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, []);

  if (!isWindowOpen) return null;

  return (
    <>
      <TerminalMenuBar
        onClose={onClose}
        onShowHelp={() => setIsHelpDialogOpen(true)}
        onShowAbout={() => setIsAboutDialogOpen(true)}
        onClear={() => {
          setIsClearingTerminal(true);
          setTimeout(() => {
            setIsClearingTerminal(false);
            setCommandHistory([]);
          }, 500);
        }}
        onIncreaseFontSize={increaseFontSize}
        onDecreaseFontSize={decreaseFontSize}
        onResetFontSize={resetFontSize}
        onToggleMute={toggleMute}
        isMuted={isMuted}
      />
      <WindowFrame
        appId="terminal"
        title="Terminal"
        onClose={onClose}
        isForeground={isForeground}
        transparentBackground={true}
      >
        <motion.div
          className="flex flex-col h-full w-full bg-black/80 backdrop-blur-lg text-white antialiased font-mono p-2 overflow-hidden"
          style={{
            fontSize: `${fontSize}px`,
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          }}
          animate={
            terminalFlash
              ? {
                  filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"],
                  scale: [1, 1.01, 1],
                }
              : {}
          }
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div
            ref={terminalRef}
            className="flex-1 overflow-auto whitespace-pre-wrap"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.focus();
              if (!isForeground) {
                bringToForeground("terminal");
              }
            }}
            onScroll={handleScroll}
          >
            <AnimatePresence>
              {commandHistory.map((item, index) => (
                <motion.div
                  key={index}
                  className="mb-1"
                  variants={lineVariants}
                  initial="initial"
                  animate={
                    isClearingTerminal
                      ? {
                          opacity: 0,
                          y: -100,
                          filter: "blur(4px)",
                          transition: {
                            duration: 0.3,
                            delay: 0.02 * (commandHistory.length - index),
                          },
                        }
                      : "animate"
                  }
                  exit="exit"
                  layoutId={`terminal-line-${index}`}
                  layout="preserve-aspect"
                  transition={{
                    type: "spring",
                    duration: 0.3,
                    stiffness: 100,
                    damping: 25,
                    mass: 0.8,
                  }}
                >
                  {item.command && (
                    <div className="flex">
                      {item.path === "ai-user" ? (
                        <span className="text-purple-400 mr-1">→ ryo</span>
                      ) : (
                        <span className="text-green-400 mr-1">
                          ➜ {item.path === "/" ? "/" : item.path}
                        </span>
                      )}
                      <span>{item.command}</span>
                    </div>
                  )}
                  {item.output && (
                    <div
                      className={`ml-0 ${
                        item.path === "ai-thinking" ? "text-gray-400" : ""
                      } ${
                        item.path === "ai-assistant"
                          ? "text-purple-300 italic"
                          : ""
                      } ${item.path === "ai-error" ? "text-red-400" : ""}`}
                    >
                      {item.path === "ai-thinking" ? (
                        <div>
                          <span className="text-gray-400">
                            {item.output.split(" ")[0]}
                          </span>
                          <span className="text-gray-500 italic shimmer-subtle">
                            {" ryo is thinking"}
                            <AnimatedEllipsis />
                          </span>
                        </div>
                      ) : item.path === "ai-assistant" ? (
                        <motion.div
                          layout="position"
                          transition={{
                            type: "spring",
                            duration: 0.3,
                            stiffness: 100,
                            damping: 25,
                            mass: 0.8,
                          }}
                        >
                          {(() => {
                            // Process the message to extract HTML and text parts
                            const { htmlContent, textContent, hasHtml } =
                              extractHtmlContent(item.output);

                            // Only mark as streaming if this specific message is the one currently being updated
                            const isThisMessageStreaming =
                              isAiLoading &&
                              aiMessages.length > 0 &&
                              aiMessages[aiMessages.length - 1].id ===
                                item.messageId &&
                              index === commandHistory.length - 1;

                            return (
                              <>
                                {/* Show only non-HTML text content */}
                                {textContent && (
                                  <span className="text-purple-300">
                                    {textContent}
                                  </span>
                                )}

                                {/* Show HTML preview if there's HTML content */}
                                {hasHtml && htmlContent && (
                                  <HtmlPreview
                                    htmlContent={htmlContent}
                                    onInteractionChange={
                                      handleHtmlPreviewInteraction
                                    }
                                    isStreaming={isThisMessageStreaming}
                                    terminalRef={terminalRef}
                                  />
                                )}
                              </>
                            );
                          })()}
                        </motion.div>
                      ) : animatedLines.has(index) ? (
                        <TypewriterText
                          text={item.output}
                          speed={10}
                          className=""
                        />
                      ) : (
                        <>
                          {item.output}
                          {isHtmlCodeBlock(item.output).isHtml && (
                            <HtmlPreview
                              htmlContent={isHtmlCodeBlock(item.output).content}
                              onInteractionChange={handleHtmlPreviewInteraction}
                              isStreaming={false}
                              terminalRef={terminalRef}
                            />
                          )}
                        </>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            <div className="relative">
              <form
                onSubmit={handleCommandSubmit}
                className="flex transition-all duration-200"
              >
                {isInAiMode ? (
                  <span className="text-purple-400 mr-1 whitespace-nowrap">
                    {isAiLoading
                      ? spinnerChars[spinnerIndex] + " ryo"
                      : "→ ryo"}
                  </span>
                ) : (
                  <span className="text-green-400 mr-1 whitespace-nowrap">
                    ➜ {currentPath === "/" ? "/" : currentPath}
                  </span>
                )}
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={currentCommand}
                    onChange={(e) => setCurrentCommand(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full text-white focus:outline-none bg-transparent"
                    style={{ fontSize: `${fontSize}px` }}
                    autoFocus
                  />
                  {isAiLoading && isInAiMode && (
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex items-center">
                      <span className="text-gray-400/40 opacity-30 shimmer">
                        is thinking
                        <AnimatedEllipsis />
                      </span>
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      </WindowFrame>
      <HelpDialog
        isOpen={isHelpDialogOpen}
        onOpenChange={setIsHelpDialogOpen}
        appName="Terminal"
        helpItems={helpItems || []}
      />
      <AboutDialog
        isOpen={isAboutDialogOpen}
        onOpenChange={setIsAboutDialogOpen}
        metadata={
          appMetadata || {
            name: "Terminal",
            version: "1.0",
            creator: {
              name: "ryOS Developer",
              url: "https://github.com/ryokun6/ryos",
            },
            github: "https://github.com/ryokun6/ryos",
            icon: "/icons/terminal.png",
          }
        }
      />
    </>
  );
}
