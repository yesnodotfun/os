import { useState, useEffect } from "react";
import { FileItem } from "../components/FileList";
import { APP_STORAGE_KEYS } from "@/utils/storage";
import { getNonFinderApps } from "@/config/appRegistry";
import { useLaunchApp } from "@/hooks/useLaunchApp";

// Sample documents
interface Document {
  name: string;
  content: string;
}

interface TrashItem extends FileItem {
  originalPath: string;
  deletedAt: number;
}

const DOCUMENTS: Document[] = [
  {
    name: "README.md",
    content: `# ryOS

A web-based operating system experience inspired by classic Mac OS System 7. Built using modern web technologies including React, Vite, TailwindCSS, and shadcn/ui components.

## Features

- Classic System 7 UI with Chicago Kare font
- Window management (drag, resize, minimize)
- File system with Documents and Applications folders
- Multiple built-in applications
- Local storage persistence
- Modern audio features with WaveSurfer.js and Tone.js
- Responsive design for all screen sizes
- System-wide sound effects and themes
- Backup and restore functionality

## Built-in Applications

- **Finder**: Browse and manage your files
- **TextEdit**: Create and edit documents
- **Soundboard**: Create and play custom soundboards
  - Record from microphone
  - Multiple soundboards
  - Waveform visualization
  - Keyboard shortcuts
  - Import/Export support
- **Control Panels**: Customize system settings
  - Appearance themes
  - Sound settings
  - System management
  - Backup/Restore
- **Minesweeper**: Classic puzzle game
- **Internet Explorer**: Browse the web
- **Chats**: Chat with AI assistant

## Getting Started

- Double-click on any app icon to launch it
- Use the **Apple menu (🍎)** in the top-left to access system functions
- Files are automatically saved to your browser's storage
- Drag windows to move them, click and drag window edges to resize
- Use Control Panels to customize your experience

## Technical Details

- Built with React 18 and TypeScript
- Vite for fast development and bundling
- TailwindCSS for styling
- shadcn/ui components
- Bun as package manager
- WaveSurfer.js for audio visualization
- Tone.js for audio synthesis

Visit https://github.com/ryokun6/soundboard for more information.`,
  },
  {
    name: "Quick Tips.md",
    content: `# Quick Tips

## Using Apps
- Launch apps from the Finder, Desktop, or Apple menu
- Multiple apps can run simultaneously
- Windows can be moved, resized, and minimized
- Use Control Panels to customize your experience

## Finder
- Browse files in Documents, Applications, and Trash
- Navigate with back/forward buttons or path bar
- Sort files by name, kind, size, or date
- Multiple view options (icons, list)
- Move files to Trash and empty when needed
- Monitor available storage space

## TextEdit
- Create and edit rich text documents
- Format text with bold, italic, and underline
- Align text and create ordered/unordered lists
- Use slash commands (/) for quick formatting
- Record audio input for dictation
- Auto-saves your work
- Export documents when needed

## Soundboard
- Create multiple custom soundboards
- Record sounds directly from your microphone
- Customize with emojis and titles
- Play sounds with clicks or number keys (1-9)
- View sound waveforms with WaveSurfer.js
- Import/export soundboards for sharing
- Auto-saves your recordings
- Choose input device
- Toggle waveform/emoji display

## Control Panels
- Customize system appearance
  - Choose from tiled patterns or photos
  - Multiple categories of wallpapers
  - Real-time preview
- Adjust sound settings
  - Enable/disable UI sounds
  - Configure typing synthesis
  - Choose synth presets
- Manage system
  - Backup all settings
  - Restore from backup
  - Reset to defaults
  - Format file system

## Minesweeper
- Classic puzzle game with modern features
- Left-click to reveal cells
- Right-click to flag mines
- Sound effects for actions
- Track remaining mines
- Start new game anytime

## Internet Explorer
- Browse web content
- Time travel feature to see historical dates
- Add websites to favorites
- Modern browsing experience
- Classic System 7 style interface

## Chat with Ryo
- Chat with Ryo (AI version)
- Get help with system features
- Ask about design and concepts
- Natural conversation interface
- Modern AI-powered assistance

## Tips & Tricks
- Use keyboard shortcuts for efficiency
- Right-click for context menus
- Drag windows to organize workspace
- All changes save automatically
- Files persist between sessions
- Export important data locally
- Customize system sounds and appearance
- Regular backups recommended
`,
  },
];

// Load documents from localStorage
const loadDocuments = (): Document[] => {
  const savedDocs = localStorage.getItem("documents");
  return savedDocs ? JSON.parse(savedDocs) : DOCUMENTS;
};

// Save documents to localStorage
const saveDocuments = (docs: Document[]) => {
  localStorage.setItem("documents", JSON.stringify(docs));
};

// Load trash items from localStorage
const loadTrashItems = (): TrashItem[] => {
  const savedTrash = localStorage.getItem("trash_items");
  return savedTrash ? JSON.parse(savedTrash) : [];
};

// Save trash items to localStorage
const saveTrashItems = (items: TrashItem[]) => {
  localStorage.setItem("trash_items", JSON.stringify(items));
};

export function useFileSystem(initialPath: string = "/") {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [documents, setDocuments] = useState(loadDocuments());
  const [trashItems, setTrashItems] = useState<TrashItem[]>(loadTrashItems());
  const [history, setHistory] = useState<string[]>([initialPath]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const launchApp = useLaunchApp();

  // Load files whenever path, documents, or trash items change
  useEffect(() => {
    loadFiles();
  }, [currentPath]);

  // Listen for file save events
  useEffect(() => {
    const handleFileSave = (event: CustomEvent<FileItem>) => {
      if (!event.detail.content) return;

      const newDoc: Document = {
        name: event.detail.name,
        content: event.detail.content,
      };

      setDocuments((prevDocs) => {
        const newDocs = [...prevDocs];
        const existingIndex = newDocs.findIndex(
          (doc) => doc.name === newDoc.name
        );

        if (existingIndex >= 0) {
          newDocs[existingIndex] = newDoc;
        } else {
          newDocs.push(newDoc);
        }

        saveDocuments(newDocs);
        return newDocs;
      });
    };

    window.addEventListener("saveFile", handleFileSave as EventListener);
    return () => {
      window.removeEventListener("saveFile", handleFileSave as EventListener);
    };
  }, []); // Remove documents dependency

  // Save documents to localStorage whenever they change
  useEffect(() => {
    saveDocuments(documents);
    loadFiles();
  }, [documents]);

  // Save trash items to localStorage whenever they change
  useEffect(() => {
    saveTrashItems(trashItems);
    loadFiles();
  }, [trashItems]);

  async function loadFiles() {
    setIsLoading(true);
    setError(undefined);

    try {
      let simulatedFiles: FileItem[] = [];

      // Root directory
      if (currentPath === "/") {
        simulatedFiles = [
          {
            name: "Applications",
            isDirectory: true,
            path: "/Applications",
            icon: "/icons/applications.png",
          },
          {
            name: "Documents",
            isDirectory: true,
            path: "/Documents",
            icon: "/icons/documents.png",
          },
          {
            name: "Trash",
            isDirectory: true,
            path: "/Trash",
            icon:
              trashItems.length > 0
                ? "/icons/trash-full.png"
                : "/icons/trash-empty.png",
          },
        ];
      }
      // Applications directory
      else if (currentPath === "/Applications") {
        simulatedFiles = getNonFinderApps().map((app) => ({
          name: app.name,
          isDirectory: false,
          path: `/Applications/${app.name}`,
          icon: app.icon,
          appId: app.id,
        }));
      }
      // Documents directory
      else if (currentPath === "/Documents") {
        simulatedFiles = documents.map((doc) => ({
          name: doc.name,
          isDirectory: false,
          path: `/Documents/${doc.name}`,
          icon: "/icons/file-text.png",
          content: doc.content,
        }));
      }
      // Trash directory
      else if (currentPath === "/Trash") {
        simulatedFiles = trashItems.map((item) => ({
          ...item,
          path: `/Trash/${item.name}`,
        }));
      }

      setFiles(simulatedFiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setIsLoading(false);
    }
  }

  function handleFileOpen(file: FileItem) {
    if (file.isDirectory) {
      setCurrentPath(file.path);
      return;
    }

    // Handle opening files based on their location
    if (file.path.startsWith("/Applications/")) {
      // Launch the corresponding app
      if (file.appId) {
        const appState = localStorage.getItem(
          APP_STORAGE_KEYS[file.appId as keyof typeof APP_STORAGE_KEYS]?.WINDOW
        );
        if (!appState) {
          // Set initial window state if not exists
          localStorage.setItem(
            APP_STORAGE_KEYS[file.appId as keyof typeof APP_STORAGE_KEYS]
              ?.WINDOW,
            JSON.stringify({
              position: { x: 100, y: 100 },
              size: { width: 600, height: 400 },
            })
          );
        }
        // Dispatch app launch event
        launchApp(file.appId);
      }
    } else if (file.path.startsWith("/Documents/")) {
      // Open document in TextEdit
      if (file.content) {
        // Launch TextEdit first
        const textEditState = localStorage.getItem(
          APP_STORAGE_KEYS.textedit.WINDOW
        );
        if (!textEditState) {
          localStorage.setItem(
            APP_STORAGE_KEYS.textedit.WINDOW,
            JSON.stringify({
              position: { x: 100, y: 100 },
              size: { width: 600, height: 400 },
            })
          );
        }

        // Store the file content temporarily
        localStorage.setItem(
          "pending_file_open",
          JSON.stringify({
            path: file.path,
            content: file.content,
          })
        );

        // Launch TextEdit
        launchApp("textedit");
      }
    }
  }

  function handleFileSelect(file: FileItem) {
    setSelectedFile(file);
  }

  function navigateUp() {
    if (currentPath === "/") return;
    const parentPath = currentPath.split("/").slice(0, -1).join("/") || "/";
    navigateToPath(parentPath);
  }

  function navigateToPath(path: string) {
    // Ensure path starts with /
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;

    // Add to history if it's a new path
    if (normalizedPath !== currentPath) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(normalizedPath);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setCurrentPath(normalizedPath);
    }
  }

  function navigateBack() {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setCurrentPath(history[historyIndex - 1]);
    }
  }

  function navigateForward() {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setCurrentPath(history[historyIndex + 1]);
    }
  }

  function canNavigateBack() {
    return historyIndex > 0;
  }

  function canNavigateForward() {
    return historyIndex < history.length - 1;
  }

  function moveToTrash(file: FileItem) {
    if (file.path === "/Trash" || file.path.startsWith("/Trash/")) return;

    const trashItem: TrashItem = {
      ...file,
      originalPath: file.path,
      deletedAt: Date.now(),
    };

    const newTrashItems = [...trashItems, trashItem];
    setTrashItems(newTrashItems);
    saveTrashItems(newTrashItems);

    // Remove from documents if it's a document
    if (file.path.startsWith("/Documents/")) {
      const newDocs = documents.filter((doc) => doc.name !== file.name);
      setDocuments(newDocs);
      saveDocuments(newDocs);
    }

    loadFiles();
  }

  function restoreFromTrash(file: FileItem) {
    if (!file.path.startsWith("/Trash/")) return;

    const trashItem = trashItems.find((item) => item.name === file.name);
    if (!trashItem) return;

    // Restore to original location
    if (trashItem.originalPath.startsWith("/Documents/")) {
      const newDoc: Document = {
        name: trashItem.name,
        content: trashItem.content || "",
      };
      const newDocs = [...documents, newDoc];
      setDocuments(newDocs);
      saveDocuments(newDocs);
    }

    // Remove from trash
    const newTrashItems = trashItems.filter((item) => item.name !== file.name);
    setTrashItems(newTrashItems);
    saveTrashItems(newTrashItems);

    loadFiles();
  }

  function emptyTrash() {
    setTrashItems([]);
    saveTrashItems([]);
  }

  function saveFile(file: FileItem) {
    if (!file.content) return;

    const newDoc: Document = {
      name: file.name,
      content: file.content,
    };

    setDocuments((prevDocs) => {
      const newDocs = [...prevDocs];
      const existingIndex = newDocs.findIndex(
        (doc) => doc.name === newDoc.name
      );

      if (existingIndex >= 0) {
        newDocs[existingIndex] = newDoc;
      } else {
        newDocs.push(newDoc);
      }

      return newDocs;
    });
  }

  function renameFile(oldName: string, newName: string) {
    setDocuments((prevDocs) => {
      const newDocs = [...prevDocs];
      const existingIndex = newDocs.findIndex((doc) => doc.name === oldName);

      if (existingIndex >= 0) {
        newDocs[existingIndex] = {
          ...newDocs[existingIndex],
          name: newName,
        };
      }

      return newDocs;
    });
  }

  return {
    currentPath,
    files,
    selectedFile,
    isLoading,
    error,
    handleFileOpen,
    handleFileSelect,
    navigateUp,
    navigateToPath,
    moveToTrash,
    restoreFromTrash,
    emptyTrash,
    trashItems,
    navigateBack,
    navigateForward,
    canNavigateBack,
    canNavigateForward,
    saveFile,
    setSelectedFile,
    renameFile,
  };
}
