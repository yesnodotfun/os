import { useState, useEffect, useRef } from "react";
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
  "ai",
];

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
  const [fontSize, setFontSize] = useState(14); // Default font size in pixels
  const [isInAiMode, setIsInAiMode] = useState(false);
  const [spinnerIndex, setSpinnerIndex] = useState(0);
  const spinnerChars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

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
          "Welcome to ryOS Terminal v1.0\nType 'help' for a list of available commands.",
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

  // Focus input when window is opened or brought to foreground
  useEffect(() => {
    if (isWindowOpen && isForeground && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isWindowOpen, isForeground]);

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

  // Update thinking message with spinner
  useEffect(() => {
    if (isAiLoading) {
      setCommandHistory((prev) => {
        const newHistory = [...prev];
        const thinkingIndex = newHistory
          .map((item) => item.path)
          .lastIndexOf("ai-thinking");

        if (thinkingIndex !== -1) {
          newHistory[thinkingIndex] = {
            ...newHistory[thinkingIndex],
            output: `${spinnerChars[spinnerIndex]} thinking...`,
          };
        }

        return newHistory;
      });
    }
  }, [spinnerIndex, isAiLoading]);

  // Add an effect to keep focus in the input field during AI interactions
  useEffect(() => {
    if (isInAiMode && inputRef.current && isForeground) {
      // Use a small timeout to allow the DOM to update first
      const focusTimeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 10);

      return () => clearTimeout(focusTimeout);
    }
  }, [isInAiMode, isForeground, aiMessages, spinnerIndex]);

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
    const output = processCommand(currentCommand);

    // Add to command history
    setCommandHistory([
      ...commandHistory,
      {
        command: currentCommand,
        output,
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

  const processCommand = (command: string): string => {
    const { cmd, args } = parseCommand(command);

    switch (cmd) {
      case "help":
        return `
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
  history          - Show command history
  about            - Display information about Terminal
  ai [prompt]      - Start AI chat mode with optional initial prompt
`;
      case "clear":
        // We'll handle this specially after the switch
        setTimeout(() => {
          setCommandHistory([]);
        }, 10);
        return "";

      case "pwd":
        return currentPath;

      case "ls": {
        if (files.length === 0) {
          return "No files found";
        }
        return files
          .map((file) => (file.isDirectory ? file.name : file.name))
          .join("\n");
      }

      case "cd": {
        if (args.length === 0) {
          navigateToPath("/");
          return "";
        }

        // Handle special case for parent directory
        if (args[0] === "..") {
          const pathParts = currentPath.split("/").filter(Boolean);
          const parentPath =
            pathParts.length > 0 ? "/" + pathParts.slice(0, -1).join("/") : "/";
          navigateToPath(parentPath);
          return "";
        }

        let newPath = args[0];

        // Handle relative paths
        if (!newPath.startsWith("/")) {
          newPath = `${currentPath === "/" ? "" : currentPath}/${newPath}`;
        }

        // Direct path navigation
        navigateToPath(newPath);
        return "";
      }

      case "cat": {
        if (args.length === 0) {
          return "Usage: cat <filename>";
        }

        const fileName = args[0];
        const file = files.find((f) => f.name === fileName);

        if (!file) {
          return `File not found: ${fileName}`;
        }

        if (file.isDirectory) {
          return `${fileName} is a directory, not a file`;
        }

        return file.content || `${fileName} is empty`;
      }

      case "mkdir":
        return "Command not implemented: mkdir requires filesystem write access";

      case "touch": {
        if (args.length === 0) {
          return "Usage: touch <filename>";
        }

        const newFileName = args[0];

        // Check if file already exists
        if (files.find((f) => f.name === newFileName)) {
          return `File already exists: ${newFileName}`;
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

        return `Created file: ${newFileName}`;
      }

      case "rm": {
        if (args.length === 0) {
          return "Usage: rm <filename>";
        }

        const fileToDelete = args[0];
        const fileObj = files.find((f) => f.name === fileToDelete);

        if (!fileObj) {
          return `File not found: ${fileToDelete}`;
        }

        moveToTrash(fileObj);
        return `Moved to trash: ${fileToDelete}`;
      }

      case "edit": {
        if (args.length === 0) {
          return "Usage: edit <filename>";
        }

        const fileToEdit = args[0];
        const fileToEditObj = files.find((f) => f.name === fileToEdit);

        if (!fileToEditObj) {
          return `File not found: ${fileToEdit}`;
        }

        if (fileToEditObj.isDirectory) {
          return `${fileToEdit} is a directory, not a file`;
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

        return `Opening ${fileToEdit} in TextEdit...`;
      }

      case "about":
        setTimeout(() => setIsAboutDialogOpen(true), 100);
        return "Opening About dialog...";

      case "history": {
        const cmdHistory = loadTerminalCommandHistory();
        if (cmdHistory.length === 0) {
          return "No command history";
        }
        return cmdHistory
          .map((cmd, idx) => {
            const date = new Date(cmd.timestamp);
            return `${idx + 1}  ${cmd.command}  # ${date.toLocaleString()}`;
          })
          .join("\n");
      }

      case "ai": {
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
              output: "thinking...",
              path: "ai-thinking",
            },
          ]);

          // Send the initial prompt
          appendAiMessage({
            role: "user",
            content: initialPrompt,
          });

          return `Entering AI chat mode. Type 'exit' to return to terminal.\nSending initial prompt: ${initialPrompt}`;
        }

        return `Entering AI chat mode. Type 'exit' to return to terminal.`;
      }

      default:
        return `Command not found: ${cmd}. Type 'help' for a list of available commands.`;
    }
  };

  // Function to handle commands in AI mode
  const handleAiCommand = (command: string) => {
    // If user types 'exit', leave AI mode
    if (command.trim().toLowerCase() === "exit") {
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

      // Add exit command to history
      setCommandHistory([
        ...commandHistory,
        {
          command: "exit",
          output: "Exiting AI chat mode.",
          path: currentPath,
        },
      ]);

      setCurrentCommand("");
      return;
    }

    // Add user command to chat history with special AI mode formatting
    setCommandHistory([
      ...commandHistory,
      {
        command: command,
        output: "",
        path: "ai-user", // Special marker for AI mode user message
      },
      {
        command: "",
        output: `${spinnerChars[spinnerIndex]} thinking...`,
        path: "ai-thinking", // Special marker for thinking state
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

  // Watch for changes in the AI messages to update the terminal display
  useEffect(() => {
    if (isInAiMode && aiMessages.length > 1) {
      // Get the most recent assistant message
      const lastUserMessageIndex = aiMessages
        .map((m) => m.role)
        .lastIndexOf("user");

      if (
        lastUserMessageIndex !== -1 &&
        lastUserMessageIndex < aiMessages.length - 1
      ) {
        const assistantMessage = aiMessages[aiMessages.length - 1];

        if (assistantMessage.role === "assistant") {
          // Replace the most recent "thinking..." message with the actual response
          setCommandHistory((prev) => {
            const newHistory = [...prev];

            // Find the most recent "thinking..." message (search from the end)
            const thinkingIndex = newHistory
              .map((item) => item.path)
              .lastIndexOf("ai-thinking");

            if (thinkingIndex !== -1) {
              // Replace the most recent "thinking..." with the assistant's response
              newHistory[thinkingIndex] = {
                command: "",
                output: assistantMessage.content,
                path: "ai-assistant",
              };
            } else {
              // Check if we already have an assistant message we should update
              const assistantIndex = newHistory
                .map((item) => item.path)
                .lastIndexOf("ai-assistant");

              if (assistantIndex !== -1) {
                // Update the existing assistant message
                newHistory[assistantIndex] = {
                  command: "",
                  output: assistantMessage.content,
                  path: "ai-assistant",
                };
              } else {
                // If no thinking or assistant message found, append a new one
                newHistory.push({
                  command: "",
                  output: assistantMessage.content,
                  path: "ai-assistant",
                });
              }
            }

            return newHistory;
          });
        }
      }
    }
  }, [aiMessages, isInAiMode]);

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

  const resetFontSize = () => {
    setFontSize(14); // Reset to default
  };

  if (!isWindowOpen) return null;

  return (
    <>
      <TerminalMenuBar
        onClose={onClose}
        onShowHelp={() => setIsHelpDialogOpen(true)}
        onShowAbout={() => setIsAboutDialogOpen(true)}
        onClear={() => setCommandHistory([])}
        onIncreaseFontSize={increaseFontSize}
        onDecreaseFontSize={decreaseFontSize}
        onResetFontSize={resetFontSize}
      />
      <WindowFrame
        appId="terminal"
        title="Terminal"
        onClose={onClose}
        isForeground={isForeground}
        transparentBackground={true}
      >
        <div
          className="flex flex-col h-full w-full bg-black/90 backdrop-blur-lg text-white antialiased font-mono p-2 overflow-hidden"
          style={{ fontSize: `${fontSize}px` }}
        >
          <div
            ref={terminalRef}
            className="flex-1 overflow-auto whitespace-pre-wrap"
            onClick={() => inputRef.current?.focus()}
          >
            {commandHistory.map((item, index) => (
              <div key={index} className="mb-1">
                {item.command && (
                  <div className="flex">
                    {item.path === "ai-user" ? (
                      <span className="text-purple-400 mr-1">→ ai</span>
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
                        <span className="text-gray-400 italic">
                          {" " + item.output.split(" ").slice(1).join(" ")}
                        </span>
                      </>
                    ) : (
                      item.output
                    )}
                  </div>
                )}
              </div>
            ))}
            <form onSubmit={handleCommandSubmit} className="flex">
              {isInAiMode ? (
                <span className="text-purple-400 mr-1 whitespace-nowrap">
                  → ai
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
                disabled={isAiLoading}
              />
            </form>
          </div>
        </div>
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
