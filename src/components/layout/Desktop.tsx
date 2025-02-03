import { BaseApp } from "@/apps/base/types";
import { AppManagerState } from "@/apps/base/types";
import { useState } from "react";
import { loadDesktopIconState } from "@/utils/storage";
import { FileIcon } from "@/apps/finder/components/FileIcon";

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
  const [desktopIconState] = useState(() => loadDesktopIconState());

  const getWallpaperStyles = (path: string): DesktopStyles => {
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
    ...getWallpaperStyles(wallpaperPath),
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

  return (
    <div
      className="absolute inset-0 min-h-screen h-full z-[-1] desktop-background"
      onClick={onClick}
      style={finalStyles}
    >
      <div className="pt-8 p-4 flex flex-col items-end h-[calc(100%-2rem)]">
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
          {apps.map(
            (app) =>
              desktopIconState[app.id]?.visible && (
                <FileIcon
                  key={app.id}
                  name={app.name}
                  isDirectory={false}
                  icon={typeof app.icon === "string" ? undefined : app.icon.src}
                  onClick={(e) => handleIconClick(app.id, e)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    toggleApp(app.id);
                    setSelectedAppId(null);
                  }}
                  isSelected={selectedAppId === app.id}
                  size="large"
                />
              )
          )}
        </div>
      </div>
    </div>
  );
}
