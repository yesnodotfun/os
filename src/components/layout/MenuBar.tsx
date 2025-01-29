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
import { AboutFinderDialog } from "@/components/dialogs/AboutFinderDialog";

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
  const [aboutFinderOpen, setAboutFinderOpen] = useState(false);

  return (
    <div className="fixed top-0 left-0 right-0 flex bg-system7-menubar-bg border-b-[2px] border-black px-2 h-7 items-center z-50">
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

      <AboutFinderDialog
        isOpen={aboutFinderOpen}
        onOpenChange={setAboutFinderOpen}
      />

      <Clock />
    </div>
  );
}
