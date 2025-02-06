import React, { useState, useRef } from "react";
import { PaintToolbar } from "./PaintToolbar";
import { PaintCanvas } from "./PaintCanvas";
import { PaintMenuBar } from "./PaintMenuBar";
import { PaintColorPalette } from "./PaintColorPalette";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { AppProps } from "../../base/types";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { helpItems, appMetadata } from "..";

export const PaintAppComponent: React.FC<AppProps> = ({
  isWindowOpen,
  onClose,
  isForeground,
}) => {
  const [selectedTool, setSelectedTool] = useState<string>("pencil");
  const [selectedColor, setSelectedColor] = useState<string>("#000000");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const canvasRef = useRef<{ undo: () => void; redo: () => void }>();

  const handleUndo = () => {
    canvasRef.current?.undo();
  };

  const handleRedo = () => {
    canvasRef.current?.redo();
  };

  const handleClear = () => {
    // TODO: Implement clear functionality
    console.log("Clear");
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
      />
      <WindowFrame
        title="MacPaint"
        onClose={onClose}
        isForeground={isForeground}
        appId="paint"
      >
        <div className="flex flex-col h-full bg-[#c0c0c0] p-2 w-full min-h-0">
          <div className="flex flex-1 gap-2 w-full min-h-0">
            <div className="flex flex-col gap-1 p-1.5 w-[84px] shrink-0 bg-white min-h-0 overflow-y-auto border border-black">
              <div className="space-y-1">
                <PaintToolbar
                  selectedTool={selectedTool}
                  onToolSelect={setSelectedTool}
                />
                <PaintColorPalette
                  selectedColor={selectedColor}
                  onColorSelect={setSelectedColor}
                />
              </div>
            </div>
            <div className="flex-1 bg-white overflow-hidden min-h-0 border border-black">
              <PaintCanvas
                ref={(ref) => {
                  if (ref) {
                    canvasRef.current = {
                      undo: ref.undo,
                      redo: ref.redo,
                    };
                  }
                }}
                selectedTool={selectedTool}
                selectedColor={selectedColor}
                onCanUndoChange={setCanUndo}
                onCanRedoChange={setCanRedo}
              />
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
      </WindowFrame>
    </>
  );
};
