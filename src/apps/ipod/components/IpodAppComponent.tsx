import { useState, useRef, useEffect } from "react";
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
  DEFAULT_VIDEOS,
  Track,
} from "@/utils/storage";
import { useSound, Sounds } from "@/hooks/useSound";
import { useVibration } from "@/hooks/useVibration";
import { IpodScreen } from "./IpodScreen";
import { IpodWheel } from "./IpodWheel";

// Add function to handle backlight state
const loadIpodBacklight = (): boolean => {
  const saved = localStorage.getItem("ipod:backlight");
  return saved === null ? true : saved === "true";
};

const saveIpodBacklight = (value: boolean) => {
  localStorage.setItem("ipod:backlight", value.toString());
};

// Add function to handle theme state after backlight functions
const loadIpodTheme = (): string => {
  const saved = localStorage.getItem("ipod:theme");
  return saved || "classic";
};

const saveIpodTheme = (value: string) => {
  localStorage.setItem("ipod:theme", value);
};

// Add function to handle LCD filter state
const loadIpodLcdFilter = (): boolean => {
  const saved = localStorage.getItem("ipod:lcdFilter");
  return saved === null ? true : saved === "true";
};

const saveIpodLcdFilter = (value: boolean) => {
  localStorage.setItem("ipod:lcdFilter", value.toString());
};

export function IpodAppComponent({
  isWindowOpen,
  onClose,
  isForeground,
}: AppProps) {
  const { play: playClickSound } = useSound(Sounds.BUTTON_CLICK);
  const { play: playScrollSound } = useSound(Sounds.MENU_OPEN);
  const vibrate = useVibration(100, 50);

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
  // Add theme state
  const [theme, setTheme] = useState(loadIpodTheme());
  // Add LCD filter state
  const [lcdFilterOn, setLcdFilterOn] = useState(loadIpodLcdFilter());
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
  const [isAddingTrack, setIsAddingTrack] = useState(false);

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

  // Add a ref to track if we're coming from a skip operation
  const skipOperationRef = useRef(false);

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
            {
              label: "Theme",
              action: () => {
                changeTheme(theme === "classic" ? "black" : "classic");
              },
              showChevron: false,
              value: theme === "classic" ? "Classic" : "Black",
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
          {
            label: "Theme",
            action: () => {
              changeTheme(theme === "classic" ? "black" : "classic");
            },
            showChevron: false,
            value: theme === "classic" ? "Classic" : "Black",
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
  }, [isPlaying, loopCurrent, loopAll, isShuffled, backlightOn, tracks, theme]);

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
    setIsAddingTrack(true);
    try {
      const videoId = extractVideoId(url);
      if (!videoId) {
        throw new Error("Invalid YouTube URL");
      }

      // 1. Fetch initial info from oEmbed
      const oembedResponse = await fetch(
        `https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${videoId}&format=json`
      );
      if (!oembedResponse.ok) {
        throw new Error("Failed to fetch oEmbed info");
      }
      const oembedData = await oembedResponse.json();
      const rawTitle = oembedData.title as string;

      const trackInfo: Partial<Track> = {
        title: rawTitle, // Default to raw title
        artist: undefined,
        album: undefined,
      };

      try {
        // 2. Call our new API to parse the title using AI
        const parseResponse = await fetch("/api/parse-title", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: rawTitle }),
        });

        if (parseResponse.ok) {
          const parsedData = await parseResponse.json();
          trackInfo.title = parsedData.title || rawTitle;
          trackInfo.artist = parsedData.artist;
          trackInfo.album = parsedData.album;
        } else {
          console.warn(
            "Failed to parse title with AI, using raw title:",
            await parseResponse.text()
          );
        }
      } catch (parseError) {
        console.warn(
          "Error calling parse-title API, using raw title:",
          parseError
        );
      }

      const newTrack: Track = {
        id: videoId,
        url,
        title: trackInfo.title!,
        artist: trackInfo.artist,
        album: trackInfo.album,
      };

      setTracks((prev) => {
        const newTracks = [...prev, newTrack];
        // Update original order immediately if not shuffled
        if (!isShuffled) {
          setOriginalOrder(newTracks);
        }
        // Set current index and start playing the new track
        setCurrentIndex(newTracks.length - 1);
        setIsPlaying(true);
        return newTracks;
      });

      setUrlInput("");
      setIsAddDialogOpen(false);
      showStatus("♬ Added"); // Update status message
    } catch (error) {
      console.error("Failed to add track:", error);
      showStatus(`❌ Error adding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAddingTrack(false);
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
        // Turn off backlight after 5 seconds of inactivity,
        // but only if video is not visible
        if (
          Date.now() - lastActivityTime >= 5000 &&
          !(showVideo && isPlaying)
        ) {
          setBacklightOn(false);
        }
      }, 5000);
    }

    return () => {
      if (backlightTimerRef.current) {
        clearTimeout(backlightTimerRef.current);
      }
    };
  }, [backlightOn, lastActivityTime, showVideo, isPlaying]);

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
    registerActivity();
    skipOperationRef.current = true;
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
    registerActivity();
    skipOperationRef.current = true;
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
    registerActivity();
    showStatus(isPlaying ? "⏸" : "▶");
  };

  const toggleVideo = () => {
    // Only allow showing video if playing
    // But always allow hiding video regardless of play state
    if (!showVideo && !isPlaying) {
      // Do nothing - prevent showing video when paused
      return;
    }

    setShowVideo(!showVideo);
    registerActivity();
  };

  const toggleShuffle = () => {
    setIsShuffled(!isShuffled);
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

  // Update handlePlay to show status only if not coming from skip
  const handlePlay = () => {
    setIsPlaying(true);
    if (!skipOperationRef.current) {
      showStatus("▶");
    }
    skipOperationRef.current = false;
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
    vibrate();
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
          // In Now Playing view
          if (tracks[currentIndex]) {
            if (!isPlaying) {
              // If music is paused, play it
              togglePlay();
            } else {
              // If music is playing, toggle video
              toggleVideo();
            }
          }
        }
        break;
    }
  };

  const handleWheelRotation = (direction: "clockwise" | "counterclockwise") => {
    playScrollSound();
    vibrate();
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
    vibrate();
    registerActivity();

    // Turn off video when navigating menus
    if (showVideo) {
      setShowVideo(false);
      // go up to this fi
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

  // Save backlight state to storage
  useEffect(() => {
    saveIpodBacklight(backlightOn);
  }, [backlightOn]);

  const toggleBacklight = () => {
    setBacklightOn(!backlightOn);
    registerActivity();
  };

  // Save theme state to storage
  useEffect(() => {
    saveIpodTheme(theme);
  }, [theme]);

  const changeTheme = (newTheme: string) => {
    setTheme(newTheme);
    registerActivity();
  };

  // Save LCD filter state to storage
  useEffect(() => {
    saveIpodLcdFilter(lcdFilterOn);
  }, [lcdFilterOn]);

  const toggleLcdFilter = () => {
    setLcdFilterOn(!lcdFilterOn);
    registerActivity();
    showStatus(!lcdFilterOn ? "LCD ON" : "LCD OFF");
  };

  // Add container ref and scale state
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Add resize observer effect
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;

      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;

      // Base iPod size (from the styles in the render function)
      const baseWidth = 250;
      const baseHeight = 400;

      // Calculate available space (with some padding)
      const availableWidth = containerWidth - 50; // 20px padding on each side
      const availableHeight = containerHeight - 50; // 20px padding on each side

      // Calculate scale factors for width and height
      const widthScale = availableWidth / baseWidth;
      const heightScale = availableHeight / baseHeight;

      // Use the smaller scale to ensure iPod fits within container
      const newScale = Math.min(widthScale, heightScale, 1.5); // Cap at 1.5x

      setScale(Math.max(1, newScale)); // Ensure minimum scale of 1
    };

    // Initial sizing
    handleResize();

    // Setup resize observer
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Cleanup
    return () => {
      resizeObserver.disconnect();
    };
  }, [isWindowOpen]);

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
        onToggleLcdFilter={toggleLcdFilter}
        onChangeTheme={changeTheme}
        isLoopAll={loopAll}
        isLoopCurrent={loopCurrent}
        isPlaying={isPlaying}
        isShuffled={isShuffled}
        isBacklightOn={backlightOn}
        isVideoOn={showVideo}
        isLcdFilterOn={lcdFilterOn}
        currentTheme={theme}
      />

      <WindowFrame
        title="iPod"
        onClose={onClose}
        isForeground={isForeground}
        appId="ipod"
        transparentBackground
      >
        <div
          ref={containerRef}
          className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-b from-gray-100/20 to-gray-300/20 backdrop-blur-lg p-4 select-none"
        >
          {/* iPod device - add transform scale based on container size */}
          <div
            className={cn(
              "w-[250px] h-[400px] rounded-2xl shadow-xl border border-black/40 flex flex-col items-center p-4 pb-8",
              theme === "classic" ? "bg-white/85" : "bg-black/85"
            )}
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "center",
              transition: "transform 0.2s ease",
            }}
          >
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
              onToggleVideo={toggleVideo}
              lcdFilterOn={lcdFilterOn}
            />

            {/* Click Wheel - Replace with IpodWheel component */}
            <IpodWheel
              theme={theme}
              onWheelClick={handleWheelClick}
              onWheelRotation={handleWheelRotation}
              onMenuButton={handleMenuButton}
            />
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
          description="Enter a YouTube link to add to your iPod"
          value={urlInput}
          onChange={setUrlInput}
          isLoading={isAddingTrack}
        />
      </WindowFrame>
    </>
  );
}
