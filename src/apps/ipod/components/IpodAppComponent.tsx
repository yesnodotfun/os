import { useState, useRef, useEffect } from "react";
import ReactPlayer from "react-player";
import { motion } from "framer-motion";
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
  loadPlaylist,
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
  const fullTitle = data.title;

  // Try to extract artist and song title (common format: "Artist - Title")
  let artist;
  let title = fullTitle; // Default to full title if we can't parse it

  const splitTitle = fullTitle.split(" - ");
  if (splitTitle.length > 1) {
    artist = splitTitle[0];
    // Join the rest of the parts in case there are multiple dashes
    title = splitTitle.slice(1).join(" - ");
  }

  return {
    title,
    artist,
  };
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
        "px-2 cursor-pointer font-chicago text-[16px] flex justify-between items-center",
        isSelected ? "bg-black text-white" : "text-black hover:bg-gray-200"
      )}
    >
      <span className="whitespace-nowrap overflow-hidden text-ellipsis flex-1 mr-2">
        {text}
      </span>
      <span className="flex-shrink-0">{">"}</span>
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
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to keep selected item visible
  useEffect(() => {
    if (menuRef.current) {
      const selectedItem = menuRef.current.children[
        selectedIndex
      ] as HTMLElement;
      if (selectedItem) {
        const menuContainer = menuRef.current;
        const itemTop = selectedItem.offsetTop;
        const itemHeight = selectedItem.offsetHeight;
        const containerHeight = menuContainer.clientHeight;
        const scrollTop = menuContainer.scrollTop;

        // If item is below the visible area
        if (itemTop + itemHeight > scrollTop + containerHeight) {
          menuContainer.scrollTop = itemTop + itemHeight - containerHeight;
        }
        // If item is above the visible area
        else if (itemTop < scrollTop) {
          menuContainer.scrollTop = Math.max(0, itemTop);
        }

        // Force scroll to top for first item
        if (selectedIndex === 0) {
          menuContainer.scrollTop = 0;
        }
      }
    }
  }, [selectedIndex]);

  return (
    <div ref={containerRef} className="flex flex-col h-full">
      <div className="border-b border-gray-400 py-0 px-2 font-chicago text-[16px] flex justify-between items-center sticky top-0 z-10">
        <div className="w-6 text-xs">{isPlaying ? "▶" : "II"}</div>
        <div>{title}</div>
        <div className="w-6 text-xs"></div>
      </div>
      <div ref={menuRef} className="flex-1 overflow-auto">
        {items.map((item, index) => (
          <MenuListItem
            key={index}
            text={item.label}
            isSelected={index === selectedIndex}
            onClick={() => {
              onSelect(index);
              // Don't execute action on click, just select
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ScrollingText({
  text,
  className,
  isPlaying = true,
}: {
  text: string;
  className?: string;
  isPlaying?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [contentWidth, setContentWidth] = useState(0);

  // Check if text needs to scroll (is wider than container)
  useEffect(() => {
    if (containerRef.current && textRef.current) {
      const newContainerWidth = containerRef.current.clientWidth;
      const newContentWidth = textRef.current.scrollWidth;

      setContentWidth(newContentWidth);
      setShouldScroll(newContentWidth > newContainerWidth);
    }
  }, [text, containerRef, textRef]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden",
        !shouldScroll && "flex justify-center",
        className
      )}
    >
      {shouldScroll ? (
        <div className="inline-block whitespace-nowrap">
          <motion.div
            animate={{
              x: isPlaying ? [0, -contentWidth] : 0,
            }}
            transition={
              isPlaying
                ? {
                    duration: Math.max(text.length * 0.15, 8),
                    ease: "linear",
                    repeat: Infinity,
                  }
                : {
                    duration: 0.3,
                  }
            }
            style={{ display: "inline-flex" }}
          >
            <span ref={textRef} style={{ paddingRight: "20px" }}>
              {text}
            </span>
            <span style={{ paddingRight: "20px" }} aria-hidden>
              {text}
            </span>
          </motion.div>
        </div>
      ) : (
        <div ref={textRef} className="whitespace-nowrap text-center">
          {text}
        </div>
      )}
    </div>
  );
}

// Add function to handle backlight state
const loadIpodBacklight = (): boolean => {
  const saved = localStorage.getItem("ipod-backlight");
  return saved === null ? true : saved === "true";
};

const saveIpodBacklight = (value: boolean) => {
  localStorage.setItem("ipod-backlight", value.toString());
};

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
  currentIndex,
  tracksLength,
  backlightOn,
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
  currentIndex: number;
  tracksLength: number;
  backlightOn: boolean;
}) {
  return (
    <div
      className={cn(
        "relative w-full h-[160px] border border-gray-500 border-2 rounded-t-md overflow-hidden transition-all duration-500",
        backlightOn ? "bg-white" : "bg-gray-300 opacity-60"
      )}
    >
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
          <div className="border-b border-gray-400 py-0 px-2 font-chicago text-[16px] flex justify-between items-center">
            <div className="w-6 text-xs">{isPlaying ? "▶" : "II"}</div>
            <div>Now Playing</div>
            <div className="w-6 text-xs"></div>
          </div>
          <div className="flex-1 flex flex-col p-1 px-2">
            {currentTrack ? (
              <>
                <div className="font-chicago text-[12px] mb-1">
                  {currentIndex + 1} of {tracksLength}
                </div>
                <div className="font-chicago text-[16px] mb-4 text-center">
                  <ScrollingText
                    text={currentTrack.title}
                    className="mb-0.5"
                    isPlaying={isPlaying}
                  />
                  <ScrollingText
                    text={currentTrack.artist || ""}
                    isPlaying={isPlaying}
                  />
                </div>
                <div className="mt-auto w-full h-2 bg-gray-200 rounded-full border border-black overflow-hidden">
                  <div
                    className="h-full bg-black"
                    style={{
                      width: `${
                        totalTime > 0 ? (elapsedTime / totalTime) * 100 : 0
                      }%`,
                    }}
                  />
                </div>
                <div className="font-chicago text-[16px] w-full flex justify-between">
                  <span>
                    {Math.floor(elapsedTime / 60)}:
                    {String(Math.floor(elapsedTime % 60)).padStart(2, "0")}
                  </span>
                  <span>
                    -{Math.floor((totalTime - elapsedTime) / 60)}:
                    {String(
                      Math.floor((totalTime - elapsedTime) % 60)
                    ).padStart(2, "0")}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center font-chicago text-[16px]">
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
  // Add backlight state
  const [backlightOn, setBacklightOn] = useState(loadIpodBacklight());

  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [urlInput, setUrlInput] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);

  const [wheelDelta, setWheelDelta] = useState(0);
  const [touchStartAngle, setTouchStartAngle] = useState<number | null>(null);
  const [lastTouchEventTime, setLastTouchEventTime] = useState(0);
  const touchEventThrottleMs = 50; // Reduced from 150ms to 50ms for faster response
  const wheelRef = useRef<HTMLDivElement>(null);

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
              label: `Backlight: ${backlightOn ? "On" : "Off"}`,
              action: toggleBacklight,
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
          toggleBacklight();
          // Don't exit menu mode when toggling backlight
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
          label: `Backlight: ${backlightOn ? "On" : "Off"}`,
          action: toggleBacklight,
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
  }, [isPlaying, loopCurrent, loopAll, isShuffled, backlightOn]);

  // Save state to storage whenever it changes
  useEffect(() => {
    saveLibrary(tracks);
  }, [tracks]);

  // Fix the circular dependency in shuffle logic
  useEffect(() => {
    // Keep a reference to current tracks when not shuffled
    if (!isShuffled) {
      setOriginalOrder([...tracks]);
    }
  }, [tracks, isShuffled]);

  // Handle shuffle toggle
  useEffect(() => {
    if (isShuffled && originalOrder.length > 0) {
      // Only shuffle if we have an original order to shuffle from
      const shuffled = [...originalOrder].sort(() => Math.random() - 0.5);
      // Use a functional update to avoid race conditions
      setTracks(shuffled);
    } else if (!isShuffled && originalOrder.length > 0) {
      // Restore original order
      setTracks([...originalOrder]);
    }
    // Only run this when isShuffled changes, not when tracks or originalOrder change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isShuffled]);

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
    // Don't handle looping here if we're using ReactPlayer's built-in loop
    if (loopCurrent) {
      // ReactPlayer's loop prop will handle looping when loopCurrent is true
      // so we don't need to do anything here
      return;
    } else if (loopAll) {
      nextTrack();
    } else if (currentIndex < tracks.length - 1) {
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
          togglePlay();
        }
        break;
      case "left":
        previousTrack();
        break;
      case "center":
        if (menuMode) {
          // Execute the selected menu item's action
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

  // Calculate angle from center of wheel
  const getAngleFromCenter = (x: number, y: number): number => {
    if (!wheelRef.current) return 0;

    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    return (Math.atan2(y - centerY, x - centerX) * 180) / Math.PI;
  };

  // Determine wheel section from angle
  const getWheelSection = (
    angle: number
  ): "top" | "right" | "bottom" | "left" => {
    if (angle >= -45 && angle < 45) {
      return "right";
    } else if (angle >= 45 && angle < 135) {
      return "bottom";
    } else if (angle >= 135 || angle < -135) {
      return "left";
    } else {
      return "top";
    }
  };

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const angle = getAngleFromCenter(touch.clientX, touch.clientY);
    setTouchStartAngle(angle);
  };

  // Handle touch move
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartAngle === null) return;

    const now = Date.now();
    // Throttle touch events to prevent over-triggering
    if (now - lastTouchEventTime < touchEventThrottleMs) return;

    const touch = e.touches[0];
    const currentAngle = getAngleFromCenter(touch.clientX, touch.clientY);

    // Calculate the difference in angle
    let angleDifference = currentAngle - touchStartAngle;

    // Handle the case where we cross the -180/180 boundary
    if (angleDifference > 180) angleDifference -= 360;
    if (angleDifference < -180) angleDifference += 360;

    // Update rotation direction when the difference is large enough
    // Reduced threshold from 15 to 8 for more sensitive rotation
    if (Math.abs(angleDifference) > 8) {
      if (angleDifference > 0) {
        handleWheelRotation("clockwise");
      } else {
        handleWheelRotation("counterclockwise");
      }
      setTouchStartAngle(currentAngle);
      setLastTouchEventTime(now);
    }
  };

  // Handle touch end
  const handleTouchEnd = () => {
    setTouchStartAngle(null);
  };

  // Save backlight state to storage
  useEffect(() => {
    saveIpodBacklight(backlightOn);
  }, [backlightOn]);

  const toggleBacklight = () => {
    setBacklightOn(!backlightOn);
    playClickSound();
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
        transparentBackground
      >
        {/* Hidden audio player */}
        <div className="absolute top-0 left-0 opacity-10 pointer-events-none">
          {tracks.length > 0 && (
            <ReactPlayer
              ref={playerRef}
              url={tracks[currentIndex]?.url}
              playing={isPlaying}
              controls={false}
              width="1px"
              height="1px"
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
                    playsinline: 1,
                  },
                },
              }}
            />
          )}
        </div>

        <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-b from-gray-100/20 to-gray-300/20 backdrop-blur-lg p-4">
          {/* iPod device */}
          <div className="w-[250px] h-[400px] bg-white rounded-2xl shadow-xl border border-black/40 flex flex-col items-center p-4">
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
              currentIndex={currentIndex}
              tracksLength={tracks.length}
              backlightOn={backlightOn}
            />

            {/* Click Wheel */}
            <div className="mt-8 mb-3 relative w-[180px] h-[180px] rounded-full bg-gray-200 flex items-center justify-center">
              {/* Center button */}
              <button
                onClick={() => handleWheelClick("center")}
                className="absolute w-16 h-16 rounded-full bg-white z-10 flex items-center justify-center"
              />

              {/* Wheel sections */}
              <div
                ref={wheelRef}
                className="absolute w-full h-full rounded-full"
                onMouseDown={(e) => {
                  // Don't handle wheel clicks if we're clicking on the menu button
                  if (
                    e.target &&
                    (e.target as HTMLElement).classList.contains("menu-button")
                  ) {
                    return;
                  }
                  const angle = getAngleFromCenter(e.clientX, e.clientY);
                  const section = getWheelSection(angle);
                  handleWheelClick(section);
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onWheel={(e) => {
                  // Accumulate delta and only trigger when it reaches threshold
                  const newDelta = wheelDelta + Math.abs(e.deltaY);
                  setWheelDelta(newDelta);

                  // Using a threshold of 50 to reduce sensitivity
                  if (newDelta >= 50) {
                    if (e.deltaY < 0) {
                      handleWheelRotation("counterclockwise");
                    } else {
                      handleWheelRotation("clockwise");
                    }
                    // Reset delta after triggering action
                    setWheelDelta(0);
                  }
                }}
              >
                {/* Wheel labels - no click handlers */}
                <div
                  className="absolute top-3 left-1/2 transform -translate-x-1/2 font-chicago text-xs text-white menu-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMenuButton();
                  }}
                >
                  MENU
                </div>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 font-chicago text-[9px] text-white">
                  ▶︎▶︎
                </div>
                <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 font-chicago text-[9px] text-white">
                  ▶︎❙❙
                </div>
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 font-chicago text-[9px] text-white">
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
            // Use the videos default playlist
            const defaultTracks = loadPlaylist();
            setTracks(
              defaultTracks.map((video) => ({
                id: video.id,
                url: video.url,
                title: video.title,
                artist: video.artist,
                album: "Shared Playlist",
              }))
            );
            setOriginalOrder(
              defaultTracks.map((video) => ({
                id: video.id,
                url: video.url,
                title: video.title,
                artist: video.artist,
                album: "Shared Playlist",
              }))
            );
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
