import React from "react";
import { MenuBar } from "@/components/layout/MenuBar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface PaintMenuBarProps {
  isWindowOpen: boolean;
  isForeground: boolean;
  onClose: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onShowHelp: () => void;
  onShowAbout: () => void;
  onNewFile: () => void;
  onSave: () => void;
  onImportFile: () => void;
  onExportFile: () => void;
  hasUnsavedChanges: boolean;
  currentFilePath: string | null;
  handleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function PaintMenuBar({
  onClose,
  onShowHelp,
  onShowAbout,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onNewFile,
  onSave,
  onImportFile,
  onExportFile,
  hasUnsavedChanges,
  currentFilePath,
  handleFileSelect,
}: PaintMenuBarProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <MenuBar>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".png,.jpg,.jpeg"
        className="hidden"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="default"
            className="h-6 text-md px-2 py-1 border-none hover:bg-gray-200 active:bg-gray-900 active:text-white focus-visible:ring-0"
          >
            File
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={1} className="px-0">
          <DropdownMenuItem
            onClick={onNewFile}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            New File
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuItem
            onClick={onImportFile}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Open...
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!hasUnsavedChanges && currentFilePath !== null}
            onClick={onSave}
            className={`text-md h-6 px-3 active:bg-gray-900 active:text-white ${
              !hasUnsavedChanges && currentFilePath ? "text-gray-500" : ""
            }`}
          >
            {currentFilePath
              ? hasUnsavedChanges
                ? "Save"
                : "Saved"
              : "Save..."}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuItem
            onClick={() => fileInputRef.current?.click()}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Import from Device...
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onExportFile}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Export...
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuItem
            onClick={onClose}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Close
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="default"
            className="h-6 text-md px-2 py-1 border-none hover:bg-gray-200 active:bg-gray-900 active:text-white focus-visible:ring-0"
          >
            Edit
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={1} className="px-0">
          <DropdownMenuItem
            onClick={onUndo}
            disabled={!canUndo}
            className={`text-md h-6 px-3 active:bg-gray-900 active:text-white ${
              !canUndo ? "text-gray-500" : ""
            }`}
          >
            Undo
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onRedo}
            disabled={!canRedo}
            className={`text-md h-6 px-3 active:bg-gray-900 active:text-white ${
              !canRedo ? "text-gray-500" : ""
            }`}
          >
            Redo
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuItem
            onClick={onClear}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Clear
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="default"
            className="h-6 text-md px-2 py-1 border-none hover:bg-gray-200 active:bg-gray-900 active:text-white focus-visible:ring-0"
          >
            Help
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={1} className="px-0">
          <DropdownMenuItem
            onClick={onShowHelp}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            MacPaint Help
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuItem
            onClick={onShowAbout}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            About MacPaint
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </MenuBar>
  );
}
