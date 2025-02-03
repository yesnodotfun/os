import { useState, useEffect } from "react";
import { FileItem } from "../components/FileList";
import { APP_STORAGE_KEYS } from "@/utils/storage";
import { getNonFinderApps } from "@/config/appRegistry";

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
    name: "Welcome.txt",
    content: "Welcome to your Mac OS Classic experience!",
  },
  {
    name: "README.md",
    content:
      "# Mac OS Classic\n\nThis is a web-based recreation of the classic Mac OS interface.",
  },
  {
    name: "Notes.txt",
    content: "Important notes and reminders go here.",
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

  useEffect(() => {
    // Listen for file save events
    const handleFileSave = (event: CustomEvent<FileItem>) => {
      if (!event.detail.content) return;

      const newDoc: Document = {
        name: event.detail.name,
        content: event.detail.content,
      };

      const newDocs = [...documents];
      const existingIndex = newDocs.findIndex(
        (doc) => doc.name === newDoc.name
      );

      if (existingIndex >= 0) {
        newDocs[existingIndex] = newDoc;
      } else {
        newDocs.push(newDoc);
      }

      setDocuments(newDocs);
      saveDocuments(newDocs);
      loadFiles(); // Refresh file list
    };

    window.addEventListener("saveFile", handleFileSave as EventListener);
    return () => {
      window.removeEventListener("saveFile", handleFileSave as EventListener);
    };
  }, [documents]);

  useEffect(() => {
    loadFiles();
  }, [currentPath, documents, trashItems]);

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
      const appState = localStorage.getItem(
        APP_STORAGE_KEYS[file.appId as keyof typeof APP_STORAGE_KEYS]?.WINDOW
      );
      if (!appState) {
        // Set initial window state if not exists
        localStorage.setItem(
          APP_STORAGE_KEYS[file.appId as keyof typeof APP_STORAGE_KEYS]?.WINDOW,
          JSON.stringify({
            position: { x: 100, y: 100 },
            size: { width: 600, height: 400 },
          })
        );
      }
      // Dispatch app launch event
      window.dispatchEvent(
        new CustomEvent("launchApp", { detail: { appId: file.appId } })
      );
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
        window.dispatchEvent(
          new CustomEvent("launchApp", { detail: { appId: "textedit" } })
        );
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
  };
}
