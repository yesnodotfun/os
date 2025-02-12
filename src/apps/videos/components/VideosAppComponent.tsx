import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { VideosMenuBar } from "./VideosMenuBar";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { InputDialog } from "@/components/dialogs/InputDialog";
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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const playerRef = useRef<HTMLIFrameElement>(null);

  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);

  const [elapsedTime, setElapsedTime] = useState(0);
  const timeIntervalRef = useRef<number>();

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

  // Add time tracking
  useEffect(() => {
    if (isPlaying) {
      timeIntervalRef.current = window.setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timeIntervalRef.current) {
        window.clearInterval(timeIntervalRef.current);
      }
    }
    return () => {
      if (timeIntervalRef.current) {
        window.clearInterval(timeIntervalRef.current);
      }
    };
  }, [isPlaying]);

  // Reset elapsed time when changing tracks
  useEffect(() => {
    setElapsedTime(0);
  }, [currentIndex]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

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
        setVideos((prev) => {
          const newVideos = [...prev, newVideo];
          // If this is the first video, set it as current and play
          if (prev.length === 0) {
            setCurrentIndex(0);
            setIsPlaying(true);
          }
          return newVideos;
        });
        setUrlInput("");
        setIsAddDialogOpen(false);
      } catch (error) {
        console.error("Error fetching video title:", error);
        // Fallback to default title if fetch fails
        const newVideo: Video = {
          id: videoId,
          url: urlInput,
          title: `Video ${videos.length + 1}`,
        };
        setVideos((prev) => {
          const newVideos = [...prev, newVideo];
          // If this is the first video, set it as current and play
          if (prev.length === 0) {
            setCurrentIndex(0);
            setIsPlaying(true);
          }
          return newVideos;
        });
        setUrlInput("");
        setIsAddDialogOpen(false);
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
              <div className="w-full h-full overflow-hidden relative">
                <iframe
                  ref={playerRef}
                  className="w-full scale-[1.05] pointer-events-none"
                  style={{ height: "calc(100% + 120px)", marginTop: "-60px" }}
                  src={`https://www.youtube.com/embed/${
                    videos[currentIndex].id
                  }?enablejsapi=1&autoplay=${
                    isPlaying ? 1 : 0
                  }&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&fs=0&disablekb=1&playsinline=1`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                {/* Clickable overlay */}
                <div
                  className="absolute inset-0 cursor-pointer"
                  onClick={togglePlay}
                  aria-label={isPlaying ? "Pause" : "Play"}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Add videos to get started
              </div>
            )}
          </div>

          {/* Retro CD Player Controls */}
          <div className="p-4 bg-[#2a2a2a] border-t border-[#3a3a3a] flex flex-col gap-4">
            {/* LCD Display */}
            <div className="bg-black py-2 px-4 flex items-center justify-between w-full">
              <div className="flex items-center gap-8">
                <div className="text-[#ff00ff] font-geneva-12 text-xs">
                  <div>Track</div>
                  <div className="text-xl">
                    {String(currentIndex + 1).padStart(2, "0")}
                  </div>
                </div>
                <div className="text-[#ff00ff] font-geneva-12 text-xs">
                  <div>Elapsed Time</div>
                  <div className="text-xl">{formatTime(elapsedTime)}</div>
                </div>
              </div>
              <div className="relative overflow-hidden flex-1 px-8">
                {videos.length > 0 && (
                  <div className="flex whitespace-nowrap">
                    <motion.div
                      initial={{ x: "0%" }}
                      animate={isPlaying ? { x: "-100%" } : { x: "0%" }}
                      transition={{
                        duration: 20,
                        ease: "linear",
                        repeat: Infinity,
                        repeatType: "loop",
                      }}
                      className="shrink-0 text-[#ff00ff] font-geneva-12 px-2"
                    >
                      {videos[currentIndex].title}
                    </motion.div>
                    <motion.div
                      initial={{ x: "0%" }}
                      animate={isPlaying ? { x: "-100%" } : { x: "0%" }}
                      transition={{
                        duration: 20,
                        ease: "linear",
                        repeat: Infinity,
                        repeatType: "loop",
                      }}
                      className="shrink-0 text-[#ff00ff] font-geneva-12 px-2"
                      aria-hidden
                    >
                      {videos[currentIndex].title}
                    </motion.div>
                  </div>
                )}
                {/* Fade effects */}
                <div className="absolute left-0 top-0 h-full w-8 bg-gradient-to-r from-black to-transparent" />
                <div className="absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-black to-transparent" />
              </div>
            </div>

            {/* All Controls in One Row */}
            <div className="flex items-center justify-between">
              {/* Left Side: Mode Switches */}
              <div className="flex gap-2">
                <div className="flex gap-0">
                  <button
                    onClick={toggleShuffle}
                    className={cn(
                      "text-[9px] font-bold flex items-center justify-center focus:outline-none relative w-[45px] h-[20px] bg-[url('/assets/videos/switch.png')] bg-no-repeat bg-center font-geneva-12 text-black",
                      isShuffled && "brightness-75"
                    )}
                  >
                    SHUFFLE
                  </button>
                  <button
                    onClick={() => setLoopAll(!loopAll)}
                    className={cn(
                      "text-[9px] font-bold flex items-center justify-center focus:outline-none relative w-[45px] h-[20px] bg-[url('/assets/videos/switch.png')] bg-no-repeat bg-center font-geneva-12 text-black",
                      loopAll && "brightness-75"
                    )}
                  >
                    REPEAT
                  </button>
                  <button
                    onClick={() => setLoopCurrent(!loopCurrent)}
                    className={cn(
                      "text-[9px] font-bold flex items-center justify-center focus:outline-none relative w-[45px] h-[20px] bg-[url('/assets/videos/switch.png')] bg-no-repeat bg-center font-geneva-12 text-black",
                      loopCurrent && "brightness-75"
                    )}
                  >
                    →
                  </button>
                </div>
                <button
                  onClick={() => setIsAddDialogOpen(true)}
                  className="text-[9px] font-bold flex items-center justify-center focus:outline-none relative w-[45px] h-[20px] bg-[url('/assets/videos/switch.png')] bg-no-repeat bg-center font-geneva-12 text-black"
                >
                  ADD
                </button>
              </div>

              {/* Right Side: Playback Controls */}
              <div className="flex items-center gap-2">
                <div className="flex gap-0">
                  <button
                    onClick={previousVideo}
                    className="flex items-center justify-center disabled:opacity-50 focus:outline-none"
                    disabled={videos.length === 0}
                  >
                    <img
                      src="/assets/videos/prev.png"
                      alt="Previous"
                      width={32}
                      height={22}
                      className="pointer-events-none"
                    />
                  </button>
                  <button
                    onClick={togglePlay}
                    className="flex items-center justify-center disabled:opacity-50 focus:outline-none"
                    disabled={videos.length === 0}
                  >
                    <img
                      src={
                        isPlaying
                          ? "/assets/videos/pause.png"
                          : "/assets/videos/play.png"
                      }
                      alt={isPlaying ? "Pause" : "Play"}
                      width={50}
                      height={22}
                      className="pointer-events-none"
                    />
                  </button>
                  <button
                    onClick={nextVideo}
                    className="flex items-center justify-center disabled:opacity-50 focus:outline-none"
                    disabled={videos.length === 0}
                  >
                    <img
                      src="/assets/videos/next.png"
                      alt="Next"
                      width={32}
                      height={22}
                      className="pointer-events-none"
                    />
                  </button>
                </div>
                <button
                  onClick={() => {
                    setVideos([]);
                    setCurrentIndex(0);
                    setIsPlaying(false);
                  }}
                  className="flex items-center justify-center focus:outline-none"
                >
                  <img
                    src="/assets/videos/clear.png"
                    alt="Clear"
                    width={32}
                    height={22}
                    className="pointer-events-none"
                  />
                </button>
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
        <InputDialog
          isOpen={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSubmit={addVideo}
          title="Add Video"
          description="Enter a YouTube video URL"
          value={urlInput}
          onChange={setUrlInput}
        />
      </WindowFrame>
    </>
  );
}
