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

interface InternetExplorerMenuBarProps extends Omit<AppProps, "onClose"> {
  onRefresh?: () => void;
  onStop?: () => void;
  onHome?: () => void;
  onClearHistory?: () => void;
  onShowHelp?: () => void;
  onShowAbout?: () => void;
  isLoading?: boolean;
}

export function InternetExplorerMenuBar({
  onRefresh,
  onStop,
  onHome,
  onClearHistory,
  onShowHelp,
  onShowAbout,
  isLoading,
}: InternetExplorerMenuBarProps) {
  return (
    <MenuBar>
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
            onClick={onHome}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Home
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuItem
            onClick={onClearHistory}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Clear History
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
            onClick={onRefresh}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Refresh
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onStop}
            disabled={!isLoading}
            className={
              !isLoading
                ? "text-gray-400 text-md h-6 px-3"
                : "text-md h-6 px-3 active:bg-gray-900 active:text-white"
            }
          >
            Stop
          </DropdownMenuItem>
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
            About Internet Explorer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </MenuBar>
  );
}
