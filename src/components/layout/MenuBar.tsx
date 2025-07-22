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
import { useAppStoreShallow } from "@/stores/helpers";
import { Slider } from "@/components/ui/slider";
import { Volume1, Volume2, VolumeX, Settings } from "lucide-react";
import { useSound, Sounds } from "@/hooks/useSound";
import { useThemeStore } from "@/stores/useThemeStore";

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

  // Format the display based on viewport width
  let displayTime;

  if (viewportWidth < 420) {
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

  return <div className="ml-auto mr-2">{displayTime}</div>;
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
          className={`h-6 w-6 text-md px-1 py-1 border-none focus-visible:ring-0 ${
            isXpTheme 
              ? "hover:bg-white/20 active:bg-white/30" 
              : "hover:bg-black/10 active:bg-black/20"
          } mr-2`}
          style={{ color: "inherit" }}
        >
          {getVolumeIcon()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        side={isXpTheme ? "top" : "bottom"}
        sideOffset={isXpTheme ? 8 : 1}
        className="p-2 pt-4 w-auto min-w-4 h-40 flex flex-col items-center justify-center"
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

function StartMenu() {
  const launchApp = useLaunchApp();
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const currentTheme = useThemeStore((state) => state.current);

  const startMenuApps = [
    { id: "finder", name: "File Manager", icon: "/icons/mac.png" },
    { id: "textedit", name: "Text Editor", icon: "/icons/textedit.png" },
    { id: "paint", name: "Paint", icon: "/icons/paint.png" },
    { id: "terminal", name: "Command Prompt", icon: "/icons/terminal.png" },
    { id: "chats", name: "Messenger", icon: "/icons/internet.png" },
    { id: "internet-explorer", name: "Internet Explorer", icon: "/icons/ie.png" },
    { id: "control-panels", name: "Control Panel", icon: "/icons/control-panels/appearance-manager/app.png" },
  ];

  return (
    <DropdownMenu open={isStartMenuOpen} onOpenChange={setIsStartMenuOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 px-3 py-1 h-8 text-white font-bold rounded-sm transition-all duration-75"
          style={{
            background: currentTheme === "xp"
              ? "linear-gradient(to bottom, #3A7BE0, #2E6CE8, #1E4F99)"
              : "linear-gradient(to bottom, #dfdfdf, #c0c0c0, #808080)",
            border: currentTheme === "xp" 
              ? "1px solid #1941A5"
              : "2px outset #c0c0c0",
            color: currentTheme === "xp" ? "#ffffff" : "#000000",
            boxShadow: isStartMenuOpen
              ? (currentTheme === "xp"
                ? "inset -1px -1px 0 rgba(255,255,255,0.3), inset 1px 1px 0 rgba(0,0,0,0.3)"
                : "inset -1px -1px 0 #ffffff, inset 1px 1px 0 #808080")
              : (currentTheme === "xp"
                ? "inset 1px 1px 0 rgba(255,255,255,0.3), inset -1px -1px 0 rgba(0,0,0,0.3)"
                : "inset 1px 1px 0 #ffffff, inset -1px -1px 0 #808080"),
          }}
        >
          <img 
            src="/icons/apple.png" 
            alt="Start" 
            className="w-6 h-6 [image-rendering:pixelated]"
          />
          <span style={{ textShadow: currentTheme === "xp" ? "1px 1px 1px rgba(0,0,0,0.5)" : "none" }}>
            {currentTheme === "xp" ? "start" : "Start"}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="top"
        sideOffset={8}
        className="w-64 max-h-96 overflow-y-auto"
        style={{
          background: currentTheme === "xp"
            ? "linear-gradient(to right, #245EDC 50px, #ffffff 50px)"
            : "linear-gradient(to bottom, #dfdfdf, #c0c0c0)",
          border: currentTheme === "xp" ? "1px solid #1941A5" : "2px outset #c0c0c0",
        }}
      >
        <div className="p-2">
          {/* Programs Section */}
          <div className="mb-2">
            <div className="text-xs font-bold mb-2 px-2"
              style={{ color: currentTheme === "xp" ? "#003D82" : "#000000" }}
            >
              Programs
            </div>
            {startMenuApps.map((app) => (
              <DropdownMenuItem
                key={app.id}
                onClick={() => {
                  launchApp(app.id as "finder" | "textedit" | "paint" | "terminal" | "chats" | "internet-explorer" | "control-panels");
                  setIsStartMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-blue-100 rounded"
                style={{
                  color: currentTheme === "xp" ? "#000000" : "#000000",
                }}
              >
                <img
                  src={app.icon}
                  alt=""
                  className="w-6 h-6 [image-rendering:pixelated]"
                />
                {app.name}
              </DropdownMenuItem>
            ))}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MenuBar({ children, inWindowFrame = false }: MenuBarProps) {
  const { apps } = useAppContext();
  const { getForegroundInstance } = useAppStoreShallow((s) => ({
    getForegroundInstance: s.getForegroundInstance,
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
        className="fixed bottom-0 left-0 right-0 flex items-center h-10 px-1 border-t-2 z-50"
        style={{
          background: currentTheme === "xp" 
            ? "linear-gradient(to bottom, #245EDC, #1941A5)"
            : "linear-gradient(to bottom, #c0c0c0, #808080)",
          borderTopColor: currentTheme === "xp" ? "#4A90E2" : "#dfdfdf",
          fontFamily: "var(--font-ms-sans)",
          fontSize: "11px",
          color: currentTheme === "xp" ? "#ffffff" : "#000000",
        }}
      >
        {/* Start Button */}
        <div className="flex items-center mr-2">
          <StartMenu />
        </div>

        {/* Running Apps Area */}
        <div className="flex-1 flex items-center gap-1 px-2">
          {/* Show active apps as taskbar buttons */}
          {hasActiveApp && foregroundInstance && (
            <button
              className="px-3 py-1 h-7 text-left min-w-32 max-w-48 truncate rounded-sm"
              style={{
                background: currentTheme === "xp"
                  ? "linear-gradient(to bottom, #E8F0FE, #C7D9F7, #9ABEF5)"
                  : "linear-gradient(to bottom, #c0c0c0, #a0a0a0)",
                border: currentTheme === "xp"
                  ? "1px solid #7BA7E7"
                  : "2px inset #c0c0c0",
                color: currentTheme === "xp" ? "#003D82" : "#000000",
                boxShadow: currentTheme === "xp"
                  ? "inset -1px -1px 0 rgba(0,0,0,0.1), inset 1px 1px 0 rgba(255,255,255,0.8)"
                  : "inset -1px -1px 0 #808080, inset 1px 1px 0 #ffffff",
              }}
            >
              {foregroundInstance.title || "App"}
            </button>
          )}
        </div>

        {/* System Tray */}
        <div className="flex items-center gap-1 px-2 h-8 mr-1"
          style={{
            background: currentTheme === "xp"
              ? "linear-gradient(to bottom, rgba(255,255,255,0.1), rgba(255,255,255,0.05))"
              : "linear-gradient(to bottom, #dfdfdf, #c0c0c0)",
            border: currentTheme === "xp"
              ? "1px solid rgba(255,255,255,0.2)"
              : "1px inset #c0c0c0",
            borderRadius: "2px",
          }}
        >
          <div className="hidden sm:flex">
            <VolumeControl />
          </div>
          <div className="text-xs font-bold px-2"
            style={{ 
              color: currentTheme === "xp" ? "#ffffff" : "#000000",
              textShadow: currentTheme === "xp" ? "1px 1px 1px rgba(0,0,0,0.5)" : "none"
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
        background: "var(--os-color-menubar-bg)",
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
