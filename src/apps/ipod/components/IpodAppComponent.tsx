import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import ReactPlayer from "react-player";
import { cn } from "@/lib/utils";
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { IpodMenuBar } from "./IpodMenuBar";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { InputDialog } from "@/components/dialogs/InputDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { helpItems, appMetadata } from "..";
import {
  loadLibrary,
  saveLibrary,
  loadIpodCurrentIndex,
  saveIpodCurrentIndex,
  loadIpodIsLoopAll,
  saveIpodIsLoopAll,
  loadIpodIsLoopCurrent,
  saveIpodIsLoopCurrent,
  loadIpodIsShuffled,
  saveIpodIsShuffled,
  DEFAULT_TRACKS,
  Track,
} from "@/utils/storage";
import { useSound, Sounds } from "@/hooks/useSound";

interface TrackInfo {
  title: string;
  artist?: string;
}

async function fetchTrackInfo(videoId: string): Promise<TrackInfo> {
  const response = await fetch(
    `https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${videoId}&format=json`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch track info");
  }

  const data = await response.json();
  const title = data.title;

  // Try to extract artist from title (common format: "Artist - Title")
  let artist;
  const splitTitle = title.split(" - ");
  if (splitTitle.length > 1) {
    artist = splitTitle[0];
  }

  return {
    title: data.title,
    artist,
  };
}

function AnimatedText({
  text,
  isScrolling,
}: {
  text: string;
  isScrolling: boolean;
}) {
  return (
    <div className="relative overflow-hidden whitespace-nowrap w-full">
      <motion.div
        initial={{ x: 0 }}
        animate={
          isScrolling && text.length > 18
            ? {
                x: -100,
                transition: {
                  duration: text.length * 0.2,
                  ease: "linear",
                  repeat: Infinity,
                  repeatType: "loop",
                },
              }
            : { x: 0 }
        }
        className="font-chicago text-xs"
      >
        {text}
      </motion.div>
    </div>
  );
}

function MenuListItem({
  text,
  isSelected,
  onClick,
}: {
  text: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "px-2 py-1 cursor-pointer font-chicago text-xs flex justify-between items-center",
        isSelected
          ? "bg-black text-white"
          : "bg-white text-black hover:bg-gray-200"
      )}
    >
      <span>{text}</span>
      <span>{">"}</span>
    </div>
  );
}

function IpodMenu({
  items,
  selectedIndex,
  onSelect,
  title,
  isPlaying,
}: {
  items: { label: string; action: () => void }[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  title: string;
  isPlaying?: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-400 py-1 px-2 font-chicago text-sm flex justify-between items-center">
        <div className="w-6 text-xs">{isPlaying ? "▶" : "II"}</div>
        <div>{title}</div>
        <div className="w-6 text-xs">
          {/* Simple battery icon */}
          <span>🔋</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {items.map((item, index) => (
          <MenuListItem
            key={index}
            text={item.label}
            isSelected={index === selectedIndex}
            onClick={() => {
              onSelect(index);
              item.action();
            }}
          />
        ))}
      </div>
    </div>
  );
}

function IpodScreen({
  currentTrack,
  isPlaying,
  elapsedTime,
  totalTime,
  menuMode,
  menuItems,
  selectedMenuItem,
  onSelectMenuItem,
  menuTitle,
}: {
  currentTrack: Track | null;
  isPlaying: boolean;
  elapsedTime: number;
  totalTime: number;
  menuMode: boolean;
  menuItems: { label: string; action: () => void }[];
  selectedMenuItem: number;
  onSelectMenuItem: (index: number) => void;
  menuTitle: string;
}) {
  return (
    <div className="relative w-full h-[160px] bg-white border border-gray-400 rounded-t-md overflow-hidden">
      {menuMode ? (
        <IpodMenu
          items={menuItems}
          selectedIndex={selectedMenuItem}
          onSelect={onSelectMenuItem}
          title={menuTitle}
          isPlaying={isPlaying}
        />
      ) : (
        <div className="flex flex-col h-full">
          <div className="bg-white border-b border-gray-400 py-1 px-2 font-chicago text-sm flex justify-between items-center">
            <div className="w-6 text-xs">{isPlaying ? "▶" : "II"}</div>
            <div>Now Playing</div>
            <div className="w-6 text-xs">
              <span>🔋</span>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-2">
            {currentTrack ? (
              <>
                <div className="mb-2 w-full">
                  <AnimatedText
                    text={currentTrack.title}
                    isScrolling={isPlaying}
                  />
                  <AnimatedText
                    text={currentTrack.artist || "Unknown Artist"}
                    isScrolling={isPlaying}
                  />
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-600"
                    style={{
                      width: `${
                        totalTime > 0 ? (elapsedTime / totalTime) * 100 : 0
                      }%`,
                    }}
                  />
                </div>
                <div className="mt-1 text-xs font-chicago w-full flex justify-between">
                  <span>
                    {Math.floor(elapsedTime / 60)}:
                    {String(Math.floor(elapsedTime % 60)).padStart(2, "0")}
                  </span>
                  <span>
                    {Math.floor(totalTime / 60)}:
                    {String(Math.floor(totalTime % 60)).padStart(2, "0")}
                  </span>
                </div>
                <div className="mt-2">
                  {isPlaying ? (
                    <span className="text-xs">▶️ Playing</span>
                  ) : (
                    <span className="text-xs">⏸️ Paused</span>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center font-chicago text-xs">
                <p>No track selected</p>
                <p>Use the wheel to</p>
                <p>browse your library</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function IpodAppComponent({
  isWindowOpen,
  onClose,
  isForeground,
}: AppProps) {
  const { play: playClickSound } = useSound(Sounds.BUTTON_CLICK);
  const { play: playScrollSound } = useSound(Sounds.MENU_OPEN);

  const loadedLibrary = loadLibrary();
  const [tracks, setTracks] = useState<Track[]>(loadedLibrary);
  const [currentIndex, setCurrentIndex] = useState(loadIpodCurrentIndex());
  const [originalOrder, setOriginalOrder] = useState<Track[]>(loadedLibrary);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopCurrent, setLoopCurrent] = useState(loadIpodIsLoopCurrent());
  const [loopAll, setLoopAll] = useState(loadIpodIsLoopAll());
  const [isShuffled, setIsShuffled] = useState(loadIpodIsShuffled());

  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [urlInput, setUrlInput] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);

  const [menuMode, setMenuMode] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState(0);
  const [menuTitle, setMenuTitle] = useState("iPod");

  const playerRef = useRef<ReactPlayer>(null);

  const makeMenuItems = () => {
    return [
      {
        label: "Music",
        action: () => {
          setMenuTitle("Music");
          setMenuItems(
            tracks.map((track, index) => ({
              label: track.title,
              action: () => {
                setCurrentIndex(index);
                setIsPlaying(true);
                setMenuMode(false);
              },
            }))
          );
        },
      },
      {
        label: "Extras",
        action: () => {
          setIsAddDialogOpen(true);
        },
      },
      {
        label: "Settings",
        action: () => {
          setMenuTitle("Settings");
          setMenuItems([
            {
              label: `Repeat: ${loopCurrent ? "One" : loopAll ? "All" : "Off"}`,
              action: () => {
                if (loopCurrent) {
                  setLoopCurrent(false);
                  setLoopAll(false);
                } else if (loopAll) {
                  setLoopCurrent(true);
                  setLoopAll(false);
                } else {
                  setLoopAll(true);
                }
              },
            },
            {
              label: `Shuffle: ${isShuffled ? "On" : "Off"}`,
              action: toggleShuffle,
            },
            {
              label: "Back",
              action: () => {
                setMenuTitle("iPod");
                setMenuItems(makeMenuItems());
              },
            },
          ]);
        },
      },
      {
        label: "Shuffle Songs",
        action: () => {
          toggleShuffle();
          setMenuMode(false);
        },
      },
      {
        label: "Backlight",
        action: () => {
          // Toggle backlight functionality could be added here
          setMenuMode(false);
        },
      },
      {
        label: "Now Playing",
        action: () => setMenuMode(false),
      },
    ];
  };

  const [menuItems, setMenuItems] = useState(makeMenuItems());

  // Update menu items when certain states change
  useEffect(() => {
    if (menuTitle === "iPod") {
      setMenuItems(makeMenuItems());
    } else if (menuTitle === "Settings") {
      setMenuItems([
        {
          label: `Repeat: ${loopCurrent ? "One" : loopAll ? "All" : "Off"}`,
          action: () => {
            if (loopCurrent) {
              setLoopCurrent(false);
              setLoopAll(false);
            } else if (loopAll) {
              setLoopCurrent(true);
              setLoopAll(false);
            } else {
              setLoopAll(true);
            }
          },
        },
        {
          label: `Shuffle: ${isShuffled ? "On" : "Off"}`,
          action: toggleShuffle,
        },
        {
          label: "Back",
          action: () => {
            setMenuTitle("iPod");
            setMenuItems(makeMenuItems());
          },
        },
      ]);
    }
  }, [isPlaying, loopCurrent, loopAll, isShuffled]);

  // Save state to storage whenever it changes
  useEffect(() => {
    saveLibrary(tracks);
  }, [tracks]);

  useEffect(() => {
    saveIpodCurrentIndex(currentIndex);
  }, [currentIndex]);

  useEffect(() => {
    saveIpodIsLoopAll(loopAll);
  }, [loopAll]);

  useEffect(() => {
    saveIpodIsLoopCurrent(loopCurrent);
  }, [loopCurrent]);

  useEffect(() => {
    saveIpodIsShuffled(isShuffled);
  }, [isShuffled]);

  // Reset elapsed time when changing tracks
  useEffect(() => {
    setElapsedTime(0);
  }, [currentIndex]);

  // Handle shuffle
  useEffect(() => {
    if (isShuffled) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      setTracks(shuffled);
    } else {
      setTracks([...originalOrder]);
    }
  }, [isShuffled]);

  // Keep original order in sync with new additions
  useEffect(() => {
    if (!isShuffled) {
      setOriginalOrder(tracks);
    }
  }, [tracks, isShuffled]);

  const extractVideoId = (url: string): string | null => {
    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[7].length === 11 ? match[7] : null;
  };

  const addTrack = async (url: string) => {
    try {
      const videoId = extractVideoId(url);
      if (!videoId) {
        throw new Error("Invalid YouTube URL");
      }

      const trackInfo = await fetchTrackInfo(videoId);
      const newTrack: Track = {
        id: videoId,
        url,
        title: trackInfo.title,
        artist: trackInfo.artist,
      };

      setTracks((prev) => [...prev, newTrack]);
      if (!isShuffled) {
        setOriginalOrder((prev) => [...prev, newTrack]);
      }

      setUrlInput("");
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Failed to add track:", error);
    }
  };

  const nextTrack = () => {
    if (tracks.length === 0) return;
    playClickSound();
    setCurrentIndex((prev) => {
      if (prev === tracks.length - 1) {
        if (loopAll) {
          return 0;
        }
        return prev;
      }
      return prev + 1;
    });
    setIsPlaying(true);
  };

  const previousTrack = () => {
    if (tracks.length === 0) return;
    playClickSound();
    setCurrentIndex((prev) => {
      if (prev === 0) {
        if (loopAll) {
          return tracks.length - 1;
        }
        return prev;
      }
      return prev - 1;
    });
    setIsPlaying(true);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    playClickSound();
  };

  const toggleShuffle = () => {
    setIsShuffled(!isShuffled);
    playClickSound();
  };

  const handleTrackEnd = () => {
    if (loopCurrent) {
      playerRef.current?.seekTo(0);
      setIsPlaying(true);
    } else {
      nextTrack();
    }
  };

  const handleProgress = (state: { playedSeconds: number }) => {
    setElapsedTime(Math.floor(state.playedSeconds));
  };

  const handleDuration = (duration: number) => {
    setTotalTime(duration);
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

  // iPod wheel controls
  const handleWheelClick = (
    area: "top" | "right" | "bottom" | "left" | "center"
  ) => {
    playClickSound();
    switch (area) {
      case "top":
        if (menuMode) {
          setSelectedMenuItem(Math.max(0, selectedMenuItem - 1));
        } else {
          setIsPlaying(true);
        }
        break;
      case "right":
        nextTrack();
        break;
      case "bottom":
        if (menuMode) {
          setSelectedMenuItem(
            Math.min(menuItems.length - 1, selectedMenuItem + 1)
          );
        } else {
          setIsPlaying(false);
        }
        break;
      case "left":
        previousTrack();
        break;
      case "center":
        if (menuMode) {
          menuItems[selectedMenuItem]?.action();
        } else {
          togglePlay();
        }
        break;
    }
  };

  const handleWheelRotation = (direction: "clockwise" | "counterclockwise") => {
    playScrollSound();
    if (menuMode) {
      if (direction === "clockwise") {
        setSelectedMenuItem(
          Math.min(menuItems.length - 1, selectedMenuItem + 1)
        );
      } else {
        setSelectedMenuItem(Math.max(0, selectedMenuItem - 1));
      }
    } else {
      // Volume control or seek when not in menu mode
      const currentTime = playerRef.current?.getCurrentTime() || 0;
      if (direction === "clockwise") {
        playerRef.current?.seekTo(currentTime + 5);
      } else {
        playerRef.current?.seekTo(Math.max(0, currentTime - 5));
      }
    }
  };

  const handleMenuButton = () => {
    playClickSound();
    setMenuMode(!menuMode);
    if (!menuMode) {
      setMenuTitle("iPod");
      setMenuItems(makeMenuItems());
      setSelectedMenuItem(0);
    }
  };

  if (!isWindowOpen) return null;

  return (
    <>
      <IpodMenuBar
        onClose={onClose}
        onShowHelp={() => setIsHelpDialogOpen(true)}
        onShowAbout={() => setIsAboutDialogOpen(true)}
        tracks={tracks}
        currentIndex={currentIndex}
        onPlayTrack={(index) => {
          setCurrentIndex(index);
          setIsPlaying(true);
        }}
        onClearLibrary={() => {
          setIsConfirmClearOpen(true);
        }}
        onResetLibrary={() => {
          setIsConfirmResetOpen(true);
        }}
        onShuffleLibrary={toggleShuffle}
        onToggleLoopAll={() => setLoopAll(!loopAll)}
        onToggleLoopCurrent={() => setLoopCurrent(!loopCurrent)}
        onTogglePlay={togglePlay}
        onNext={nextTrack}
        onPrevious={previousTrack}
        onAddTrack={() => setIsAddDialogOpen(true)}
        isLoopAll={loopAll}
        isLoopCurrent={loopCurrent}
        isPlaying={isPlaying}
        isShuffled={isShuffled}
      />

      <WindowFrame
        title="iPod"
        onClose={onClose}
        isForeground={isForeground}
        appId="ipod"
      >
        {/* Hidden audio player */}
        <div className="absolute top-0 left-0 w-0 h-0 overflow-hidden">
          {tracks.length > 0 && (
            <ReactPlayer
              ref={playerRef}
              url={tracks[currentIndex]?.url}
              playing={isPlaying}
              controls={false}
              width="0"
              height="0"
              onEnded={handleTrackEnd}
              onProgress={handleProgress}
              onDuration={handleDuration}
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
                  },
                },
              }}
            />
          )}
        </div>

        <div className="flex flex-col items-center w-full h-full bg-gradient-to-b from-gray-100 to-gray-300 p-4">
          {/* iPod device */}
          <div className="w-[250px] h-[400px] bg-white rounded-xl shadow-xl border border-gray-200 flex flex-col items-center p-2">
            {/* Screen */}
            <IpodScreen
              currentTrack={tracks[currentIndex] || null}
              isPlaying={isPlaying}
              elapsedTime={elapsedTime}
              totalTime={totalTime}
              menuMode={menuMode}
              menuItems={menuItems}
              selectedMenuItem={selectedMenuItem}
              onSelectMenuItem={setSelectedMenuItem}
              menuTitle={menuTitle}
            />

            {/* Click Wheel */}
            <div className="mt-8 relative w-[180px] h-[180px] rounded-full bg-gray-200 flex items-center justify-center">
              {/* Center button */}
              <button
                onClick={() => handleWheelClick("center")}
                className="absolute w-16 h-16 rounded-full bg-white z-10 flex items-center justify-center"
              />

              {/* Wheel sections */}
              <div
                className="absolute w-full h-full rounded-full"
                onMouseDown={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const centerX = rect.left + rect.width / 2;
                  const centerY = rect.top + rect.height / 2;
                  const mouseX = e.clientX;
                  const mouseY = e.clientY;

                  // Calculate angle from center
                  const angle =
                    (Math.atan2(mouseY - centerY, mouseX - centerX) * 180) /
                    Math.PI;

                  // Determine which section was clicked
                  if (angle >= -45 && angle < 45) {
                    handleWheelClick("right");
                  } else if (angle >= 45 && angle < 135) {
                    handleWheelClick("bottom");
                  } else if (angle >= 135 || angle < -135) {
                    handleWheelClick("left");
                  } else {
                    handleWheelClick("top");
                  }
                }}
                onWheel={(e) => {
                  if (e.deltaY < 0) {
                    handleWheelRotation("counterclockwise");
                  } else {
                    handleWheelRotation("clockwise");
                  }
                }}
              >
                {/* Wheel controls with text */}
                <button
                  onClick={() => handleMenuButton()}
                  className="absolute top-4 left-1/2 transform -translate-x-1/2 font-chicago text-xs text-gray-700"
                >
                  MENU
                </button>
                <div className="absolute right-6 top-1/2 transform -translate-y-1/2 font-chicago text-xs text-gray-700">
                  ▶︎▶︎
                </div>
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 font-chicago text-xs text-gray-700">
                  ▶︎❙❙
                </div>
                <div className="absolute left-6 top-1/2 transform -translate-y-1/2 font-chicago text-xs text-gray-700">
                  ◀︎◀︎
                </div>
              </div>
            </div>
          </div>
        </div>

        <HelpDialog
          isOpen={isHelpDialogOpen}
          onOpenChange={setIsHelpDialogOpen}
          helpItems={helpItems}
          appName="iPod"
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
            setTracks([]);
            setOriginalOrder([]);
            setCurrentIndex(0);
            setIsPlaying(false);
            setIsConfirmClearOpen(false);
          }}
          title="Clear Library"
          description="Are you sure you want to clear your entire music library? This action cannot be undone."
        />
        <ConfirmDialog
          isOpen={isConfirmResetOpen}
          onOpenChange={setIsConfirmResetOpen}
          onConfirm={() => {
            setTracks(DEFAULT_TRACKS);
            setOriginalOrder(DEFAULT_TRACKS);
            setCurrentIndex(0);
            setIsPlaying(false);
            setIsConfirmResetOpen(false);
          }}
          title="Reset Library"
          description="Are you sure you want to reset your music library to the default tracks? This will replace your current library."
        />
        <InputDialog
          isOpen={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSubmit={addTrack}
          title="Add Music"
          description="Enter a YouTube URL to add to your iPod"
          value={urlInput}
          onChange={setUrlInput}
        />
      </WindowFrame>
    </>
  );
}
