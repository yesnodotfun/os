import { useState, useEffect } from "react";
import { AppleMenu } from "./AppleMenu";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { useLaunchApp } from "@/hooks/useLaunchApp";
import { StartMenu } from "./StartMenu";
import { useAppStoreShallow } from "@/stores/helpers";
import { Slider } from "@/components/ui/slider";
import { Volume1, Volume2, VolumeX, Settings } from "lucide-react";
import { useSound, Sounds } from "@/hooks/useSound";
import { useThemeStore } from "@/stores/useThemeStore";
import { getAppIconPath, appRegistry } from "@/config/appRegistry";

// Helper function to get app name
const getAppName = (appId: string): string => {
  const app = appRegistry[appId as keyof typeof appRegistry];
  return app?.name || appId;
};

const finderHelpItems = [
  {
    icon: "🔍",
    title: "Browse Files",
    description: "Navigate through your files and folders",
  },
  {
    icon: "📁",
    title: "Create Folders",
    description: "Organize your files with new folders",
  },
  {
    icon: "🗑️",
    title: "Delete Files",
    description: "Remove unwanted files and folders",
  },
];

const finderMetadata = {
  name: "Finder",
  version: "1.0.0",
  creator: {
    name: "Ryo",
    url: "https://github.com/ryokun6",
  },
  github: "https://github.com/ryokun6/ryos",
  icon: "/icons/mac.png",
};

interface MenuBarProps {
  children?: React.ReactNode;
  inWindowFrame?: boolean; // Add prop to indicate if MenuBar is inside a window
}

function Clock() {
  const [time, setTime] = useState(new Date());
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const currentTheme = useThemeStore((state) => state.current);
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    // Initial check
    handleResize();

    // Add resize event listener
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Format the display based on theme and viewport width
  let displayTime;

  if (isXpTheme) {
    // For XP/98 themes: time with AM/PM (e.g., "1:34 AM")
    displayTime = time.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } else if (viewportWidth < 420) {
    // For small screens: just time without AM/PM (e.g., "1:34")
    const timeString = time.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    displayTime = timeString.replace(/\s?(AM|PM)$/i, "");
  } else if (viewportWidth >= 420 && viewportWidth <= 768) {
    // For medium screens: time with AM/PM (e.g., "1:00 AM")
    displayTime = time.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } else {
    // For larger screens (> 768px): full date and time (e.g., "Wed May 7 1:34 AM")
    const shortWeekday = time.toLocaleDateString([], { weekday: "short" });
    const month = time.toLocaleDateString([], { month: "short" });
    const day = time.getDate();
    const timeString = time.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    displayTime = `${shortWeekday} ${month} ${day} ${timeString}`;
  }

  return (
    <div
      className={isXpTheme ? "" : "ml-auto mr-2"}
      style={{
        textShadow:
          currentTheme === "macosx"
            ? "0 2px 3px rgba(0, 0, 0, 0.25)"
            : undefined,
      }}
    >
      {displayTime}
    </div>
  );
}

function DefaultMenuItems() {
  const launchApp = useLaunchApp();
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);

  const handleLaunchFinder = (path: string) => {
    launchApp("finder", { initialPath: path });
  };

  return (
    <>
      {/* File Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="default"
            className="h-6 text-md px-2 py-1 border-none hover:bg-black/10 active:bg-black/20 focus-visible:ring-0"
            style={{ color: "inherit" }}
          >
            File
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={1} className="px-0">
          <DropdownMenuItem
            onClick={() => handleLaunchFinder("/")}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            New Finder Window
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            New Folder
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuItem
            disabled
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Move to Trash
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Empty Trash...
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuItem className="text-md h-6 px-3 active:bg-gray-900 active:text-white">
            Close
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="default"
            className="h-6 text-md px-2 py-1 border-none hover:bg-black/10 active:bg-black/20 focus-visible:ring-0"
            style={{ color: "inherit" }}
          >
            Edit
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={1} className="px-0">
          <DropdownMenuItem
            disabled
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Undo
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuItem
            disabled
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Cut
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Copy
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Paste
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Clear
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuItem
            disabled
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Select All
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* View Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="default"
            className="h-6 text-md px-2 py-1 border-none hover:bg-black/10 active:bg-black/20 focus-visible:ring-0"
            style={{ color: "inherit" }}
          >
            View
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={1} className="px-0">
          <DropdownMenuCheckboxItem
            checked={false}
            className="text-md h-6 px-3 pl-8 active:bg-gray-900 active:text-white flex justify-between items-center"
          >
            <span>by Small Icon</span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={true}
            className="text-md h-6 px-3 pl-8 active:bg-gray-900 active:text-white flex justify-between items-center"
          >
            <span>by Icon</span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={false}
            className="text-md h-6 px-3 pl-8 active:bg-gray-900 active:text-white flex justify-between items-center"
          >
            <span>by List</span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuCheckboxItem
            checked={true}
            className="text-md h-6 px-3 pl-8 active:bg-gray-900 active:text-white flex justify-between items-center"
          >
            <span>by Name</span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={false}
            className="text-md h-6 px-3 pl-8 active:bg-gray-900 active:text-white flex justify-between items-center"
          >
            <span>by Date</span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={false}
            className="text-md h-6 px-3 pl-8 active:bg-gray-900 active:text-white flex justify-between items-center"
          >
            <span>by Size</span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={false}
            className="text-md h-6 px-3 pl-8 active:bg-gray-900 active:text-white flex justify-between items-center"
          >
            <span>by Kind</span>
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Go Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="default"
            className="h-6 text-md px-2 py-1 border-none hover:bg-black/10 active:bg-black/20 focus-visible:ring-0"
            style={{ color: "inherit" }}
          >
            Go
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={1} className="px-0">
          <DropdownMenuItem
            disabled
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Forward
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuItem
            onClick={() => handleLaunchFinder("/Applications")}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white flex items-center gap-2"
          >
            <img
              src="/icons/applications.png"
              alt=""
              className="w-4 h-4 [image-rendering:pixelated]"
            />
            Applications
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleLaunchFinder("/Documents")}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white flex items-center gap-2"
          >
            <img
              src="/icons/documents.png"
              alt=""
              className="w-4 h-4 [image-rendering:pixelated]"
            />
            Documents
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleLaunchFinder("/Images")}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white flex items-center gap-2"
          >
            <img
              src="/icons/images.png"
              alt=""
              className="w-4 h-4 [image-rendering:pixelated]"
            />
            Images
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleLaunchFinder("/Music")}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white flex items-center gap-2"
          >
            <img
              src="/icons/sounds.png"
              alt=""
              className="w-4 h-4 [image-rendering:pixelated]"
            />
            Music
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleLaunchFinder("/Sites")}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white flex items-center gap-2"
          >
            <img
              src="/icons/sites.png"
              alt=""
              className="w-4 h-4 [image-rendering:pixelated]"
            />
            Sites
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleLaunchFinder("/Videos")}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white flex items-center gap-2"
          >
            <img
              src="/icons/movies.png"
              alt=""
              className="w-4 h-4 [image-rendering:pixelated]"
            />
            Videos
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleLaunchFinder("/Trash")}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white flex items-center gap-2"
          >
            <img
              src="/icons/trash-empty.png"
              alt=""
              className="w-4 h-4 [image-rendering:pixelated]"
            />
            Trash
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Help Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="default"
            className="h-6 text-md px-2 py-1 border-none hover:bg-black/10 active:bg-black/20 focus-visible:ring-0"
            style={{ color: "inherit" }}
          >
            Help
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={1} className="px-0">
          <DropdownMenuItem
            onClick={() => setIsHelpDialogOpen(true)}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Finder Help
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuItem
            onClick={() => setIsAboutDialogOpen(true)}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            About Finder
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <HelpDialog
        isOpen={isHelpDialogOpen}
        onOpenChange={setIsHelpDialogOpen}
        appName="Finder"
        helpItems={finderHelpItems}
      />
      <AboutDialog
        isOpen={isAboutDialogOpen}
        onOpenChange={setIsAboutDialogOpen}
        metadata={finderMetadata}
      />
    </>
  );
}

function VolumeControl() {
  const { masterVolume, setMasterVolume } = useAppStoreShallow((s) => ({
    masterVolume: s.masterVolume,
    setMasterVolume: s.setMasterVolume,
  }));
  const { play: playVolumeChangeSound } = useSound(Sounds.VOLUME_CHANGE);
  const launchApp = useLaunchApp();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const currentTheme = useThemeStore((state) => state.current);
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";

  const getVolumeIcon = () => {
    if (masterVolume === 0) {
      return <VolumeX className="h-5 w-5" />;
    }
    if (masterVolume < 0.5) {
      return <Volume1 className="h-5 w-5" />;
    }
    return <Volume2 className="h-5 w-5" />;
  };

  return (
    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-6 w-7 text-md px-1 py-1 border-none focus-visible:ring-0 ${
            isXpTheme
              ? "hover:bg-white/20 active:bg-white/30"
              : "hover:bg-black/10 active:bg-black/20"
          } ${isXpTheme ? "" : "mr-2"}`}
          style={{
            color:
              isXpTheme && currentTheme === "win98" ? "#000000" : "inherit",
          }}
        >
          {getVolumeIcon()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        side={isXpTheme ? "top" : "bottom"}
        sideOffset={isXpTheme ? 8 : 1}
        className="p-2 pt-4 w-auto min-w-4 h-40 flex flex-col items-center justify-center"
        style={{ minWidth: "auto" }}
      >
        <Slider
          orientation="vertical"
          min={0}
          max={1}
          step={0.05}
          value={[masterVolume]}
          onValueChange={(v) => setMasterVolume(v[0])}
          onValueCommit={playVolumeChangeSound}
        />
        <Button
          variant="ghost"
          size="icon"
          className="mt-2 h-6 w-6 text-md border-none hover:bg-gray-200 active:bg-gray-900 active:text-white focus-visible:ring-0"
          onClick={() => {
            launchApp("control-panels", {
              initialData: { defaultTab: "sound" },
            });
            setIsDropdownOpen(false);
          }}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MenuBar({ children, inWindowFrame = false }: MenuBarProps) {
  const { apps } = useAppContext();
  const {
    getForegroundInstance,
    instances,

    bringInstanceToForeground,
    foregroundInstanceId, // Add this to get the foreground instance ID
  } = useAppStoreShallow((s) => ({
    getForegroundInstance: s.getForegroundInstance,
    instances: s.instances,

    bringInstanceToForeground: s.bringInstanceToForeground,
    foregroundInstanceId: s.foregroundInstanceId, // Add this
  }));

  const foregroundInstance = getForegroundInstance();
  const hasActiveApp = !!foregroundInstance;

  // Get current theme
  const currentTheme = useThemeStore((state) => state.current);
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";

  // If inside window frame for XP/98, use plain style
  if (inWindowFrame && isXpTheme) {
    return (
      <div
        className="flex items-center h-7 px-1"
        style={{
          fontFamily: isXpTheme ? "var(--font-ms-sans)" : "var(--os-font-ui)",
          fontSize: "11px",
        }}
      >
        {children}
      </div>
    );
  }

  // For XP/98 themes, render taskbar at bottom instead of top menubar
  if (isXpTheme && !inWindowFrame) {
    return (
      <div
        className="fixed bottom-0 left-0 right-0 flex items-center h-[30px] px-0 z-50"
        style={{
          background:
            currentTheme === "xp"
              ? "linear-gradient(0deg, #042b8e 0%, #0551f6 6%, #0453ff 51%, #0551f6 63%, #0551f6 81%, #3a8be8 90%, #0453ff 100%)"
              : "#c0c0c0", // Flat gray for Windows 98
          fontFamily: "var(--font-ms-sans)",
          fontSize: "11px",
          color: currentTheme === "xp" ? "#ffffff" : "#000000",
          userSelect: "none",
          width: "100vw",
        }}
      >
        {/* Start Button */}
        <div className="flex items-center h-full">
          <StartMenu apps={apps} />
        </div>

        {/* Running Apps Area */}
        <div className="flex-1 flex items-center gap-1 px-2 overflow-x-auto h-full">
          {/* Show all active instances as taskbar buttons */}
          {(() => {
            const taskbarIds = Object.values(instances)
              .filter((i) => i.isOpen)
              .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
              .map((i) => i.instanceId);
            if (taskbarIds.length === 0) return null;
            return taskbarIds.map((instanceId) => {
              const instance = instances[instanceId];
              if (!instance || !instance.isOpen) return null;

              const isForeground = instanceId === foregroundInstanceId;
              const appIconPath = getAppIconPath(instance.appId);

              return (
                <button
                  key={instanceId}
                  className="px-2 gap-1 border-t border-y rounded-sm flex items-center justify-start"
                  onClick={() => bringInstanceToForeground(instanceId)}
                  style={{
                    height: "85%",
                    width: "160px",
                    marginTop: "2px",
                    marginRight: "4px",
                    background: isForeground
                      ? currentTheme === "xp"
                        ? "#3980f4" // Active should be lighter blue
                        : "#c0c0c0" // Flat gray for Windows 98
                      : currentTheme === "xp"
                      ? "#1658dd" // Inactive should be darker blue
                      : "#c0c0c0",
                    border:
                      currentTheme === "xp"
                        ? isForeground
                          ? "1px solid #255be1" // Active border
                          : "1px solid #255be1" // Inactive border - same as active
                        : "none", // Windows 98 uses box-shadow instead of border
                    color: currentTheme === "xp" ? "#ffffff" : "#000000",
                    fontSize: "11px",
                    boxShadow:
                      currentTheme === "xp"
                        ? "2px 2px 5px rgba(255, 255, 255, 0.267) inset"
                        : isForeground
                        ? "inset -1px -1px #fff, inset 1px 1px #0a0a0a, inset -2px -2px #dfdfdf, inset 2px 2px grey" // Windows 98 active - inset
                        : "inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px grey, inset 2px 2px #dfdfdf", // Windows 98 inactive - raised
                    transition: "all 0.1s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (currentTheme === "xp" && !isForeground) {
                      e.currentTarget.style.background = "#1b50b8";
                      e.currentTarget.style.borderColor = "#082875";
                    } else if (currentTheme === "win98" && !isForeground) {
                      // Windows 98 hover - keep raised style, don't depress
                      e.currentTarget.style.boxShadow =
                        "inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px grey, inset 2px 2px #dfdfdf";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentTheme === "xp" && !isForeground) {
                      e.currentTarget.style.background = "#1658dd";
                      e.currentTarget.style.borderColor = "#255be1";
                    } else if (currentTheme === "win98" && !isForeground) {
                      // Windows 98 return to normal raised state
                      e.currentTarget.style.boxShadow =
                        "inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px grey, inset 2px 2px #dfdfdf";
                    }
                  }}
                >
                  <img
                    src={appIconPath}
                    alt=""
                    className="w-4 h-4 flex-shrink-0"
                    style={{ imageRendering: "pixelated" }}
                  />
                  <span className="truncate text-xs">
                    {instance.title || getAppName(instance.appId)}
                  </span>
                </button>
              );
            });
          })()}
        </div>

        {/* System Tray */}
        <div
          className="flex items-center gap-1 px-2 text-white border box-border flex items-center justify-end text-sm"
          style={{
            height: currentTheme === "win98" ? "85%" : "100%",
            marginTop: currentTheme === "win98" ? "2px" : "0px",
            marginRight: currentTheme === "win98" ? "4px" : "0px",
            background:
              currentTheme === "xp"
                ? "linear-gradient(0deg, #0a5bc6 0%, #1198e9 6%, #1198e9 51%, #1198e9 63%, #1198e9 77%, #19b9f3 85%, #19b9f3 93%, #075dca 97%)"
                : "#c0c0c0", // Flat gray for Windows 98
            boxShadow:
              currentTheme === "xp"
                ? "2px -0px 3px #20e2fc inset"
                : "inset -1px -1px #fff, inset 1px 1px #0a0a0a, inset -2px -2px #dfdfdf, inset 2px 2px grey", // Windows 98 inset
            borderTop:
              currentTheme === "xp" ? "1px solid #075dca" : "transparent",
            borderBottom:
              currentTheme === "xp" ? "1px solid #0a5bc6" : "transparent",
            borderRight: currentTheme === "xp" ? "transparent" : "transparent",
            borderLeft:
              currentTheme === "xp" ? "1px solid #000000" : "transparent",
            paddingTop: currentTheme === "xp" ? "1px" : "0px",
          }}
        >
          <div className="hidden sm:flex">
            <VolumeControl />
          </div>
          <div
            className={`text-xs ${isXpTheme ? "font-bold" : "font-normal"} ${
              isXpTheme ? "" : "px-2"
            }`}
            style={{
              color:
                currentTheme === "win98"
                  ? "#000000"
                  : isXpTheme
                  ? "#ffffff"
                  : "#000000",
              textShadow:
                currentTheme === "xp"
                  ? "1px 1px 1px rgba(0,0,0,0.5)"
                  : currentTheme === "win98"
                  ? "none"
                  : currentTheme === "macosx"
                  ? "0 2px 3px rgba(0, 0, 0, 0.25)"
                  : "none",
            }}
          >
            <Clock />
          </div>
        </div>
      </div>
    );
  }

  // Default Mac-style top menubar
  return (
    <div
      className="fixed top-0 left-0 right-0 flex border-b-[length:var(--os-metrics-border-width)] border-os-menubar px-2 h-os-menubar items-center font-os-ui"
      style={{
        background:
          currentTheme === "macosx"
            ? "rgba(248, 248, 248, 0.85)"
            : "var(--os-color-menubar-bg)",
        backgroundImage:
          currentTheme === "macosx" ? "var(--os-pinstripe-window)" : undefined,
        backdropFilter: currentTheme === "macosx" ? "blur(20px)" : undefined,
        WebkitBackdropFilter:
          currentTheme === "macosx" ? "blur(20px)" : undefined,
        boxShadow:
          currentTheme === "macosx"
            ? "0 2px 8px rgba(0, 0, 0, 0.15)"
            : undefined,
        fontFamily: "var(--os-font-ui)",
        color: "var(--os-color-menubar-text)",
      }}
    >
      <AppleMenu apps={apps} />
      {hasActiveApp ? children : <DefaultMenuItems />}
      <div className="ml-auto flex items-center">
        <div className="hidden sm:flex">
          <VolumeControl />
        </div>
        <Clock />
      </div>
    </div>
  );
}
