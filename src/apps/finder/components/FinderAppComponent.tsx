import { WindowFrame } from "@/components/layout/WindowFrame";
import { FinderMenuBar } from "./FinderMenuBar";
import { AppProps } from "@/apps/base/types";
import { useState } from "react";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { FileList } from "./FileList";
import { useFileSystem } from "../hooks/useFileSystem";
import { Button } from "@/components/ui/button";

export function FinderAppComponent({
  onClose,
  isWindowOpen,
  isForeground = true,
}: AppProps) {
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const {
    currentPath,
    files,
    selectedFile,
    isLoading,
    error,
    handleFileOpen,
    handleFileSelect,
    navigateUp,
  } = useFileSystem();

  if (!isWindowOpen) return null;

  return (
    <>
      <FinderMenuBar
        onClose={onClose}
        onShowHelp={() => setIsHelpDialogOpen(true)}
        onShowAbout={() => setIsAboutDialogOpen(true)}
      />
      <WindowFrame
        appId="finder"
        title="Finder"
        onClose={onClose}
        isForeground={isForeground}
      >
        <div className="flex flex-col h-full bg-white">
          <div className="flex items-center gap-2 p-2 border-b">
            <Button
              variant="ghost"
              size="sm"
              onClick={navigateUp}
              disabled={currentPath === "/"}
              className="text-lg px-2 py-0"
            >
              ⬅️
            </Button>
            <div className="flex-1 text-sm font-mono truncate">
              {currentPath}
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
                files={files}
                onFileOpen={handleFileOpen}
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
              />
            )}
          </div>
        </div>
      </WindowFrame>
      <HelpDialog
        isOpen={isHelpDialogOpen}
        onOpenChange={setIsHelpDialogOpen}
        appName="Finder"
        helpItems={[
          {
            icon: "🔍",
            title: "Browse Files",
            description: "Navigate through your files and folders",
          },
          {
            icon: "📁",
            title: "Create Folders",
            description: "Organize your files with new folders",
          },
          {
            icon: "🗑️",
            title: "Delete Files",
            description: "Remove unwanted files and folders",
          },
        ]}
      />
      <AboutDialog
        isOpen={isAboutDialogOpen}
        onOpenChange={setIsAboutDialogOpen}
        metadata={{
          name: "Finder",
          version: "1.0.0",
          creator: {
            name: "Ryo",
            url: "https://github.com/ryoid",
          },
          github: "https://github.com/ryoid/soundboard",
          icon: "🔍",
        }}
      />
    </>
  );
}
