import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { AppMenuBarProps } from "../../base/types";
import { AboutFinderDialog } from "@/components/dialogs/AboutFinderDialog";

interface SoundboardMenuBarProps extends AppMenuBarProps {
  onNewBoard?: () => void;
  onImportBoard?: () => void;
  onExportBoard?: () => void;
  onReloadBoard?: () => void;
  onRenameBoard?: () => void;
  onDeleteBoard?: () => void;
  canDeleteBoard?: boolean;
  onShowHelp?: () => void;
  onShowAbout?: () => void;
  showWaveforms?: boolean;
  onToggleWaveforms?: (show: boolean) => void;
  showEmojis?: boolean;
  onToggleEmojis?: (show: boolean) => void;
}

export function SoundboardMenuBar({
  onToggleWindow,
  onNewBoard,
  onImportBoard,
  onExportBoard,
  onReloadBoard,
  onRenameBoard,
  onDeleteBoard,
  canDeleteBoard,
  onShowHelp,
  onShowAbout,
  showWaveforms,
  onToggleWaveforms,
  showEmojis,
  onToggleEmojis,
}: SoundboardMenuBarProps) {
  const [aboutFinderOpen, setAboutFinderOpen] = useState(false);

  return (
    <>
      {/* Apple menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="default"
            className="h-6 text-md px-3 py-1 border-none hover:bg-gray-200 active:bg-gray-900 active:text-white focus-visible:ring-0"
          >
            
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={1} className="px-0">
          <DropdownMenuItem
            onClick={() => setAboutFinderOpen(true)}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            About This Macintosh
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuItem
            onClick={onToggleWindow}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white flex justify-between"
          >
            Soundboard
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* File Menu */}
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
            onClick={onNewBoard}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            New Soundboard
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuItem
            onClick={onImportBoard}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Import Soundboards...
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onExportBoard}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Export Soundboards...
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuItem
            onClick={onReloadBoard}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Reset All Soundboards
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="default"
            className="h-6 px-2 py-1 text-md focus-visible:ring-0 hover:bg-gray-200 active:bg-gray-900 active:text-white"
          >
            Edit
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={1} className="px-0">
          <DropdownMenuItem
            onClick={onRenameBoard}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Rename Soundboard
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onDeleteBoard}
            disabled={!canDeleteBoard}
            className={
              !canDeleteBoard
                ? "text-gray-400 text-md h-6 px-3"
                : "text-md h-6 px-3 active:bg-gray-900 active:text-white"
            }
          >
            Delete Soundboard
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* View Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="default"
            className="h-6 px-2 py-1 text-md focus-visible:ring-0 hover:bg-gray-200 active:bg-gray-900 active:text-white"
          >
            View
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={1} className="px-0">
          <DropdownMenuCheckboxItem
            checked={showWaveforms}
            onCheckedChange={onToggleWaveforms}
            className="text-md h-6 px-3 pl-8 active:bg-gray-900 active:text-white flex justify-between items-center"
          >
            <span>Waveforms</span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={showEmojis}
            onCheckedChange={onToggleEmojis}
            className="text-md h-6 px-3 pl-8 active:bg-gray-900 active:text-white flex justify-between items-center"
          >
            <span>Emojis</span>
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Help Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="default"
            className="h-6 px-2 py-1 text-md focus-visible:ring-0 hover:bg-gray-200 active:bg-gray-900 active:text-white"
          >
            Help
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={1} className="px-0">
          <DropdownMenuItem
            onClick={onShowHelp}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Get Help
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuItem
            onClick={onShowAbout}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            About Soundboard
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AboutFinderDialog
        isOpen={aboutFinderOpen}
        onOpenChange={setAboutFinderOpen}
      />
    </>
  );
}
