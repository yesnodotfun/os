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
  const {
    currentWallpaper,
    wallpaperSource,
    isVideoWallpaper,
    isVideoLoading,
    markVideoLoaded,
    checkVideoLoadState,
    INDEXEDDB_PREFIX,
    getWallpaperData,
  } = useWallpaper();
  const [displaySource, setDisplaySource] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);

  // Keep displaySource in sync with wallpaperSource and currentWallpaper
  useEffect(() => {
    setDisplaySource(wallpaperSource);
  }, [wallpaperSource, currentWallpaper]);

  // Initialize wallpaperPath from props
  useEffect(() => {
    // Only update if the path actually changed (prevents loops)
    if (wallpaperPath && wallpaperPath !== currentWallpaper) {
      setDisplaySource(wallpaperPath);
    }
  }, [wallpaperPath, currentWallpaper]);

  // Listen for wallpaper changes
  useEffect(() => {
    const handleWallpaperChange = async (e: CustomEvent<string>) => {
      const newWallpaper = e.detail;

      // If it's an IndexedDB reference, load the actual data
      if (newWallpaper.startsWith(INDEXEDDB_PREFIX)) {
        const data = await getWallpaperData(newWallpaper);
        if (data) {
          setDisplaySource(data);
        } else {
          setDisplaySource(newWallpaper);
        }
      } else {
        setDisplaySource(newWallpaper);
      }
    };

    window.addEventListener(
      "wallpaperChange",
      handleWallpaperChange as unknown as EventListener
    );
    return () =>
      window.removeEventListener(
        "wallpaperChange",
        handleWallpaperChange as unknown as EventListener
      );
  }, [INDEXEDDB_PREFIX, getWallpaperData]);

  // Check if the current wallpaper is a video and force update
  useEffect(() => {
    if (!displaySource) return;

    const isVideo =
      displaySource.endsWith(".mp4") ||
      displaySource.includes("video/") ||
      (displaySource.startsWith("https://") &&
        /\.(mp4|webm|ogg)($|\?)/.test(displaySource));

    if (isVideo) {
      // When switching from image to video, force video detection
      const videoEl = videoRef.current;
      if (videoEl) {
        // Only update src if it changed to avoid reloading unnecessarily
        if (videoEl.src !== displaySource) {
          videoEl.src = displaySource;
          videoEl.load();
        }
        checkVideoLoadState(videoEl, displaySource);
      }
    }
  }, [displaySource, checkVideoLoadState]);

  // Add visibility change and focus handlers to resume video playback
  useEffect(() => {
    // Only add handlers if we have an active video wallpaper
    if (!isVideoWallpaper || !videoRef.current) return;

    const resumeVideoPlayback = () => {
      const video = videoRef.current;
      if (video && video.paused) {
        // Try to play the video when visibility changes to visible
        video.play().catch((err) => {
          console.warn("Could not resume video playback:", err);
        });
      }
    };

    // Handle page visibility change (when app is switched to/from background)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        resumeVideoPlayback();
      }
    };

    // Handle window focus (when app regains focus)
    const handleFocus = () => {
      resumeVideoPlayback();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isVideoWallpaper]);

  const getWallpaperStyles = (path: string): DesktopStyles => {
    if (!path) return {};

    // Don't apply background styles for video wallpapers
    if (
      path.endsWith(".mp4") ||
      path.includes("video/") ||
      (path.startsWith("https://") && /\.(mp4|webm|ogg)($|\?)/.test(path))
    ) {
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
    ...getWallpaperStyles(displaySource),
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
    markVideoLoaded(displaySource);
  };

  // Handle video loading events
  const handleCanPlayThrough = () => {
    markVideoLoaded(displaySource);
  };

  return (
    <div
      className="absolute inset-0 min-h-screen h-full z-[-1] desktop-background"
      onClick={onClick}
      style={finalStyles}
    >
      {/* Always render video element but control visibility */}
      {isVideoLoading && isVideoWallpaper && (
        <div className="absolute inset-0 w-full h-full bg-gray-700/30 z-[-5]" />
      )}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover z-[-10]"
        src={displaySource}
        autoPlay
        loop
        muted
        playsInline
        data-webkit-playsinline="true"
        onLoadedData={handleVideoLoaded}
        onCanPlayThrough={handleCanPlayThrough}
        style={{
          display: isVideoWallpaper ? "block" : "none",
          opacity: isVideoLoading ? 0.6 : 1,
          transition: "opacity 0.5s ease-in-out",
        }}
      />
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
