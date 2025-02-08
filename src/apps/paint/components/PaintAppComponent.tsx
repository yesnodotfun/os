import React, { useState, useRef } from "react";
import { PaintToolbar } from "./PaintToolbar";
import { PaintCanvas } from "./PaintCanvas";
import { PaintMenuBar } from "./PaintMenuBar";
import { PaintPatternPalette } from "./PaintPatternPalette";
import { PaintStrokeSettings } from "./PaintStrokeSettings";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { AppProps } from "../../base/types";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { helpItems, appMetadata } from "..";

export const PaintAppComponent: React.FC<AppProps> = ({
  isWindowOpen,
  onClose,
  isForeground = false,
}) => {
  const [selectedTool, setSelectedTool] = useState<string>("pencil");
  const [selectedPattern, setSelectedPattern] = useState<string>("pattern-1");
  const [strokeWidth, setStrokeWidth] = useState<number>(1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const [isConfirmNewDialogOpen, setIsConfirmNewDialogOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const canvasRef = useRef<{
    undo: () => void;
    redo: () => void;
    clear: () => void;
    exportCanvas: () => string;
    importImage: (dataUrl: string) => void;
  }>();

  const handleUndo = () => {
    canvasRef.current?.undo();
  };

  const handleRedo = () => {
    canvasRef.current?.redo();
  };

  const handleClear = () => {
    canvasRef.current?.clear();
  };

  const handleNewFile = () => {
    if (hasUnsavedChanges) {
      setIsConfirmNewDialogOpen(true);
      return;
    }
    handleClear();
    setCurrentFilePath(null);
    setHasUnsavedChanges(false);
  };

  const handleSave = () => {
    if (!canvasRef.current) return;

    const dataUrl = canvasRef.current.exportCanvas();
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = currentFilePath || "untitled.png";
    a.click();
    setHasUnsavedChanges(false);
  };

  const handleImportFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept =
      "image/png,image/jpeg,image/gif,image/webp,image/bmp,image/svg+xml,image/x-icon";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          canvasRef.current?.importImage(dataUrl);
          setCurrentFilePath(file.name);
          setHasUnsavedChanges(false);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleExportFile = () => {
    handleSave();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        canvasRef.current?.importImage(dataUrl);
        setCurrentFilePath(file.name);
        setHasUnsavedChanges(false);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isWindowOpen) return null;

  return (
    <>
      <PaintMenuBar
        isWindowOpen={isWindowOpen}
        isForeground={isForeground}
        onClose={onClose}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onShowHelp={() => setIsHelpDialogOpen(true)}
        onShowAbout={() => setIsAboutDialogOpen(true)}
        onNewFile={handleNewFile}
        onSave={handleSave}
        onImportFile={handleImportFile}
        onExportFile={handleExportFile}
        hasUnsavedChanges={hasUnsavedChanges}
        currentFilePath={currentFilePath}
        handleFileSelect={handleFileSelect}
      />
      <WindowFrame
        title="MacPaint"
        onClose={onClose}
        isForeground={isForeground}
        appId="paint"
      >
        <div
          className="flex flex-col h-full w-full min-h-0 p-2"
          style={{
            backgroundImage: 'url("/patterns/Property 1=7.svg")',
            backgroundRepeat: "repeat",
            backgroundColor: "#c0c0c0",
          }}
        >
          <div className="flex flex-1 gap-2 w-full min-h-0 px-1">
            {/* Left Toolbar */}
            <div className="flex flex-col gap-2 w-[84px] shrink-0">
              {/* Tools */}
              <div className="bg-white border border-black w-full shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]">
                <PaintToolbar
                  selectedTool={selectedTool}
                  onToolSelect={setSelectedTool}
                />
              </div>
              {/* Stroke Width */}
              <div className="bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]">
                <PaintStrokeSettings
                  strokeWidth={strokeWidth}
                  onStrokeWidthChange={setStrokeWidth}
                />
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col flex-1 gap-2 min-h-0 min-w-0">
              {/* Canvas */}
              <div className="flex-1 bg-white min-h-0 min-w-0 border border-black border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]">
                <PaintCanvas
                  ref={(ref) => {
                    if (ref) {
                      canvasRef.current = {
                        undo: ref.undo,
                        redo: ref.redo,
                        clear: ref.clear,
                        exportCanvas: ref.exportCanvas,
                        importImage: ref.importImage,
                      };
                    }
                  }}
                  selectedTool={selectedTool}
                  selectedPattern={selectedPattern}
                  strokeWidth={strokeWidth}
                  onCanUndoChange={setCanUndo}
                  onCanRedoChange={setCanRedo}
                  onContentChange={() => setHasUnsavedChanges(true)}
                />
              </div>

              {/* Pattern Area */}
              <div className="h-[58px] bg-white border-black flex items-center border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]">
                {/* Selected Pattern Preview */}
                <div className="border-r border-black h-full px-3 flex items-center">
                  <div className="w-[36px] h-[32px] border border-black shrink-0">
                    <img
                      src={`/patterns/Property 1=${
                        selectedPattern.split("-")[1]
                      }.svg`}
                      alt="Selected Pattern"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                {/* Pattern Palette */}
                <div className="flex-1 h-full min-w-0 translate-y-[-1px]">
                  <PaintPatternPalette
                    selectedPattern={selectedPattern}
                    onPatternSelect={setSelectedPattern}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <HelpDialog
          isOpen={isHelpDialogOpen}
          onOpenChange={setIsHelpDialogOpen}
          helpItems={helpItems}
          appName="MacPaint"
        />
        <AboutDialog
          isOpen={isAboutDialogOpen}
          onOpenChange={setIsAboutDialogOpen}
          metadata={appMetadata}
        />
        <ConfirmDialog
          isOpen={isConfirmNewDialogOpen}
          onOpenChange={setIsConfirmNewDialogOpen}
          onConfirm={() => {
            handleClear();
            setCurrentFilePath(null);
            setHasUnsavedChanges(false);
            setIsConfirmNewDialogOpen(false);
          }}
          title="Discard Changes"
          description="You have unsaved changes. Create new file anyway?"
        />
      </WindowFrame>
    </>
  );
};
