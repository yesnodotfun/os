import { BaseApp } from "@/apps/base/types";
import { AppManagerState } from "@/apps/base/types";
import { useState } from "react";
import { loadDesktopIconState } from "@/utils/storage";
import { FileIcon } from "@/apps/finder/components/FileIcon";

interface DesktopProps {
  apps: BaseApp[];
  appStates: AppManagerState;
  toggleApp: (appId: string) => void;
  onClick?: () => void;
}

export function Desktop({ apps, toggleApp, onClick }: DesktopProps) {
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [desktopIconState] = useState(() => loadDesktopIconState());

  const handleIconClick = (
    appId: string,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    event.stopPropagation();
    setSelectedAppId(appId);
  };

  const handleFinderOpen = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    // Store initial path for Finder
    localStorage.setItem("app_finder_initialPath", "/");
    // Find and open Finder app
    const finderApp = apps.find((app) => app.id === "finder");
    if (finderApp) {
      toggleApp(finderApp.id);
    }
    setSelectedAppId(null);
  };

  return (
    <div
      className="absolute inset-0 min-h-screen h-full bg-[#666699] bg-[radial-gradient(#777_1px,transparent_0)] bg-[length:24px_24px] bg-[-19px_-19px] z-[-1]"
      onClick={onClick}
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
