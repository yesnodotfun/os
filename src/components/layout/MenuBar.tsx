import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";

interface MenuBarProps {
  onNewBoard: () => void;
  onImportBoard: () => void;
  onExportBoard: () => void;
  onReloadBoard: () => void;
  onRenameBoard: () => void;
  onDeleteBoard: () => void;
  canDeleteBoard: boolean;
  onShowHelp: () => void;
  onShowAbout: () => void;
  isWindowOpen: boolean;
  onToggleWindow: () => void;
  showWaveforms: boolean;
  onToggleWaveforms: (show: boolean) => void;
  showEmojis: boolean;
  onToggleEmojis: (show: boolean) => void;
}

function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="ml-auto mr-2">
      {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </div>
  );
}

export function MenuBar({
  onNewBoard,
  onImportBoard,
  onExportBoard,
  onReloadBoard,
  onRenameBoard,
  onDeleteBoard,
  canDeleteBoard,
  onShowHelp,
  onShowAbout,
  onToggleWindow,
  showWaveforms,
  onToggleWaveforms,
  showEmojis,
  onToggleEmojis,
}: MenuBarProps) {
  return (
    <div className="fixed top-0 left-0 right-0 flex bg-system7-menubar-bg border-b-[2px] border-black px-2 h-7 items-center z-50">
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
            onClick={onShowAbout}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            About the Finder...
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
          <DropdownMenuItem
            onClick={onShowAbout}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            About
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Clock />
    </div>
  );
}
