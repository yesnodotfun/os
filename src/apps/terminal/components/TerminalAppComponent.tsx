import { useState, useEffect, useRef } from "react";
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

interface CommandHistory {
  command: string;
  output: string;
  path: string;
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
  const spinnerChars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

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
          "You are a helpful AI assistant running in a terminal on ryOS.",
      },
    ],
    experimental_throttle: 50,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  const { currentPath, files, navigateToPath, saveFile, moveToTrash } =
    useFileSystem(loadTerminalCurrentPath());

  const launchApp = useLaunchApp();
  const { toggleApp } = useAppContext();

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

  // Auto-scroll to bottom when command history changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [commandHistory, currentCommand]);

  // Simplify to a single focus effect
  useEffect(() => {
    if (inputRef.current && isForeground) {
      inputRef.current.focus();
    }
  }, [isForeground, commandHistory]);

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
        setCurrentCommand(
          historyCommands[historyCommands.length - 1 - newIndex] || ""
        );
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      // Navigate down through command history
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentCommand(
          historyCommands[historyCommands.length - 1 - newIndex] || ""
        );
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
              output: `${spinnerChars[spinnerIndex]} thinking...`,
              path: "ai-thinking",
            },
          ]);

          // Send the initial prompt
          appendAiMessage({
            role: "user",
            content: initialPrompt,
          });

          return {
            output: `Entering ryo chat mode. Type 'exit' to return to terminal.\nSending initial prompt: ${initialPrompt}`,
            isError: false,
          };
        }

        return {
          output: `Entering ryo chat mode. Type 'exit' to return to terminal.`,
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

  // Function to handle app controls
  const handleAppControls = (messageContent: string) => {
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
  };

  // Reset launched apps when leaving AI mode
  useEffect(() => {
    if (!isInAiMode) {
      launchedAppsRef.current.clear();
    }
  }, [isInAiMode]);

  // Watch for changes in the AI messages to update the terminal display
  useEffect(() => {
    if (!isInAiMode || aiMessages.length <= 1) return;

    // Get the most recent assistant message
    const lastMessage = aiMessages[aiMessages.length - 1];

    // Skip if this isn't an assistant message
    if (lastMessage.role !== "assistant") {
      return;
    }

    // Check if this is a new message or an update to the message we're already processing
    const isNewMessage = lastMessage.id !== lastProcessedMessageIdRef.current;

    // Process the message and handle app controls
    const messageContent = lastMessage.content;
    const cleanedContent = handleAppControls(messageContent);

    // If we're clearing the terminal, don't update messages
    if (isClearingTerminal) return;

    // If this is a streaming update (not loading)
    setCommandHistory((prev) => {
      const newHistory = [...prev];

      // Remove any thinking messages first
      const filteredHistory = newHistory.filter(
        (item) => item.path !== "ai-thinking"
      );

      // Find the most recent assistant message
      const assistantIndex = filteredHistory
        .map((item) => item.path)
        .lastIndexOf("ai-assistant");

      // For a new message
      if (isNewMessage) {
        // Play sound only on first chunk of a new message
        playAiResponseSound();

        // Add new assistant message
        return [
          ...filteredHistory,
          {
            command: "",
            output: cleanedContent,
            path: "ai-assistant",
          },
        ];
      }
      // For a continuing message (update existing response)
      else {
        // Update the existing assistant message with the full content
        if (assistantIndex !== -1) {
          filteredHistory[assistantIndex] = {
            command: "",
            output: cleanedContent,
            path: "ai-assistant",
          };
        } else {
          // No existing message found, create new one
          filteredHistory.push({
            command: "",
            output: cleanedContent,
            path: "ai-assistant",
          });
        }

        return filteredHistory;
      }
    });

    // Store the current message ID being processed
    lastProcessedMessageIdRef.current = lastMessage.id;
  }, [
    aiMessages,
    isInAiMode,
    isAiLoading,
    isClearingTerminal,
    launchApp,
    toggleApp,
    playAiResponseSound,
  ]);

  // Function to handle AI mode commands
  const handleAiCommand = (command: string) => {
    const lowerCommand = command.trim().toLowerCase();

    // Play command sound for AI mode commands too
    playCommandSound();

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
          output: "Exiting ryo chat mode.",
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
        stiffness: 70,
        damping: 20,
        mass: 1.2,
      },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.2 },
    },
  };

  // Track which output lines should use typewriter effect
  const [animatedLines, setAnimatedLines] = useState<Set<number>>(new Set());

  // Add new line to the animated lines set
  useEffect(() => {
    if (commandHistory.length > 0) {
      const newIndex = commandHistory.length - 1;
      const item = commandHistory[newIndex];

      setAnimatedLines((prev) => {
        const newSet = new Set(prev);

        // Only animate certain types of output:
        // - Command outputs that aren't errors or help text and are reasonably sized
        // - Exclude "ls" command output
        // - Exclude welcome message
        // - Exclude AI assistant responses (let them stream naturally)
        if (
          !item.path.startsWith("ai-") &&
          item.output &&
          item.output.length > 0 &&
          item.output.length < 150 &&
          !item.output.startsWith("Command not found") &&
          !item.output.startsWith("Usage:") &&
          !item.output.includes("Available commands") &&
          !item.output.includes("Welcome to ryOS Terminal") &&
          // Don't animate ls command output
          !(item.command && item.command.trim().startsWith("ls"))
        ) {
          newSet.add(newIndex);
        }

        return newSet;
      });
    }
  }, [commandHistory.length]);

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
          className="flex flex-col h-full w-full bg-black/90 backdrop-blur-lg text-white antialiased font-mono p-2 overflow-hidden"
          style={{ fontSize: `${fontSize}px` }}
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
            }}
          >
            <AnimatePresence initial={false} mode="popLayout">
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
                  layout="position"
                  transition={{
                    type: "spring",
                    delay: 0.05 * (index % 3), // Stagger effect for groups of 3
                    duration: 0.3,
                    stiffness: 65,
                    damping: 22,
                    mass: 1.2,
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
                        item.path === "ai-assistant" ? "text-purple-300" : ""
                      } ${item.path === "ai-error" ? "text-red-400" : ""}`}
                    >
                      {item.path === "ai-thinking" ? (
                        <>
                          <span className="text-gray-400">
                            {item.output.split(" ")[0]}
                          </span>
                          <span className="text-gray-400 italic shimmer">
                            {" " + item.output.split(" ").slice(1).join(" ")}
                          </span>
                        </>
                      ) : item.path === "ai-assistant" ? (
                        <span className="text-purple-300">{item.output}</span>
                      ) : animatedLines.has(index) ? (
                        <TypewriterText
                          text={item.output}
                          speed={10}
                          className=""
                        />
                      ) : (
                        item.output
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {isAiLoading && isInAiMode && (
              <div className="mb-1">
                <span className="text-gray-400 italic shimmer">
                  {spinnerChars[spinnerIndex]} thinking...
                </span>
              </div>
            )}
            <form onSubmit={handleCommandSubmit} className="flex">
              {isInAiMode ? (
                <span className="text-purple-400 mr-1 whitespace-nowrap">
                  → ryo
                </span>
              ) : (
                <span className="text-green-400 mr-1 whitespace-nowrap">
                  ➜ {currentPath === "/" ? "/" : currentPath}
                </span>
              )}
              <input
                ref={inputRef}
                type="text"
                value={currentCommand}
                onChange={(e) => setCurrentCommand(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 text-white focus:outline-none"
                style={{ fontSize: `${fontSize}px` }}
                autoFocus
              />
            </form>
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
