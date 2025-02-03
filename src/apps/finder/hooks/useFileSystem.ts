import { useState, useEffect } from "react";
import { FileItem } from "../components/FileList";
import { APP_STORAGE_KEYS } from "@/utils/storage";
import { getNonFinderApps } from "@/config/appRegistry";

// Sample documents
const DOCUMENTS = [
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

export function useFileSystem(initialPath: string = "/") {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    loadFiles();
  }, [currentPath]);

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
        simulatedFiles = DOCUMENTS.map((doc) => ({
          name: doc.name,
          isDirectory: false,
          path: `/Documents/${doc.name}`,
          icon: "/icons/file-text.png",
          content: doc.content,
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
        localStorage.setItem(APP_STORAGE_KEYS.textedit.CONTENT, file.content);
        // Launch TextEdit
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
    setCurrentPath(parentPath);
  }

  function navigateToPath(path: string) {
    // Ensure path starts with /
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    setCurrentPath(normalizedPath);
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
  };
}
