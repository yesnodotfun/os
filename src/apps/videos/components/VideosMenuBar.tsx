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

interface Video {
  id: string;
  url: string;
  title: string;
}

interface VideosMenuBarProps {
  onClose: () => void;
  onShowHelp: () => void;
  onShowAbout: () => void;
  videos: Video[];
  currentIndex: number;
  onPlayVideo: (index: number) => void;
  onClearPlaylist: () => void;
  onShufflePlaylist: () => void;
  onToggleLoopAll: () => void;
  isLoopAll: boolean;
}

export function VideosMenuBar({
  onClose,
  onShowHelp,
  onShowAbout,
  videos,
  currentIndex,
  onPlayVideo,
  onClearPlaylist,
  onShufflePlaylist,
  onToggleLoopAll,
  isLoopAll,
}: VideosMenuBarProps) {
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
            onClick={onClose}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Close
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Playlist Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="default"
            className="h-6 px-2 py-1 text-md focus-visible:ring-0 hover:bg-gray-200 active:bg-gray-900 active:text-white"
          >
            Playlist
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={1} className="px-0">
          <DropdownMenuItem
            onClick={onToggleLoopAll}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            {isLoopAll ? "✓ " : ""}Loop All
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onShufflePlaylist}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Shuffle
          </DropdownMenuItem>
          {videos.length > 0 && (
            <>
              <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
              {videos.map((video, index) => (
                <DropdownMenuItem
                  key={video.id}
                  onClick={() => onPlayVideo(index)}
                  className={cn(
                    "text-md h-6 px-3 active:bg-gray-900 active:text-white",
                    index === currentIndex && "bg-gray-200"
                  )}
                >
                  {index === currentIndex ? "▶ " : ""}
                  {video.title}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
              <DropdownMenuItem
                onClick={onClearPlaylist}
                className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
              >
                Clear Playlist
              </DropdownMenuItem>
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
            Videos Help
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuItem
            onClick={onShowAbout}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            About Videos
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </MenuBar>
  );
}
