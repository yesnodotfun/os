import { useState } from "react";
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { ControlPanelsMenuBar } from "./ControlPanelsMenuBar";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { helpItems, appMetadata } from "..";

export function ControlPanelsAppComponent({
  isWindowOpen,
  onClose,
  isForeground,
}: AppProps) {
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);

  if (!isWindowOpen) return null;

  return (
    <>
      <ControlPanelsMenuBar
        onClose={onClose}
        onShowHelp={() => setIsHelpDialogOpen(true)}
        onShowAbout={() => setIsAboutDialogOpen(true)}
      />
      <WindowFrame
        title="Control Panels"
        onClose={onClose}
        isForeground={isForeground}
        appId="control-panels"
      >
        <div className="flex flex-col h-full bg-[#c0c0c0] p-2 w-full">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
            <div className="flex flex-col items-center p-4 bg-[#E3E3E3] border-t-2 border-l-2 border-[#FFFFFF] border-b-2 border-r-2 border-[#888888] hover:brightness-95 cursor-pointer">
              <span className="text-4xl mb-2">🎨</span>
              <span className="text-sm">Appearance</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-[#E3E3E3] border-t-2 border-l-2 border-[#FFFFFF] border-b-2 border-r-2 border-[#888888] hover:brightness-95 cursor-pointer">
              <span className="text-4xl mb-2">🔊</span>
              <span className="text-sm">Sound</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-[#E3E3E3] border-t-2 border-l-2 border-[#FFFFFF] border-b-2 border-r-2 border-[#888888] hover:brightness-95 cursor-pointer">
              <span className="text-4xl mb-2">⌨️</span>
              <span className="text-sm">Keyboard</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-[#E3E3E3] border-t-2 border-l-2 border-[#FFFFFF] border-b-2 border-r-2 border-[#888888] hover:brightness-95 cursor-pointer">
              <span className="text-4xl mb-2">📍</span>
              <span className="text-sm">Location</span>
            </div>
          </div>
        </div>
        <HelpDialog
          isOpen={isHelpDialogOpen}
          onOpenChange={setIsHelpDialogOpen}
          helpItems={helpItems}
          appName="Control Panels"
        />
        <AboutDialog
          isOpen={isAboutDialogOpen}
          onOpenChange={setIsAboutDialogOpen}
          metadata={appMetadata}
        />
      </WindowFrame>
    </>
  );
}
