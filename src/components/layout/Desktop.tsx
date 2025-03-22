import { BaseApp } from "@/apps/base/types";
import { AppManagerState } from "@/apps/base/types";
import { useState, useEffect, useRef } from "react";
import { FileIcon } from "@/apps/finder/components/FileIcon";
import { getAppIconPath } from "@/config/appRegistry";
import { useWallpaper } from "@/hooks/useWallpaper";

interface DesktopStyles {
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundRepeat?: string;
  backgroundPosition?: string;
  transition?: string;
}

interface DesktopProps {
  apps: BaseApp[];
  appStates: AppManagerState;
  toggleApp: (appId: string) => void;
  onClick?: () => void;
  desktopStyles?: DesktopStyles;
  wallpaperPath: string;
}

export function Desktop({
  apps,
  toggleApp,
  onClick,
  desktopStyles,
  wallpaperPath,
}: DesktopProps) {
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const { isVideoWallpaper, isVideoLoading, markVideoLoaded, checkVideoLoadState } = useWallpaper();
  const [currentWallpaper, setCurrentWallpaper] = useState(wallpaperPath);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Listen for wallpaper changes
  useEffect(() => {
    const handleWallpaperChange = (e: CustomEvent<string>) => {
      setCurrentWallpaper(e.detail);
    };

    window.addEventListener(
      "wallpaperChange",
      handleWallpaperChange as EventListener
    );
    return () =>
      window.removeEventListener(
        "wallpaperChange",
        handleWallpaperChange as EventListener
      );
  }, []);

  // Update currentWallpaper when prop changes
  useEffect(() => {
    setCurrentWallpaper(wallpaperPath);
  }, [wallpaperPath]);

  // Check for cached video on ref update and wallpaper change
  useEffect(() => {
    if (isVideoWallpaper && videoRef.current) {
      // Try to check if the video is already loaded/cached
      checkVideoLoadState(videoRef.current, currentWallpaper);
    }
  }, [isVideoWallpaper, videoRef, currentWallpaper, checkVideoLoadState]);

  const getWallpaperStyles = (path: string): DesktopStyles => {
    // Don't apply background styles for video wallpapers
    if (path.endsWith(".mp4") || path.includes("video/") || 
        (path.startsWith("https://") && /\.(mp4|webm|ogg)($|\?)/.test(path))) {
      return {};
    }

    const isTiled = path.includes("/wallpapers/tiles/");
    return {
      backgroundImage: `url(${path})`,
      backgroundSize: isTiled ? "64px 64px" : "cover",
      backgroundRepeat: isTiled ? "repeat" : "no-repeat",
      backgroundPosition: "center",
      transition: "background-image 0.3s ease-in-out",
    };
  };

  // Merge wallpaper styles with provided desktop styles
  const finalStyles = {
    ...getWallpaperStyles(currentWallpaper),
    ...desktopStyles,
  };

  const handleIconClick = (
    appId: string,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    event.stopPropagation();
    setSelectedAppId(appId);
  };

  const handleFinderOpen = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    localStorage.setItem("app_finder_initialPath", "/");
    const finderApp = apps.find((app) => app.id === "finder");
    if (finderApp) {
      toggleApp(finderApp.id);
    }
    setSelectedAppId(null);
  };

  const handleVideoLoaded = () => {
    markVideoLoaded(currentWallpaper);
  };

  // Handle video loading events
  const handleCanPlayThrough = () => {
    markVideoLoaded(currentWallpaper);
  };

  return (
    <div
      className="absolute inset-0 min-h-screen h-full z-[-1] desktop-background"
      onClick={onClick}
      style={finalStyles}
    >
      {isVideoWallpaper && (
        <>
          {isVideoLoading && (
            <div className="absolute inset-0 w-full h-full bg-gray-700/30 z-[-5]">
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50" 
                style={{ 
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 2.5s infinite ease-in-out'
                }} 
              />
            </div>
          )}
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover z-[-10]"
            src={currentWallpaper}
            autoPlay
            loop
            muted
            playsInline
            onLoadedData={handleVideoLoaded}
            onCanPlayThrough={handleCanPlayThrough}
            style={{ opacity: isVideoLoading ? 0 : 1, transition: 'opacity 0.5s ease-in-out' }}
          />
        </>
      )}
      <div className="pt-8 p-4 flex flex-col items-end h-[calc(100%-2rem)] relative z-[1]">
        <div className="flex flex-col flex-wrap-reverse justify-start gap-1 content-start h-full">
          <FileIcon
            name="Macintosh HD"
            isDirectory={true}
            icon="/icons/disk.png"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedAppId("macintosh-hd");
            }}
            onDoubleClick={handleFinderOpen}
            isSelected={selectedAppId === "macintosh-hd"}
            size="large"
          />
          {apps
            .filter((app) => app.id !== "finder" && app.id !== "control-panels")
            .map((app) => (
              <FileIcon
                key={app.id}
                name={app.name}
                isDirectory={false}
                icon={getAppIconPath(app.id)}
                onClick={(e) => handleIconClick(app.id, e)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  toggleApp(app.id);
                  setSelectedAppId(null);
                }}
                isSelected={selectedAppId === app.id}
                size="large"
              />
            ))}
        </div>
      </div>
    </div>
  );
}
