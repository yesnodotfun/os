import { useState, useEffect } from "react";
import { FileItem } from "../components/FileList";
import { APP_STORAGE_KEYS } from "@/utils/storage";
import { getNonFinderApps } from "@/config/appRegistry";
import { useLaunchApp } from "@/hooks/useLaunchApp";

// Sample documents
interface Document {
  name: string;
  content: string;
  type?: string;
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

// Add these helper functions at the top of the file
const MAX_CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks for Safari compatibility

function saveChunkedData(key: string, data: string) {
  try {
    // Clear any existing chunks
    const chunkKeys = Object.keys(localStorage).filter((k) =>
      k.startsWith(`${key}_chunk_`)
    );
    chunkKeys.forEach((k) => localStorage.removeItem(k));

    // Split data into chunks
    const numChunks = Math.ceil(data.length / MAX_CHUNK_SIZE);
    for (let i = 0; i < numChunks; i++) {
      const chunk = data.substr(i * MAX_CHUNK_SIZE, MAX_CHUNK_SIZE);
      localStorage.setItem(`${key}_chunk_${i}`, chunk);
    }
    // Store metadata
    localStorage.setItem(`${key}_chunks`, numChunks.toString());
    return true;
  } catch (e) {
    console.error("Error saving chunked data:", e);
    return false;
  }
}

function loadChunkedData(key: string): string | null {
  try {
    const numChunks = parseInt(localStorage.getItem(`${key}_chunks`) || "0");
    if (numChunks === 0) return null;

    let data = "";
    for (let i = 0; i < numChunks; i++) {
      const chunk = localStorage.getItem(`${key}_chunk_${i}`);
      if (chunk === null) return null;
      data += chunk;
    }
    return data;
  } catch (e) {
    console.error("Error loading chunked data:", e);
    return null;
  }
}

// Modify the saveImages function to use chunking
const saveImages = (images: Document[]) => {
  try {
    const imagesJson = JSON.stringify(images);
    if (imagesJson.length > MAX_CHUNK_SIZE) {
      // Use chunking for large data
      if (!saveChunkedData("images", imagesJson)) {
        console.error("Failed to save chunked images data");
      }
    } else {
      // Use regular localStorage for small data
      localStorage.setItem("images", imagesJson);
    }
  } catch (e) {
    console.error("Error saving images:", e);
  }
};

// Modify the loadImages function to handle chunks
const loadImages = (): Document[] => {
  try {
    // Try loading chunked data first
    const chunkedData = loadChunkedData("images");
    if (chunkedData) {
      return JSON.parse(chunkedData);
    }
    // Fall back to regular localStorage
    const savedImages = localStorage.getItem("images");
    return savedImages ? JSON.parse(savedImages) : [];
  } catch (e) {
    console.error("Error loading images:", e);
    return [];
  }
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

// Helper function to detect file type
function getFileType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  switch (ext) {
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "bmp":
      return "image";
    case "md":
      return "markdown";
    case "txt":
      return "text";
    default:
      return "unknown";
  }
}

// Helper function to get file icon based on type
function getFileIcon(fileName: string, isDirectory: boolean): string {
  if (isDirectory) return "/icons/directory.png";

  const type = getFileType(fileName);
  switch (type) {
    case "image":
      return "/icons/image.png";
    case "markdown":
    case "text":
      return "/icons/file-text.png";
    default:
      return "/icons/file.png";
  }
}

export function useFileSystem(initialPath: string = "/") {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [documents, setDocuments] = useState(loadDocuments());
  const [images, setImages] = useState(loadImages());
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
        type: event.detail.type || getFileType(event.detail.name),
      };

      // Only save to one location based on the file path
      if (event.detail.path.startsWith("/Images/")) {
        setImages((prevImages) => {
          const newImages = [...prevImages];
          const existingIndex = newImages.findIndex(
            (img) => img.name === newDoc.name
          );

          if (existingIndex >= 0) {
            newImages[existingIndex] = newDoc;
          } else {
            newImages.push(newDoc);
          }

          saveImages(newImages);
          return newImages;
        });

        // Remove from documents if it exists there
        setDocuments((prevDocs) => {
          const newDocs = prevDocs.filter((doc) => doc.name !== newDoc.name);
          saveDocuments(newDocs);
          return newDocs;
        });
      } else if (event.detail.path.startsWith("/Documents/")) {
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

        // Remove from images if it exists there
        setImages((prevImages) => {
          const newImages = prevImages.filter(
            (img) => img.name !== newDoc.name
          );
          saveImages(newImages);
          return newImages;
        });
      }
    };

    window.addEventListener("saveFile", handleFileSave as EventListener);
    return () => {
      window.removeEventListener("saveFile", handleFileSave as EventListener);
    };
  }, []); // Keep empty dependency array

  // Save documents to localStorage whenever they change
  useEffect(() => {
    saveDocuments(documents);
    loadFiles();
  }, [documents]);

  // Save images to localStorage whenever they change
  useEffect(() => {
    saveImages(images);
    loadFiles();
  }, [images]);

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
            type: "directory",
          },
          {
            name: "Documents",
            isDirectory: true,
            path: "/Documents",
            icon: "/icons/documents.png",
            type: "directory",
          },
          {
            name: "Images",
            isDirectory: true,
            path: "/Images",
            icon: "/icons/images.png",
            type: "directory",
          },
          {
            name: "Trash",
            isDirectory: true,
            path: "/Trash",
            icon:
              trashItems.length > 0
                ? "/icons/trash-full.png"
                : "/icons/trash-empty.png",
            type: "directory",
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
          type: "application",
        }));
      }
      // Documents directory
      else if (currentPath === "/Documents") {
        simulatedFiles = documents.map((doc) => ({
          name: doc.name,
          isDirectory: false,
          path: `/Documents/${doc.name}`,
          icon: getFileIcon(doc.name, false),
          content: doc.content,
          type: doc.type || getFileType(doc.name),
        }));
      }
      // Images directory
      else if (currentPath === "/Images") {
        simulatedFiles = images.map((img) => ({
          name: img.name,
          isDirectory: false,
          path: `/Images/${img.name}`,
          icon: getFileIcon(img.name, false),
          content: img.content,
          type: img.type || getFileType(img.name),
        }));
      }
      // Trash directory
      else if (currentPath === "/Trash") {
        simulatedFiles = trashItems.map((item) => ({
          ...item,
          path: `/Trash/${item.name}`,
          icon: getFileIcon(item.name, item.isDirectory),
          type: item.type || getFileType(item.name),
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
    } else if (file.path.startsWith("/Images/")) {
      // Launch Paint app with the image
      const paintState = localStorage.getItem(APP_STORAGE_KEYS.paint.WINDOW);
      if (!paintState) {
        localStorage.setItem(
          APP_STORAGE_KEYS.paint.WINDOW,
          JSON.stringify({
            position: { x: 100, y: 100 },
            size: { width: 713, height: 480 },
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

      // Launch Paint
      launchApp("paint");
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
        type: trashItem.type || getFileType(trashItem.name),
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
      type: file.type || getFileType(file.name),
    };

    // Only save to one location based on the file path
    if (file.path.startsWith("/Images/")) {
      setImages((prevImages) => {
        const newImages = [...prevImages];
        const existingIndex = newImages.findIndex(
          (img) => img.name === newDoc.name
        );

        if (existingIndex >= 0) {
          newImages[existingIndex] = newDoc;
        } else {
          newImages.push(newDoc);
        }

        saveImages(newImages);
        return newImages;
      });

      // Remove from documents if it exists there
      setDocuments((prevDocs) => {
        const newDocs = prevDocs.filter((doc) => doc.name !== newDoc.name);
        saveDocuments(newDocs);
        return newDocs;
      });
    } else if (file.path.startsWith("/Documents/")) {
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

      // Remove from images if it exists there
      setImages((prevImages) => {
        const newImages = prevImages.filter((img) => img.name !== newDoc.name);
        saveImages(newImages);
        return newImages;
      });
    }
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
