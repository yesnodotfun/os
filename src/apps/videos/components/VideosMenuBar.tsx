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
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onAddVideo: () => void;
  onOpenVideo: () => void;
  isLoopAll: boolean;
  isPlaying: boolean;
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
  onTogglePlay,
  onNext,
  onPrevious,
  onAddVideo,
  onOpenVideo,
  isLoopAll,
  isPlaying,
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
            onClick={onOpenVideo}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Open Video...
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

      {/* Playback Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="default"
            className="h-6 px-2 py-1 text-md focus-visible:ring-0 hover:bg-gray-200 active:bg-gray-900 active:text-white"
          >
            Playback
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={1} className="px-0">
          <DropdownMenuItem
            onClick={onTogglePlay}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
            disabled={videos.length === 0}
          >
            {isPlaying ? "Pause" : "Play"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onPrevious}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
            disabled={videos.length === 0}
          >
            Previous
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onNext}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
            disabled={videos.length === 0}
          >
            Next
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
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
            onClick={onAddVideo}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Add to Playlist...
          </DropdownMenuItem>
          {videos.length > 0 && (
            <>
              <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
              {videos.map((video, index) => (
                <DropdownMenuItem
                  key={video.id}
                  onClick={() => onPlayVideo(index)}
                  className={cn(
                    "text-md h-6 px-3 active:bg-gray-900 active:text-white max-w-[220px] truncate",
                    index === currentIndex && "bg-gray-200"
                  )}
                >
                  <div className="flex items-center w-full truncate">
                    <span className="flex-none mr-1">
                      {index === currentIndex ? "▶ " : ""}
                    </span>
                    <span className="truncate">{video.title}</span>
                  </div>
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
