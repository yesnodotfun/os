import React, { useState } from "react";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { InputDialog } from "@/components/dialogs/InputDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { appMetadata, helpItems } from "..";

// Export type for the dialog controls
export type DialogControls = {
  openHelpDialog: () => void;
  closeHelpDialog: () => void;
  openAboutDialog: () => void;
  closeAboutDialog: () => void;
  openSaveDialog: () => void;
  closeSaveDialog: () => void;
  openConfirmNewDialog: () => void;
  closeConfirmNewDialog: () => void;
  openCloseSaveDialog: () => void;
  closeCloseSaveDialog: () => void;
};

interface DialogManagerProps {
  saveFileName: string;
  setSaveFileName: (name: string) => void;
  closeSaveFileName: string;
  setCloseSaveFileName: (name: string) => void;
  onSaveSubmit: (fileName: string) => Promise<void>;
  onCloseSave: (fileName: string) => Promise<void>;
  onCloseDelete: () => void;
  onConfirmNew: () => void;
  onControlsReady?: (controls: DialogControls) => void;
}

export function DialogManager({
  saveFileName,
  setSaveFileName,
  closeSaveFileName,
  setCloseSaveFileName,
  onSaveSubmit,
  onCloseSave,
  onCloseDelete,
  onConfirmNew,
  onControlsReady,
}: DialogManagerProps) {
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isConfirmNewDialogOpen, setIsConfirmNewDialogOpen] = useState(false);
  const [isCloseSaveDialogOpen, setIsCloseSaveDialogOpen] = useState(false);

  const dialogControls: DialogControls = {
    // Help dialog
    openHelpDialog: () => setIsHelpDialogOpen(true),
    closeHelpDialog: () => setIsHelpDialogOpen(false),
    
    // About dialog
    openAboutDialog: () => setIsAboutDialogOpen(true),
    closeAboutDialog: () => setIsAboutDialogOpen(false),
    
    // Save dialog
    openSaveDialog: () => setIsSaveDialogOpen(true),
    closeSaveDialog: () => setIsSaveDialogOpen(false),
    
    // Confirm new dialog
    openConfirmNewDialog: () => setIsConfirmNewDialogOpen(true),
    closeConfirmNewDialog: () => setIsConfirmNewDialogOpen(false),
    
    // Close save dialog
    openCloseSaveDialog: () => setIsCloseSaveDialogOpen(true),
    closeCloseSaveDialog: () => setIsCloseSaveDialogOpen(false),
  };

  // Notify parent component when controls are ready
  React.useEffect(() => {
    onControlsReady?.(dialogControls);
  }, [onControlsReady, dialogControls]);

  return (
    <>
      <InputDialog
        isOpen={isSaveDialogOpen}
        onOpenChange={setIsSaveDialogOpen}
        onSubmit={onSaveSubmit}
        title="Save File"
        description="Enter a name for your file"
        value={saveFileName}
        onChange={setSaveFileName}
      />
      
      <ConfirmDialog
        isOpen={isConfirmNewDialogOpen}
        onOpenChange={setIsConfirmNewDialogOpen}
        onConfirm={() => {
          onConfirmNew();
          setIsConfirmNewDialogOpen(false);
        }}
        title="Discard Changes"
        description="Do you want to discard your changes and create a new file?"
      />
      
      <InputDialog
        isOpen={isCloseSaveDialogOpen}
        onOpenChange={setIsCloseSaveDialogOpen}
        onSubmit={onCloseSave}
        title="Keep New Document"
        description="Enter a filename to save, or delete it before closing."
        value={closeSaveFileName}
        onChange={setCloseSaveFileName}
        submitLabel="Save"
        additionalActions={[
          {
            label: "Delete",
            onClick: onCloseDelete,
            variant: "retro" as const,
            position: "left" as const,
          },
        ]}
      />
      
      <HelpDialog
        isOpen={isHelpDialogOpen}
        onOpenChange={setIsHelpDialogOpen}
        helpItems={helpItems}
        appName="TextEdit"
      />
      
      <AboutDialog
        isOpen={isAboutDialogOpen}
        onOpenChange={setIsAboutDialogOpen}
        metadata={appMetadata}
      />

    </>
  );
}