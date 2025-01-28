import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
    <div className="ml-auto mr-2 text-sm">
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
}: MenuBarProps) {
  return (
    <div className="fixed top-0 left-0 right-0 flex bg-system7-menubar-bg border-b-[2px] border-black px-2 h-7 items-center text-sm z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="default"
            className="h-6 px-2 py-1 border-none hover:bg-gray-200 active:bg-gray-900 active:text-white focus-visible:ring-0"
          >
            File
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={1}>
          <DropdownMenuItem onClick={onNewBoard}>
            New Soundboard
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onImportBoard}>
            Import Soundboard...
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportBoard}>
            Export Soundboard...
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onReloadBoard}>
            Reload Soundboard
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="default"
            className="h-6 px-2 py-1 focus-visible:ring-0 hover:bg-gray-200 active:bg-gray-900 active:text-white"
          >
            Edit
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={1}>
          <DropdownMenuItem onClick={onRenameBoard}>
            Rename Soundboard
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onDeleteBoard}
            disabled={!canDeleteBoard}
            className={!canDeleteBoard ? "text-gray-400" : ""}
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
            className="h-6 px-2 py-1 focus-visible:ring-0 hover:bg-gray-200 active:bg-gray-900 active:text-white"
          >
            View
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={1}>
          <DropdownMenuItem>Show Waveforms</DropdownMenuItem>
          <DropdownMenuItem>Show Emojis</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="default"
            className="h-6 px-2 py-1 focus-visible:ring-0 hover:bg-gray-200 active:bg-gray-900 active:text-white"
          >
            Help
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={1}>
          <DropdownMenuItem onClick={onShowHelp}>
            Getting Started
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onShowAbout}>About</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Clock />
    </div>
  );
}
