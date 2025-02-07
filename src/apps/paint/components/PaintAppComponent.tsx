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
import { helpItems, appMetadata } from "..";

export const PaintAppComponent: React.FC<AppProps> = ({
  isWindowOpen,
  onClose,
  isForeground,
}) => {
  const [selectedTool, setSelectedTool] = useState<string>("pencil");
  const [selectedPattern, setSelectedPattern] = useState<string>("pattern-1");
  const [strokeWidth, setStrokeWidth] = useState<number>(1);
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
            {/* Left Toolbar */}
            <div className="flex flex-col gap-2 w-[84px] shrink-0">
              {/* Tools */}
              <div className="bg-white border border-black p-1.5">
                <PaintToolbar
                  selectedTool={selectedTool}
                  onToolSelect={setSelectedTool}
                />
              </div>
              {/* Stroke Width */}
              <div className="bg-white border border-black">
                <PaintStrokeSettings
                  strokeWidth={strokeWidth}
                  onStrokeWidthChange={setStrokeWidth}
                />
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col flex-1 gap-2 min-h-0">
              {/* Canvas */}
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
                  selectedPattern={selectedPattern}
                  strokeWidth={strokeWidth}
                  onCanUndoChange={setCanUndo}
                  onCanRedoChange={setCanRedo}
                />
              </div>

              {/* Pattern Area */}
              <div className="h-[88px] bg-white border border-black flex gap-2 p-1.5">
                {/* Selected Pattern Preview */}
                <div className="w-[72px] h-[72px] border border-black">
                  <img
                    src={`/patterns/Property 1=${
                      selectedPattern.split("-")[1]
                    }.svg`}
                    alt="Selected Pattern"
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Pattern Palette */}
                <div className="flex-1 h-full">
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
      </WindowFrame>
    </>
  );
};
