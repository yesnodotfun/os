import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { VideosMenuBar } from "./VideosMenuBar";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { helpItems, appMetadata } from "..";
import {
  loadPlaylist,
  savePlaylist,
  loadCurrentIndex,
  saveCurrentIndex,
  loadIsLoopAll,
  saveIsLoopAll,
  loadIsLoopCurrent,
  saveIsLoopCurrent,
  loadIsShuffled,
  saveIsShuffled,
} from "@/utils/storage";

interface Video {
  id: string;
  url: string;
  title: string;
}

export function VideosAppComponent({
  isWindowOpen,
  onClose,
  isForeground,
}: AppProps) {
  const [videos, setVideos] = useState<Video[]>(loadPlaylist());
  const [currentIndex, setCurrentIndex] = useState(loadCurrentIndex());
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopCurrent, setLoopCurrent] = useState(loadIsLoopCurrent());
  const [loopAll, setLoopAll] = useState(loadIsLoopAll());
  const [isShuffled, setIsShuffled] = useState(loadIsShuffled());
  const [originalOrder, setOriginalOrder] = useState<Video[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const playerRef = useRef<HTMLIFrameElement>(null);

  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);

  // Save state to storage whenever it changes
  useEffect(() => {
    savePlaylist(videos);
  }, [videos]);

  useEffect(() => {
    saveCurrentIndex(currentIndex);
  }, [currentIndex]);

  useEffect(() => {
    saveIsLoopAll(loopAll);
  }, [loopAll]);

  useEffect(() => {
    saveIsLoopCurrent(loopCurrent);
  }, [loopCurrent]);

  useEffect(() => {
    saveIsShuffled(isShuffled);
  }, [isShuffled]);

  const extractVideoId = (url: string): string | null => {
    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[7].length === 11 ? match[7] : null;
  };

  const addVideo = async () => {
    const videoId = extractVideoId(urlInput);
    if (videoId) {
      try {
        // Fetch video title using oEmbed API
        const response = await fetch(
          `https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${videoId}&format=json`
        );
        const data = await response.json();

        const newVideo: Video = {
          id: videoId,
          url: urlInput,
          title: data.title,
        };
        setVideos((prev) => [...prev, newVideo]);
        setUrlInput("");
      } catch (error) {
        console.error("Error fetching video title:", error);
        // Fallback to default title if fetch fails
        const newVideo: Video = {
          id: videoId,
          url: urlInput,
          title: `Video ${videos.length + 1}`,
        };
        setVideos((prev) => [...prev, newVideo]);
        setUrlInput("");
      }
    }
  };

  const togglePlay = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.contentWindow?.postMessage(
          '{"event":"command","func":"pauseVideo","args":""}',
          "*"
        );
      } else {
        playerRef.current.contentWindow?.postMessage(
          '{"event":"command","func":"playVideo","args":""}',
          "*"
        );
      }
      setIsPlaying(!isPlaying);
    }
  };

  const nextVideo = () => {
    if (videos.length === 0) return;
    setCurrentIndex((prev) => {
      if (prev === videos.length - 1) {
        if (loopAll) return 0;
        return prev;
      }
      return prev + 1;
    });
    setIsPlaying(true);
  };

  const previousVideo = () => {
    if (videos.length === 0) return;
    setCurrentIndex((prev) => {
      if (prev === 0) {
        if (loopAll) return videos.length - 1;
        return prev;
      }
      return prev - 1;
    });
    setIsPlaying(true);
  };

  const toggleShuffle = () => {
    if (!isShuffled) {
      setOriginalOrder(videos);
      const shuffled = [...videos].sort(() => Math.random() - 0.5);
      setVideos(shuffled);
    } else {
      setVideos(originalOrder);
    }
    setIsShuffled(!isShuffled);
  };

  const handleVideoEnd = () => {
    if (loopCurrent) {
      if (playerRef.current) {
        playerRef.current.contentWindow?.postMessage(
          '{"event":"command","func":"seekTo","args":"0"}',
          "*"
        );
        playerRef.current.contentWindow?.postMessage(
          '{"event":"command","func":"playVideo","args":""}',
          "*"
        );
      }
    } else {
      nextVideo();
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === "ended") {
        handleVideoEnd();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [loopCurrent]);

  if (!isWindowOpen) return null;

  return (
    <>
      <VideosMenuBar
        onClose={onClose}
        onShowHelp={() => setIsHelpDialogOpen(true)}
        onShowAbout={() => setIsAboutDialogOpen(true)}
        videos={videos}
        currentIndex={currentIndex}
        onPlayVideo={(index) => {
          setCurrentIndex(index);
          setIsPlaying(true);
        }}
        onClearPlaylist={() => {
          setVideos([]);
          setCurrentIndex(0);
          setIsPlaying(false);
        }}
        onShufflePlaylist={toggleShuffle}
        onToggleLoopAll={() => setLoopAll(!loopAll)}
        isLoopAll={loopAll}
      />
      <WindowFrame
        title="Videos"
        onClose={onClose}
        isForeground={isForeground}
        appId="videos"
      >
        <div className="flex flex-col w-full h-full bg-[#1a1a1a] text-white">
          <div className="flex-1 relative">
            {videos.length > 0 ? (
              <iframe
                ref={playerRef}
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${
                  videos[currentIndex].id
                }?enablejsapi=1&autoplay=${
                  isPlaying ? 1 : 0
                }&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&fs=0&disablekb=1&playsinline=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Add videos to get started
              </div>
            )}
          </div>

          <div className="p-4 bg-[#2a2a2a] border-t border-[#3a3a3a]">
            <div className="flex gap-2 mb-4">
              <Input
                type="text"
                placeholder="Paste YouTube URL"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="bg-[#3a3a3a] border-[#4a4a4a] text-white font-geneva-12"
              />
              <Button
                onClick={addVideo}
                className="bg-[#4a4a4a] hover:bg-[#5a5a5a]"
              >
                Add
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  onClick={previousVideo}
                  className={cn(
                    "bg-[#4a4a4a] hover:bg-[#5a5a5a]",
                    videos.length === 0 && "opacity-50 cursor-not-allowed"
                  )}
                  disabled={videos.length === 0}
                >
                  ⏮️
                </Button>
                <Button
                  onClick={togglePlay}
                  className={cn(
                    "bg-[#4a4a4a] hover:bg-[#5a5a5a]",
                    videos.length === 0 && "opacity-50 cursor-not-allowed"
                  )}
                  disabled={videos.length === 0}
                >
                  {isPlaying ? "⏸️" : "▶️"}
                </Button>
                <Button
                  onClick={nextVideo}
                  className={cn(
                    "bg-[#4a4a4a] hover:bg-[#5a5a5a]",
                    videos.length === 0 && "opacity-50 cursor-not-allowed"
                  )}
                  disabled={videos.length === 0}
                >
                  ⏭️
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setLoopCurrent(!loopCurrent)}
                  className={cn(
                    "bg-[#4a4a4a] hover:bg-[#5a5a5a]",
                    loopCurrent && "bg-[#6a6a6a]"
                  )}
                >
                  🔁
                </Button>
                <Button
                  onClick={() => setLoopAll(!loopAll)}
                  className={cn(
                    "bg-[#4a4a4a] hover:bg-[#5a5a5a]",
                    loopAll && "bg-[#6a6a6a]"
                  )}
                >
                  🔁 All
                </Button>
                <Button
                  onClick={toggleShuffle}
                  className={cn(
                    "bg-[#4a4a4a] hover:bg-[#5a5a5a]",
                    isShuffled && "bg-[#6a6a6a]"
                  )}
                >
                  🔀
                </Button>
              </div>
            </div>
          </div>
        </div>
        <HelpDialog
          isOpen={isHelpDialogOpen}
          onOpenChange={setIsHelpDialogOpen}
          helpItems={helpItems}
          appName="Videos"
        />
        <AboutDialog
          isOpen={isAboutDialogOpen}
          onOpenChange={setIsAboutDialogOpen}
          metadata={appMetadata}
        />
      </WindowFrame>
    </>
  );
}
