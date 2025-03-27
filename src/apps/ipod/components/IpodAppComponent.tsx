import { useState, useRef, useEffect } from "react";
import ReactPlayer from "react-player";
import { motion, AnimatePresence } from "framer-motion";
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
  DEFAULT_VIDEOS,
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
  backlightOn = true,
  showChevron = true,
  value,
}: {
  text: string;
  isSelected: boolean;
  onClick: () => void;
  backlightOn?: boolean;
  showChevron?: boolean;
  value?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "px-2 cursor-pointer font-chicago text-[16px] flex justify-between items-center",
        isSelected
          ? backlightOn
            ? "bg-[#0a3667] text-[#c5e0f5] [text-shadow:1px_1px_0_rgba(0,0,0,0.15)]"
            : "bg-[#0a3667] text-[#8a9da9] [text-shadow:1px_1px_0_rgba(0,0,0,0.15)]"
          : "text-[#0a3667] hover:bg-[#c0d8f0] [text-shadow:1px_1px_0_rgba(0,0,0,0.15)]"
      )}
    >
      <span className="whitespace-nowrap overflow-hidden text-ellipsis flex-1 mr-2">
        {text}
      </span>
      {value ? (
        <span className="flex-shrink-0">{value}</span>
      ) : (
        showChevron && <span className="flex-shrink-0">{">"}</span>
      )}
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
  const paddingWidth = 20; // Width of padding between text duplicates

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
              x: isPlaying ? [0, -(contentWidth + paddingWidth)] : 0,
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
            <span ref={textRef} style={{ paddingRight: `${paddingWidth}px` }}>
              {text}
            </span>
            <span style={{ paddingRight: `${paddingWidth}px` }} aria-hidden>
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

// Add StatusDisplay component after the ScrollingText component
function StatusDisplay({ message }: { message: string }) {
  return (
    <div className="absolute top-4 left-4 pointer-events-none">
      <div className="relative">
        <div className="font-chicago text-white text-xl relative z-10">
          {message}
        </div>
        <div
          className="font-chicago text-black text-xl absolute inset-0"
          style={{
            WebkitTextStroke: "3px black",
            textShadow: "none",
          }}
        >
          {message}
        </div>
      </div>
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
  menuHistory,
  selectedMenuItem,
  onSelectMenuItem,
  currentIndex,
  tracksLength,
  backlightOn,
  menuDirection,
  onMenuItemAction,
  showVideo,
  playerRef,
  handleTrackEnd,
  handleProgress,
  handleDuration,
  handlePlay,
  handlePause,
  handleReady,
  loopCurrent,
  statusMessage,
}: {
  currentTrack: Track | null;
  isPlaying: boolean;
  elapsedTime: number;
  totalTime: number;
  menuMode: boolean;
  menuHistory: {
    title: string;
    items: {
      label: string;
      action: () => void;
      showChevron?: boolean;
      value?: string;
    }[];
    selectedIndex: number;
  }[];
  selectedMenuItem: number;
  onSelectMenuItem: (index: number) => void;
  currentIndex: number;
  tracksLength: number;
  backlightOn: boolean;
  menuDirection: "forward" | "backward";
  onMenuItemAction: (action: () => void) => void;
  showVideo: boolean;
  playerRef: React.RefObject<ReactPlayer>;
  handleTrackEnd: () => void;
  handleProgress: (state: { playedSeconds: number }) => void;
  handleDuration: (duration: number) => void;
  handlePlay: () => void;
  handlePause: () => void;
  handleReady: () => void;
  loopCurrent: boolean;
  statusMessage: string | null;
}) {
  // Animation variants for menu transitions
  const menuVariants = {
    enter: (direction: "forward" | "backward") => ({
      x: direction === "forward" ? "100%" : "-100%",
    }),
    center: {
      x: 0,
    },
    exit: (direction: "forward" | "backward") => ({
      x: direction === "forward" ? "-100%" : "100%",
    }),
  };

  // Current menu title
  const currentMenuTitle = menuMode
    ? menuHistory.length > 0
      ? menuHistory[menuHistory.length - 1].title
      : "iPod"
    : "Now Playing";

  // Refs
  const menuScrollRef = useRef<HTMLDivElement>(null);
  const menuItemsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Need scroll flag
  const needScrollRef = useRef(false);

  // Reset refs when menu items change
  const resetItemRefs = (count: number) => {
    menuItemsRef.current = Array(count).fill(null);
  };

  // More direct scroll approach that doesn't rely on refs being attached yet
  const forceScrollToSelected = () => {
    // Return if we're not in menu mode
    if (!menuMode || menuHistory.length === 0) return;

    // Get the current menu's container
    const container = document.querySelector(
      ".ipod-menu-container"
    ) as HTMLElement;
    if (!container) return;

    // Get all menu items
    const menuItems = Array.from(container.querySelectorAll(".ipod-menu-item"));
    if (!menuItems.length) return;

    // Exit if selectedMenuItem is out of bounds
    if (selectedMenuItem < 0 || selectedMenuItem >= menuItems.length) return;

    // Get the selected item
    const selectedItem = menuItems[selectedMenuItem] as HTMLElement;
    if (!selectedItem) return;

    // Calculate scroll position
    const containerHeight = container.clientHeight;
    const itemTop = selectedItem.offsetTop;
    const itemHeight = selectedItem.offsetHeight;
    const scrollTop = container.scrollTop;

    // Use smooth scrolling with a small buffer to prevent edge flickering
    // Add a 2px buffer at top and bottom to prevent edge flickering
    const buffer = 2;

    // If item is below the visible area
    if (itemTop + itemHeight > scrollTop + containerHeight - buffer) {
      container.scrollTo({
        top: itemTop + itemHeight - containerHeight + buffer,
        behavior: "smooth",
      });
    }
    // If item is above the visible area
    else if (itemTop < scrollTop + buffer) {
      container.scrollTo({
        top: Math.max(0, itemTop - buffer),
        behavior: "smooth",
      });
    }

    // Force scroll to top for first item
    if (selectedMenuItem === 0) {
      container.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }

    // For last item, ensure it's fully visible
    if (selectedMenuItem === menuItems.length - 1) {
      container.scrollTo({
        top: Math.max(0, itemTop - (containerHeight - itemHeight) + buffer),
        behavior: "smooth",
      });
    }

    // Reset need scroll flag
    needScrollRef.current = false;
  };

  // Trigger scroll on various conditions
  useEffect(() => {
    if (menuMode && menuHistory.length > 0) {
      // Flag that we need to scroll
      needScrollRef.current = true;

      // Try immediately (in case DOM is ready)
      forceScrollToSelected();

      // Schedule multiple attempts with increasing delays
      const attempts = [50, 100, 250, 500, 1000];

      attempts.forEach((delay) => {
        setTimeout(() => {
          if (needScrollRef.current) {
            forceScrollToSelected();
          }
        }, delay);
      });
    }
  }, [menuMode, selectedMenuItem, menuHistory.length]);

  // Prepare for a newly opened menu
  useEffect(() => {
    if (menuMode && menuHistory.length > 0) {
      const currentMenu = menuHistory[menuHistory.length - 1];
      resetItemRefs(currentMenu.items.length);
    }
  }, [menuMode, menuHistory.length]);

  return (
    <div
      className={cn(
        "relative w-full h-[160px] border border-black border-2 rounded-[2px] overflow-hidden transition-all duration-500",
        backlightOn
          ? "bg-[#c5e0f5] bg-gradient-to-b from-[#d1e8fa] to-[#e0f0fc]"
          : "bg-[#8a9da9] contrast-65 saturate-50"
      )}
    >
      {/* Video player */}
      {currentTrack && (
        <div
          className={cn(
            "absolute inset-0 z-20 transition-opacity duration-300 overflow-hidden",
            showVideo && isPlaying
              ? "opacity-100"
              : "opacity-0 pointer-events-none"
          )}
        >
          <div className="w-full h-[calc(100%+120px)] mt-[-60px]">
            <ReactPlayer
              ref={playerRef}
              url={currentTrack.url}
              playing={isPlaying}
              controls={showVideo}
              width="100%"
              height="100%"
              onEnded={handleTrackEnd}
              onProgress={handleProgress}
              onDuration={handleDuration}
              onPlay={handlePlay}
              onPause={handlePause}
              onReady={handleReady}
              loop={loopCurrent}
              playsinline={true}
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
            {/* Status Display */}
            <AnimatePresence>
              {statusMessage && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <StatusDisplay message={statusMessage} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Title bar - not animated, immediately swaps */}
      <div className="border-b border-[#0a3667] py-0 px-2 font-chicago text-[16px] flex justify-between items-center sticky top-0 z-10 text-[#0a3667] [text-shadow:1px_1px_0_rgba(0,0,0,0.15)]">
        <div className="w-6 text-xs mt-0.5">{isPlaying ? "▶" : "❙❙"}</div>
        <div>{currentMenuTitle}</div>
        <div className="w-6 text-xs"></div>
      </div>

      {/* Content area - this animates/slides */}
      <div className="relative h-[calc(100%-26px)]">
        <AnimatePresence initial={false} custom={menuDirection} mode="sync">
          {menuMode ? (
            <motion.div
              key={`menu-${menuHistory.length}-${currentMenuTitle}`}
              className="absolute inset-0 flex flex-col h-full"
              initial="enter"
              animate="center"
              exit="exit"
              variants={menuVariants}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              custom={menuDirection}
              onAnimationComplete={() => {
                // Flag that we need to scroll and trigger the scroll logic
                needScrollRef.current = true;
                forceScrollToSelected();
              }}
            >
              <div
                ref={menuScrollRef}
                className="flex-1 overflow-auto ipod-menu-container"
              >
                {menuHistory.length > 0 &&
                  menuHistory[menuHistory.length - 1].items.map(
                    (item, index) => (
                      <div
                        key={index}
                        ref={(el) => (menuItemsRef.current[index] = el)}
                        className={`ipod-menu-item ${
                          index === selectedMenuItem ? "selected" : ""
                        }`}
                      >
                        <MenuListItem
                          text={item.label}
                          isSelected={index === selectedMenuItem}
                          backlightOn={backlightOn}
                          onClick={() => {
                            onSelectMenuItem(index);
                            onMenuItemAction(item.action);
                          }}
                          showChevron={item.showChevron !== false}
                          value={item.value}
                        />
                      </div>
                    )
                  )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="nowplaying"
              className="absolute inset-0 flex flex-col h-full"
              initial="enter"
              animate="center"
              exit="exit"
              variants={menuVariants}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              custom={menuDirection}
            >
              <div className="flex-1 flex flex-col p-1 px-2 overflow-auto">
                {currentTrack ? (
                  <>
                    <div className="font-chicago text-[12px] mb-1 text-[#0a3667] [text-shadow:1px_1px_0_rgba(0,0,0,0.15)]">
                      {currentIndex + 1} of {tracksLength}
                    </div>
                    <div className="font-chicago text-[16px] text-center text-[#0a3667] [text-shadow:1px_1px_0_rgba(0,0,0,0.15)]">
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
                    <div className="mt-auto w-full h-[8px] rounded-full border border-[#0a3667] overflow-hidden">
                      <div
                        className="h-full bg-[#0a3667]"
                        style={{
                          width: `${
                            totalTime > 0 ? (elapsedTime / totalTime) * 100 : 0
                          }%`,
                        }}
                      />
                    </div>
                    <div className="font-chicago text-[16px] w-full flex justify-between text-[#0a3667] [text-shadow:1px_1px_0_rgba(0,0,0,0.15)]">
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
                  <div className="text-center font-chicago text-[16px] text-[#0a3667] [text-shadow:1px_1px_0_rgba(0,0,0,0.15)]">
                    <p>No track selected</p>
                    <p>Use the wheel to</p>
                    <p>browse your library</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
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
  const [showVideo, setShowVideo] = useState(false);
  const [loopCurrent, setLoopCurrent] = useState(loadIpodIsLoopCurrent());
  const [loopAll, setLoopAll] = useState(loadIpodIsLoopAll());
  const [isShuffled, setIsShuffled] = useState(loadIpodIsShuffled());
  // Add backlight state
  const [backlightOn, setBacklightOn] = useState(loadIpodBacklight());
  // Add last activity timestamp for backlight timer
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  // Add backlight timer timeout reference
  const backlightTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Add status message state and ref
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
  const [menuDirection, setMenuDirection] = useState<"forward" | "backward">(
    "forward"
  );
  // Add menu history/stack to track navigation
  const [menuHistory, setMenuHistory] = useState<
    {
      title: string;
      items: {
        label: string;
        action: () => void;
        showChevron?: boolean;
        value?: string;
      }[];
      selectedIndex: number;
    }[]
  >([]);

  // Add state to track if user came directly from "Now Playing" menu item
  const [cameFromNowPlayingMenuItem, setCameFromNowPlayingMenuItem] =
    useState(false);

  const playerRef = useRef<ReactPlayer>(null);

  // Handle menu item action to properly manage transitions
  const handleMenuItemAction = (action: () => void) => {
    // Execute the action directly - we manage history in the actions themselves
    action();
  };

  // Create main menu items
  const makeMainMenuItems = () => {
    return [
      {
        label: "Music",
        action: () => {
          // Turn off video when navigating to Music menu
          if (showVideo) {
            setShowVideo(false);
          }

          setMenuDirection("forward");
          // Use current tracks array which will already be in shuffled order if shuffle is on
          const musicSubmenu = tracks.map((track, index) => ({
            label: track.title,
            action: () => {
              setCurrentIndex(index);
              setIsPlaying(true);
              setMenuDirection("forward");
              setMenuMode(false);
              setCameFromNowPlayingMenuItem(false);
              // Turn off video when selecting a track
              if (showVideo) {
                setShowVideo(false);
              }
            },
            showChevron: false,
          }));

          // Push music menu to history
          setMenuHistory((prev) => [
            ...prev,
            {
              title: "Music",
              items: musicSubmenu,
              selectedIndex: 0,
            },
          ]);
          setSelectedMenuItem(0);
        },
        showChevron: true,
      },
      {
        label: "Extras",
        action: () => {
          // Turn off video when opening dialog
          if (showVideo) {
            setShowVideo(false);
          }
          setIsAddDialogOpen(true);
        },
        showChevron: true,
      },
      {
        label: "Settings",
        action: () => {
          // Turn off video when navigating to Settings
          if (showVideo) {
            setShowVideo(false);
          }

          setMenuDirection("forward");
          const settingsSubmenu = [
            {
              label: "Repeat",
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
              showChevron: false,
              value: loopCurrent ? "One" : loopAll ? "All" : "Off",
            },
            {
              label: "Shuffle",
              action: toggleShuffle,
              showChevron: false,
              value: isShuffled ? "On" : "Off",
            },
            {
              label: "Backlight",
              action: toggleBacklight,
              showChevron: false,
              value: backlightOn ? "On" : "Off",
            },
          ];

          // Push settings menu to history
          setMenuHistory((prev) => [
            ...prev,
            {
              title: "Settings",
              items: settingsSubmenu,
              selectedIndex: 0,
            },
          ]);
          setSelectedMenuItem(0);
        },
        showChevron: true,
      },
      {
        label: "Shuffle Songs",
        action: () => {
          // Turn off video when shuffling songs
          if (showVideo) {
            setShowVideo(false);
          }
          toggleShuffle();
          setMenuMode(false);
        },
        showChevron: false,
      },
      {
        label: "Backlight",
        action: () => {
          toggleBacklight();
          // Don't exit menu mode when toggling backlight
        },
        showChevron: false,
      },
      {
        label: "Now Playing",
        action: () => {
          setMenuDirection("forward");
          setMenuMode(false);
          setCameFromNowPlayingMenuItem(true);
        },
        showChevron: true,
      },
    ];
  };

  // Initialize menu with main menu items
  useEffect(() => {
    if (menuHistory.length === 0) {
      setMenuHistory([
        { title: "iPod", items: makeMainMenuItems(), selectedIndex: 0 },
      ]);
    }
  }, []);

  // Update menu items when certain states change
  useEffect(() => {
    if (menuHistory.length > 0) {
      const currentMenu = menuHistory[menuHistory.length - 1];

      if (currentMenu.title === "Settings") {
        // Update Settings menu when relevant state changes
        const updatedSettings = [
          {
            label: "Repeat",
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
            showChevron: false,
            value: loopCurrent ? "One" : loopAll ? "All" : "Off",
          },
          {
            label: "Shuffle",
            action: toggleShuffle,
            showChevron: false,
            value: isShuffled ? "On" : "Off",
          },
          {
            label: "Backlight",
            action: toggleBacklight,
            showChevron: false,
            value: backlightOn ? "On" : "Off",
          },
        ];

        setMenuHistory((prev) => [
          ...prev.slice(0, -1),
          { ...currentMenu, items: updatedSettings },
        ]);
      } else if (currentMenu.title === "iPod") {
        // Update main menu
        setMenuHistory((prev) => [
          {
            title: "iPod",
            items: makeMainMenuItems(),
            selectedIndex: prev[0].selectedIndex,
          },
        ]);
      } else if (currentMenu.title === "Music") {
        // Update music menu when tracks change or shuffle state changes
        const musicSubmenu = tracks.map((track, index) => ({
          label: track.title,
          action: () => {
            setCurrentIndex(index);
            setIsPlaying(true);
            setMenuDirection("forward");
            setMenuMode(false);
            setCameFromNowPlayingMenuItem(false);
          },
          showChevron: false,
        }));

        setMenuHistory((prev) => [
          ...prev.slice(0, -1),
          { ...currentMenu, items: musicSubmenu },
        ]);
      }
    }
  }, [isPlaying, loopCurrent, loopAll, isShuffled, backlightOn, tracks]);

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

  // Register user activity function to reset the timer
  const registerActivity = () => {
    setLastActivityTime(Date.now());
    if (!backlightOn) {
      setBacklightOn(true);
    }
  };

  // Setup backlight timer
  useEffect(() => {
    // Clear any existing timer
    if (backlightTimerRef.current) {
      clearTimeout(backlightTimerRef.current);
    }

    // Only set timer if backlight is on
    if (backlightOn) {
      backlightTimerRef.current = setTimeout(() => {
        // Turn off backlight after 5 seconds of inactivity
        if (Date.now() - lastActivityTime >= 5000) {
          setBacklightOn(false);
        }
      }, 5000);
    }

    return () => {
      if (backlightTimerRef.current) {
        clearTimeout(backlightTimerRef.current);
      }
    };
  }, [backlightOn, lastActivityTime]);

  // Handle foreground/background changes
  useEffect(() => {
    if (isForeground) {
      setBacklightOn(true);
      registerActivity();
    } else {
      setBacklightOn(false);
    }
  }, [isForeground]);

  // Add function to show status
  const showStatus = (message: string) => {
    setStatusMessage(message);
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
    }
    statusTimeoutRef.current = setTimeout(() => {
      setStatusMessage(null);
    }, 2000);
  };

  // Clean up status timeout
  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, []);

  const nextTrack = () => {
    if (tracks.length === 0) return;
    playClickSound();
    registerActivity();
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
    showStatus("⏭");
  };

  const previousTrack = () => {
    if (tracks.length === 0) return;
    playClickSound();
    registerActivity();
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
    showStatus("⏮");
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    playClickSound();
    registerActivity();
    showStatus(isPlaying ? "⏸" : "▶");
  };

  const toggleVideo = () => {
    setShowVideo(!showVideo);
    playClickSound();
    registerActivity();
  };

  const toggleShuffle = () => {
    setIsShuffled(!isShuffled);
    playClickSound();
    registerActivity();
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

  // Update handlePlay to show status
  const handlePlay = () => {
    setIsPlaying(true);
    showStatus("▶");
  };

  // Update handlePause to show status
  const handlePause = () => {
    setIsPlaying(false);
    showStatus("❙ ❙");
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
    registerActivity();
    switch (area) {
      case "top":
        // Top always acts as menu button
        handleMenuButton();
        break;
      case "right":
        nextTrack();
        break;
      case "bottom":
        // Bottom always toggles play/pause regardless of menu mode
        togglePlay();
        break;
      case "left":
        previousTrack();
        break;
      case "center":
        if (menuMode) {
          // Execute the selected menu item's action
          const currentMenu = menuHistory[menuHistory.length - 1];
          if (currentMenu && currentMenu.items[selectedMenuItem]) {
            currentMenu.items[selectedMenuItem].action();
          }
        } else {
          // Only toggle video when not in menu mode and playback is active
          if (isPlaying) {
            toggleVideo();
          }
        }
        break;
    }
  };

  const handleWheelRotation = (direction: "clockwise" | "counterclockwise") => {
    playScrollSound();
    registerActivity();
    if (menuMode) {
      const currentMenu = menuHistory[menuHistory.length - 1];
      const menuLength = currentMenu.items.length;

      if (direction === "clockwise") {
        const newIndex = Math.min(menuLength - 1, selectedMenuItem + 1);
        setSelectedMenuItem(newIndex);

        // Update selected index in menu history
        setMenuHistory((prev) => [
          ...prev.slice(0, -1),
          { ...currentMenu, selectedIndex: newIndex },
        ]);
      } else {
        const newIndex = Math.max(0, selectedMenuItem - 1);
        setSelectedMenuItem(newIndex);

        // Update selected index in menu history
        setMenuHistory((prev) => [
          ...prev.slice(0, -1),
          { ...currentMenu, selectedIndex: newIndex },
        ]);
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
    registerActivity();

    // Turn off video when navigating menus
    if (showVideo) {
      setShowVideo(false);
    }

    if (menuMode) {
      // If we're in a submenu, go back to previous menu
      if (menuHistory.length > 1) {
        setMenuDirection("backward");
        setMenuHistory((prev) => prev.slice(0, -1));
        const previousMenu = menuHistory[menuHistory.length - 2];
        if (previousMenu) {
          setSelectedMenuItem(previousMenu.selectedIndex);
        }
      } else {
        // If we're in the main/root menu, do nothing
        // Just play a sound to give feedback
        playClickSound();
      }
    } else {
      // Enter menu mode
      setMenuDirection("backward");

      // If we came from the "Now Playing" menu item in the main menu, go to the main menu
      if (cameFromNowPlayingMenuItem) {
        if (menuHistory.length > 1) {
          setMenuHistory([menuHistory[0]]);
        }
        setSelectedMenuItem(menuHistory[0]?.selectedIndex || 0);
        setCameFromNowPlayingMenuItem(false);
      } else {
        // Otherwise, always go to the music menu with current song selected
        const musicMenu = menuHistory.find((menu) => menu.title === "Music");

        if (musicMenu) {
          // Update the Music menu with current selection
          const updatedMusicMenu = {
            ...musicMenu,
            selectedIndex: currentIndex,
          };

          // Keep only the main menu and add updated music menu
          setMenuHistory([menuHistory[0], updatedMusicMenu]);
          setSelectedMenuItem(currentIndex);
        } else {
          // If for some reason we can't find Music menu, create it
          const musicSubmenu = tracks.map((track, index) => ({
            label: track.title,
            action: () => {
              setCurrentIndex(index);
              setIsPlaying(true);
              setMenuDirection("forward");
              setMenuMode(false);
              setCameFromNowPlayingMenuItem(false);
              // Turn off video when selecting a track from menu
              if (showVideo) {
                setShowVideo(false);
              }
            },
          }));

          setMenuHistory([
            menuHistory[0],
            {
              title: "Music",
              items: musicSubmenu,
              selectedIndex: currentIndex,
            },
          ]);
          setSelectedMenuItem(currentIndex);
        }
      }

      setMenuMode(true);
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
    registerActivity();
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
        onToggleBacklight={toggleBacklight}
        onToggleVideo={toggleVideo}
        isLoopAll={loopAll}
        isLoopCurrent={loopCurrent}
        isPlaying={isPlaying}
        isShuffled={isShuffled}
        isBacklightOn={backlightOn}
        isVideoOn={showVideo}
      />

      <WindowFrame
        title="iPod"
        onClose={onClose}
        isForeground={isForeground}
        appId="ipod"
        transparentBackground
      >
        <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-b from-gray-100/20 to-gray-300/20 backdrop-blur-lg p-4">
          {/* iPod device */}
          <div className="w-[250px] h-[400px] bg-white rounded-2xl shadow-xl border border-black/40 flex flex-col items-center p-4 pb-8">
            {/* Screen - Now pass all required props */}
            <IpodScreen
              currentTrack={tracks[currentIndex] || null}
              isPlaying={isPlaying}
              elapsedTime={elapsedTime}
              totalTime={totalTime}
              menuMode={menuMode}
              menuHistory={menuHistory}
              selectedMenuItem={selectedMenuItem}
              onSelectMenuItem={setSelectedMenuItem}
              currentIndex={currentIndex}
              tracksLength={tracks.length}
              backlightOn={backlightOn}
              menuDirection={menuDirection}
              onMenuItemAction={handleMenuItemAction}
              showVideo={showVideo}
              playerRef={playerRef}
              handleTrackEnd={handleTrackEnd}
              handleProgress={handleProgress}
              handleDuration={handleDuration}
              handlePlay={handlePlay}
              handlePause={handlePause}
              handleReady={handleReady}
              loopCurrent={loopCurrent}
              statusMessage={statusMessage}
            />

            {/* Click Wheel */}
            <div className="mt-6 relative w-[180px] h-[180px] rounded-full bg-gray-200 flex items-center justify-center">
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
                  className="absolute top-2 left-1/2 transform -translate-x-1/2 font-chicago text-xs text-white menu-button cursor-default"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMenuButton();
                  }}
                >
                  MENU
                </div>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 font-chicago text-[9px] text-white cursor-default">
                  ▶︎▶︎
                </div>
                <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 font-chicago text-[9px] text-white cursor-default">
                  ▶︎❙❙
                </div>
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 font-chicago text-[9px] text-white cursor-default">
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
            setTracks(
              DEFAULT_VIDEOS.map((video) => ({
                id: video.id,
                url: video.url,
                title: video.title,
                artist: video.artist,
                album: "Shared Playlist",
              }))
            );
            setOriginalOrder(
              DEFAULT_VIDEOS.map((video) => ({
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
            showStatus("LIBRARY RESET");
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
