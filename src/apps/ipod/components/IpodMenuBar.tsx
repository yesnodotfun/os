import { Button } from "@/components/ui/button";
import { MenuBar } from "@/components/layout/MenuBar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Track {
  id: string;
  url: string;
  title: string;
  artist?: string;
  album?: string;
}

interface IpodMenuBarProps {
  onClose: () => void;
  onShowHelp: () => void;
  onShowAbout: () => void;
  tracks: Track[];
  currentIndex: number;
  onPlayTrack: (index: number) => void;
  onClearLibrary: () => void;
  onResetLibrary: () => void;
  onShuffleLibrary: () => void;
  onToggleLoopAll: () => void;
  onToggleLoopCurrent: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onAddTrack: () => void;
  onToggleBacklight: () => void;
  onToggleVideo: () => void;
  isLoopAll: boolean;
  isLoopCurrent: boolean;
  isPlaying: boolean;
  isShuffled: boolean;
  isBacklightOn: boolean;
  isVideoOn: boolean;
}

export function IpodMenuBar({
  onClose,
  onShowHelp,
  onShowAbout,
  tracks,
  currentIndex,
  onPlayTrack,
  onClearLibrary,
  onResetLibrary,
  onShuffleLibrary,
  onToggleLoopAll,
  onToggleLoopCurrent,
  onTogglePlay,
  onNext,
  onPrevious,
  onAddTrack,
  onToggleBacklight,
  onToggleVideo,
  isLoopAll,
  isLoopCurrent,
  isPlaying,
  isShuffled,
  isBacklightOn,
  isVideoOn,
}: IpodMenuBarProps) {
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
            onClick={onAddTrack}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Add Music...
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

      {/* Controls Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="default"
            className="h-6 px-2 py-1 text-md focus-visible:ring-0 hover:bg-gray-200 active:bg-gray-900 active:text-white"
          >
            Controls
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={1} className="px-0">
          <DropdownMenuItem
            onClick={onTogglePlay}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
            disabled={tracks.length === 0}
          >
            {isPlaying ? "Pause" : "Play"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onPrevious}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
            disabled={tracks.length === 0}
          >
            Previous
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onNext}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
            disabled={tracks.length === 0}
          >
            Next
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuItem
            onClick={onShuffleLibrary}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            <span className={cn(!isShuffled && "pl-4")}>
              {isShuffled ? "✓ Shuffle" : "Shuffle"}
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onToggleLoopAll}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            <span className={cn(!isLoopAll && "pl-4")}>
              {isLoopAll ? "✓ Repeat All" : "Repeat All"}
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onToggleLoopCurrent}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            <span className={cn(!isLoopCurrent && "pl-4")}>
              {isLoopCurrent ? "✓ Repeat One" : "Repeat One"}
            </span>
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
          <DropdownMenuItem
            onClick={onToggleBacklight}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            <span className={cn(!isBacklightOn && "pl-4")}>
              {isBacklightOn ? "✓ Backlight" : "Backlight"}
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onToggleVideo}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
            disabled={!isPlaying}
          >
            <span className={cn(!isVideoOn && "pl-4")}>
              {isVideoOn ? "✓ Show Video" : "Show Video"}
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Library Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="default"
            className="h-6 px-2 py-1 text-md focus-visible:ring-0 hover:bg-gray-200 active:bg-gray-900 active:text-white"
          >
            Library
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={1} className="px-0">
          <DropdownMenuItem
            onClick={onAddTrack}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Add to Library...
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onClearLibrary}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Clear Library
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onResetLibrary}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Reset to Default
          </DropdownMenuItem>
          {tracks.length > 0 && (
            <>
              <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
              {tracks.map((track, index) => (
                <DropdownMenuItem
                  key={track.id}
                  onClick={() => onPlayTrack(index)}
                  className={cn(
                    "text-md h-6 px-3 active:bg-gray-900 active:text-white max-w-[220px] truncate",
                    index === currentIndex && "bg-gray-200"
                  )}
                >
                  <div className="flex items-center w-full truncate">
                    <span
                      className={cn(
                        "flex-none",
                        index === currentIndex ? "mr-1" : "pl-5"
                      )}
                    >
                      {index === currentIndex ? "♪ " : ""}
                    </span>
                    <span className="truncate">{track.title}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}
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
            iPod Help
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuItem
            onClick={onShowAbout}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            About iPod
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </MenuBar>
  );
}
