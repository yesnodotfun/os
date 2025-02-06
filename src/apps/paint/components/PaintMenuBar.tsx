import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { AppProps } from "../../base/types";
import { MenuBar } from "@/components/layout/MenuBar";

interface PaintMenuBarProps extends Omit<AppProps, "onClose"> {
  onNew?: () => void;
  onOpen?: () => void;
  onSave?: () => void;
  onSaveAs?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onClear?: () => void;
  onShowHelp?: () => void;
  onShowAbout?: () => void;
  onClose?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export function PaintMenuBar({
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onUndo,
  onRedo,
  onClear,
  onShowHelp,
  onShowAbout,
  onClose,
  canUndo = false,
  canRedo = false,
}: PaintMenuBarProps) {
  return (
    <MenuBar>
      {/* File Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-6 text-md px-2 py-1 border-none hover:bg-gray-200 active:bg-gray-900 active:text-white focus-visible:ring-0"
          >
            File
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={1} className="px-0">
          <DropdownMenuItem
            onClick={onNew}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            New <span className="ml-auto">⌘N</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onOpen}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Open... <span className="ml-auto">⌘O</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuItem
            onClick={onSave}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Save <span className="ml-auto">⌘S</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onSaveAs}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Save As...
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

      {/* Edit Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-6 px-2 py-1 text-md focus-visible:ring-0 hover:bg-gray-200 active:bg-gray-900 active:text-white"
          >
            Edit
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={1} className="px-0">
          <DropdownMenuItem
            onClick={onUndo}
            disabled={!canUndo}
            className={
              !canUndo
                ? "text-gray-400 text-md h-6 px-3"
                : "text-md h-6 px-3 active:bg-gray-900 active:text-white"
            }
          >
            Undo <span className="ml-auto">⌘Z</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onRedo}
            disabled={!canRedo}
            className={
              !canRedo
                ? "text-gray-400 text-md h-6 px-3"
                : "text-md h-6 px-3 active:bg-gray-900 active:text-white"
            }
          >
            Redo <span className="ml-auto">⇧⌘Z</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuItem
            onClick={onClear}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Clear <span className="ml-auto">⌫</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Help Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
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
