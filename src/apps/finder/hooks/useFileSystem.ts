import { useState, useEffect } from "react";
import { FileItem } from "../components/FileList";

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
      // For now, we'll simulate some files
      const simulatedFiles: FileItem[] = [
        {
          name: "Documents",
          isDirectory: true,
          path: "/Documents",
        },
        {
          name: "Downloads",
          isDirectory: true,
          path: "/Downloads",
        },
        {
          name: "Pictures",
          isDirectory: true,
          path: "/Pictures",
        },
        {
          name: "Music",
          isDirectory: true,
          path: "/Music",
        },
        {
          name: "README.md",
          isDirectory: false,
          path: "/README.md",
        },
        {
          name: "package.json",
          isDirectory: false,
          path: "/package.json",
        },
      ];

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
    }
    // Handle file opening later
  }

  function handleFileSelect(file: FileItem) {
    setSelectedFile(file);
  }

  function navigateUp() {
    if (currentPath === "/") return;
    const parentPath = currentPath.split("/").slice(0, -1).join("/") || "/";
    setCurrentPath(parentPath);
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
  };
}
