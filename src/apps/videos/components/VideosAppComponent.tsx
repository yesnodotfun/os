import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactPlayer from "react-player";
import { cn } from "@/lib/utils";
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { VideosMenuBar } from "./VideosMenuBar";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { InputDialog } from "@/components/dialogs/InputDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
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

interface VideoInfo {
  title: string;
}

async function fetchVideoInfo(videoId: string): Promise<VideoInfo> {
  const response = await fetch(
    `https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${videoId}&format=json`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch video info");
  }

  const data = await response.json();
  return {
    title: data.title,
  };
}

function AnimatedDigit({ digit }: { digit: string }) {
  return (
    <div className="relative w-[0.6em] h-[28px] overflow-hidden inline-block">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={digit}
          initial={{ y: -30 }}
          animate={{ y: 0 }}
          exit={{ y: 30 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
          className="absolute inset-0 flex justify-center"
        >
          {digit}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function AnimatedNumber({ number }: { number: number }) {
  const digits = String(number).padStart(2, "0").split("");
  return (
    <div className="flex">
      {digits.map((digit, index) => (
        <AnimatedDigit key={index} digit={digit} />
      ))}
    </div>
  );
}

export function VideosAppComponent({
  isWindowOpen,
  onClose,
  isForeground,
}: AppProps) {
  const loadedPlaylist = loadPlaylist();
  const [videos, setVideos] = useState<Video[]>(loadedPlaylist);
  const [currentIndex, setCurrentIndex] = useState(loadCurrentIndex());
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopCurrent, setLoopCurrent] = useState(loadIsLoopCurrent());
  const [loopAll, setLoopAll] = useState(loadIsLoopAll());
  const [isShuffled, setIsShuffled] = useState(loadIsShuffled());
  const [originalOrder, setOriginalOrder] = useState<Video[]>(loadedPlaylist);
  const [urlInput, setUrlInput] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const playerRef = useRef<ReactPlayer>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [playAfterAdd, setPlayAfterAdd] = useState(false);
  const [isSafari] = useState(() =>
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  );

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

  // Reset elapsed time when changing tracks
  useEffect(() => {
    setElapsedTime(0);
  }, [currentIndex]);

  // Replace the existing useEffect for shuffle initialization
  useEffect(() => {
    if (isShuffled) {
      const shuffled = [...videos].sort(() => Math.random() - 0.5);
      setVideos(shuffled);
    } else {
      setVideos([...originalOrder]);
    }
  }, [isShuffled]); // Run when shuffle state changes

  // Keep original order in sync with new additions
  useEffect(() => {
    if (!isShuffled) {
      setOriginalOrder(videos);
    }
  }, [videos, isShuffled]);

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

  const addVideo = async (url: string) => {
    try {
      const videoId = extractVideoId(url);
      if (!videoId) {
        throw new Error("Invalid YouTube URL");
      }

      const videoInfo = await fetchVideoInfo(videoId);
      const newVideo: Video = {
        id: videoId,
        url,
        title: videoInfo.title,
      };

      setVideos((prev) => [...prev, newVideo]);
      if (playAfterAdd) {
        setCurrentIndex(videos.length);
        setIsPlaying(true);
        setPlayAfterAdd(false);
      }
      setUrlInput("");
    } catch (error) {
      console.error("Failed to add video:", error);
    }
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
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

  // Replace the existing toggleShuffle function
  const toggleShuffle = () => {
    setIsShuffled(!isShuffled);
  };

  const handleVideoEnd = () => {
    if (loopCurrent) {
      playerRef.current?.seekTo(0);
      setIsPlaying(true);
    } else {
      nextVideo();
    }
  };

  const handleProgress = (state: { playedSeconds: number }) => {
    setElapsedTime(Math.floor(state.playedSeconds));
  };

  // Add new handlers for YouTube player state sync
  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReady = () => {
    // If we want to start playing immediately after loading
    if (isPlaying) {
      playerRef.current?.seekTo(0);
    }
  };

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
          setIsConfirmClearOpen(true);
        }}
        onShufflePlaylist={toggleShuffle}
        onToggleLoopAll={() => setLoopAll(!loopAll)}
        isLoopAll={loopAll}
        onTogglePlay={togglePlay}
        onNext={() => {
          if (currentIndex < videos.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setIsPlaying(true);
          }
        }}
        onPrevious={() => {
          if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setIsPlaying(true);
          }
        }}
        onAddVideo={() => setIsAddDialogOpen(true)}
        onOpenVideo={() => {
          setIsAddDialogOpen(true);
          setPlayAfterAdd(true);
        }}
        isPlaying={isPlaying}
        isShuffled={isShuffled}
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
                <div
                  className={cn(
                    "w-full scale-[1.05]",
                    !isSafari && "pointer-events-none"
                  )}
                  style={{ height: "calc(100% + 120px)", marginTop: "-60px" }}
                >
                  <ReactPlayer
                    ref={playerRef}
                    url={videos[currentIndex].url}
                    playing={isPlaying}
                    controls={false}
                    width="100%"
                    height="100%"
                    onEnded={handleVideoEnd}
                    onProgress={handleProgress}
                    onPlay={handlePlay}
                    onPause={handlePause}
                    onReady={handleReady}
                    loop={loopCurrent}
                    config={{
                      youtube: {
                        playerVars: {
                          modestbranding: 1,
                          rel: 0,
                          showinfo: 0,
                          iv_load_policy: 3,
                          fs: 0,
                          disablekb: 1,
                          playsinline: 1,
                        },
                      },
                    }}
                  />
                </div>
                {/* Clickable overlay - only show for non-Safari browsers */}
                {!isSafari && (
                  <div
                    className="absolute inset-0 cursor-pointer"
                    onClick={togglePlay}
                    aria-label={isPlaying ? "Pause" : "Play"}
                  />
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 font-geneva-12 text-sm">
                <a
                  onClick={() => setIsAddDialogOpen(true)}
                  className="text-[#ff00ff] hover:underline cursor-pointer"
                >
                  Add videos
                </a>
                &nbsp;to get started
              </div>
            )}
          </div>

          {/* Retro CD Player Controls */}
          <div className="p-4 bg-[#2a2a2a] border-t border-[#3a3a3a] flex flex-col gap-4">
            {/* LCD Display */}
            <div className="bg-black py-2 px-4 flex items-center justify-between w-full">
              <div className="flex items-center gap-8">
                <div
                  className={cn(
                    "font-geneva-12 text-[10px] transition-colors duration-300",
                    isPlaying ? "text-[#ff00ff]" : "text-gray-600"
                  )}
                >
                  <div>Track</div>
                  <div className="text-xl">
                    <AnimatedNumber number={currentIndex + 1} />
                  </div>
                </div>
                <div
                  className={cn(
                    "font-geneva-12 text-[10px] transition-colors duration-300",
                    isPlaying ? "text-[#ff00ff]" : "text-gray-600"
                  )}
                >
                  <div>Time</div>
                  <div className="text-xl">{formatTime(elapsedTime)}</div>
                </div>
              </div>
              <div className="relative overflow-hidden flex-1 px-2">
                <div
                  className={cn(
                    "font-geneva-12 text-[10px] transition-colors duration-300 mb-[3px] pl-2",
                    isPlaying ? "text-[#ff00ff]" : "text-gray-600"
                  )}
                >
                  Title
                </div>
                {videos.length > 0 && (
                  <div className="relative overflow-hidden">
                    <div className="flex whitespace-nowrap">
                      <motion.div
                        initial={{ x: "0%" }}
                        animate={{ x: isPlaying ? "-100%" : "0%" }}
                        transition={
                          isPlaying
                            ? {
                                duration: 20,
                                ease: "linear",
                                repeat: Infinity,
                                repeatType: "loop",
                              }
                            : {
                                duration: 0.3,
                              }
                        }
                        className={cn(
                          "shrink-0 font-geneva-12 px-2 transition-colors duration-300",
                          isPlaying ? "text-[#ff00ff]" : "text-gray-600",
                          !isPlaying && "opacity-50"
                        )}
                      >
                        {videos[currentIndex].title}
                      </motion.div>
                      <motion.div
                        initial={{ x: "0%" }}
                        animate={{ x: isPlaying ? "-100%" : "0%" }}
                        transition={
                          isPlaying
                            ? {
                                duration: 20,
                                ease: "linear",
                                repeat: Infinity,
                                repeatType: "loop",
                              }
                            : {
                                duration: 0.3,
                              }
                        }
                        className={cn(
                          "shrink-0 font-geneva-12 px-2 transition-colors duration-300",
                          isPlaying ? "text-[#ff00ff]" : "text-gray-600",
                          !isPlaying && "opacity-50"
                        )}
                        aria-hidden
                      >
                        {videos[currentIndex].title}
                      </motion.div>
                    </div>
                    {/* Fade effects */}
                    {isPlaying && (
                      <div className="absolute left-0 top-0 h-full w-4 bg-gradient-to-r from-black to-transparent" />
                    )}
                    <div className="absolute right-0 top-0 h-full w-4 bg-gradient-to-l from-black to-transparent" />
                  </div>
                )}
              </div>
            </div>

            {/* All Controls in One Row */}
            <div className="flex items-center justify-between">
              {/* Left Side: Playback Controls */}
              <div className="flex items-center gap-2">
                <div className="flex gap-0">
                  <button
                    onClick={previousVideo}
                    className={cn(
                      "flex items-center justify-center disabled:opacity-50 focus:outline-none",
                      "hover:brightness-75 active:brightness-50"
                    )}
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
                    className={cn(
                      "flex items-center justify-center disabled:opacity-50 focus:outline-none",
                      "hover:brightness-75 active:brightness-50"
                    )}
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
                    className={cn(
                      "flex items-center justify-center disabled:opacity-50 focus:outline-none",
                      "hover:brightness-75 active:brightness-50"
                    )}
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
              </div>

              {/* Right Side: Mode Switches */}
              <div className="flex items-center gap-2">
                <div className="flex gap-0">
                  <button
                    onClick={toggleShuffle}
                    className={cn(
                      "text-[9px] flex items-center justify-center focus:outline-none relative w-[45px] h-[20px] bg-[url('/assets/videos/switch.png')] bg-no-repeat bg-center font-geneva-12 text-black",
                      isShuffled ? "brightness-60" : "hover:brightness-90",
                      "active:brightness-50"
                    )}
                  >
                    SHUFFLE
                  </button>
                  <button
                    onClick={() => setLoopAll(!loopAll)}
                    className={cn(
                      "text-[9px] flex items-center justify-center focus:outline-none relative w-[45px] h-[20px] bg-[url('/assets/videos/switch.png')] bg-no-repeat bg-center font-geneva-12 text-black",
                      loopAll ? "brightness-60" : "hover:brightness-90",
                      "active:brightness-50"
                    )}
                  >
                    REPEAT
                  </button>
                  <button
                    onClick={() => setLoopCurrent(!loopCurrent)}
                    className={cn(
                      "text-[9px] flex items-center justify-center focus:outline-none relative w-[45px] h-[20px] bg-[url('/assets/videos/switch.png')] bg-no-repeat bg-center font-geneva-12 text-black",
                      loopCurrent ? "brightness-60" : "hover:brightness-90",
                      "active:brightness-50"
                    )}
                  >
                    →
                  </button>
                </div>
                <button
                  onClick={() => setIsAddDialogOpen(true)}
                  className={cn(
                    "text-[9px] flex items-center justify-center focus:outline-none relative w-[45px] h-[20px] bg-[url('/assets/videos/switch.png')] bg-no-repeat bg-center font-geneva-12 text-black",
                    "hover:brightness-90 active:brightness-50"
                  )}
                >
                  ADD
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
        <ConfirmDialog
          isOpen={isConfirmClearOpen}
          onOpenChange={setIsConfirmClearOpen}
          onConfirm={() => {
            setVideos([]);
            setCurrentIndex(0);
            setIsPlaying(false);
            setIsConfirmClearOpen(false);
          }}
          title="Clear Playlist"
          description="Are you sure you want to clear the entire playlist? This action cannot be undone."
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
