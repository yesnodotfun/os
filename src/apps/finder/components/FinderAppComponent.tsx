import { WindowFrame } from "@/components/layout/WindowFrame";
import { FinderMenuBar } from "./FinderMenuBar";
import { AppProps } from "@/apps/base/types";
import { useState, useRef } from "react";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { FileList } from "./FileList";
import { useFileSystem } from "../hooks/useFileSystem";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";

export function FinderAppComponent({
  onClose,
  isWindowOpen,
  isForeground = true,
}: AppProps) {
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
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
