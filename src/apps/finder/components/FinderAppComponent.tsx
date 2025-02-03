import { WindowFrame } from "@/components/layout/WindowFrame";
import { FinderMenuBar, ViewType, SortType } from "./FinderMenuBar";
import { AppProps } from "@/apps/base/types";
import { useState, useRef, useEffect } from "react";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { FileList } from "./FileList";
import { useFileSystem } from "../hooks/useFileSystem";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { appMetadata, helpItems } from "../index";
import { calculateStorageSpace } from "@/utils/storage";

export function FinderAppComponent({
  onClose,
  isWindowOpen,
  isForeground = true,
}: AppProps) {
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const [isEmptyTrashDialogOpen, setIsEmptyTrashDialogOpen] = useState(false);
  const [viewType, setViewType] = useState<ViewType>("small");
  const [sortType, setSortType] = useState<SortType>("name");
  const pathInputRef = useRef<HTMLInputElement>(null);
  const {
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
    emptyTrash,
    trashItems,
    navigateBack,
    navigateForward,
    canNavigateBack,
    canNavigateForward,
  } = useFileSystem();

  // Add storage space state
  const [storageSpace, setStorageSpace] = useState(calculateStorageSpace());

  // Update storage space periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStorageSpace(calculateStorageSpace());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Handle initial path from launch event
  useEffect(() => {
    const initialPath = localStorage.getItem("app_finder_initialPath");
    if (initialPath) {
      navigateToPath(initialPath);
      localStorage.removeItem("app_finder_initialPath");
    }
  }, [navigateToPath]);

  const sortedFiles = [...files].sort((a, b) => {
    switch (sortType) {
      case "name":
        return a.name.localeCompare(b.name);
      case "kind": {
        // Sort by directory first, then by file extension
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        const extA = a.name.split(".").pop() || "";
        const extB = b.name.split(".").pop() || "";
        return extA.localeCompare(extB) || a.name.localeCompare(b.name);
      }
      case "size":
        // For now, directories are considered smaller than files
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return 0;
      case "date":
        // We'll need to add date metadata to FileItem to properly implement this
        return 0;
      default:
        return 0;
    }
  });

  const handleEmptyTrash = () => {
    setIsEmptyTrashDialogOpen(true);
  };

  const confirmEmptyTrash = () => {
    emptyTrash();
    setIsEmptyTrashDialogOpen(false);
  };

  if (!isWindowOpen) return null;

  return (
    <>
      <FinderMenuBar
        onClose={onClose}
        onShowHelp={() => setIsHelpDialogOpen(true)}
        onShowAbout={() => setIsAboutDialogOpen(true)}
        viewType={viewType}
        onViewTypeChange={setViewType}
        sortType={sortType}
        onSortTypeChange={setSortType}
        selectedFile={selectedFile}
        onMoveToTrash={moveToTrash}
        onEmptyTrash={handleEmptyTrash}
        isTrashEmpty={trashItems.length === 0}
        onNavigateBack={navigateBack}
        onNavigateForward={navigateForward}
        canNavigateBack={canNavigateBack()}
        canNavigateForward={canNavigateForward()}
        onNavigateToPath={navigateToPath}
      />
      <WindowFrame
        appId="finder"
        title={
          currentPath === "/"
            ? "Macintosh HD"
            : currentPath.split("/").filter(Boolean).pop() || "Finder"
        }
        onClose={onClose}
        isForeground={isForeground}
      >
        <div className="flex flex-col h-full w-full bg-white">
          <div className="flex flex-col gap-1 p-1 bg-gray-100 border-b border-black">
            <div className="flex gap-2 items-center">
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={navigateUp}
                  disabled={currentPath === "/"}
                  className="h-8 w-8"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>
              <Input
                ref={pathInputRef}
                value={currentPath}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  navigateToPath(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    navigateToPath((e.target as HTMLInputElement).value);
                  }
                }}
                className="flex-1"
                placeholder="Enter path"
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                Loading...
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full text-red-500">
                {error}
              </div>
            ) : (
              <FileList
                files={sortedFiles}
                onFileOpen={handleFileOpen}
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
                viewType={viewType}
              />
            )}
          </div>
          <div className="flex items-center justify-between px-2 py-1 text-[10px] font-[Geneva-12] antialiased bg-gray-100 border-t border-gray-300">
            <span>
              {sortedFiles.length} item{sortedFiles.length !== 1 ? "s" : ""}
            </span>
            <span>
              {Math.round((storageSpace.available / 1024 / 1024) * 10) / 10} MB
              available
            </span>
          </div>
        </div>
      </WindowFrame>
      <HelpDialog
        isOpen={isHelpDialogOpen}
        onOpenChange={setIsHelpDialogOpen}
        appName="Finder"
        helpItems={helpItems}
      />
      <AboutDialog
        isOpen={isAboutDialogOpen}
        onOpenChange={setIsAboutDialogOpen}
        metadata={appMetadata}
      />
      <ConfirmDialog
        isOpen={isEmptyTrashDialogOpen}
        onOpenChange={setIsEmptyTrashDialogOpen}
        onConfirm={confirmEmptyTrash}
        title="Empty Trash"
        description="Are you sure you want to empty the Trash? This action cannot be undone."
      />
    </>
  );
}
