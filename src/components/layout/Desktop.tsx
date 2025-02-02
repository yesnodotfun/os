import { BaseApp } from "@/apps/base/types";
import { AppManagerState } from "@/apps/base/types";
import { useState } from "react";
import { loadDesktopIconState } from "@/utils/storage";
import { useAppContext } from "@/contexts/AppContext";

interface DesktopProps {
  apps: BaseApp[];
  appStates: AppManagerState;
  toggleApp: (appId: string) => void;
}

export function Desktop({ apps, toggleApp }: DesktopProps) {
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [desktopIconState] = useState(() => loadDesktopIconState());
  const { bringToForeground } = useAppContext();

  const handleIconClick = (appId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedAppId(appId);
  };

  const handleDesktopClick = () => {
    setSelectedAppId(null);
    // Send all apps to background by bringing a non-existent app to foreground
    bringToForeground("");
  };

  return (
    <div
      className="absolute inset-0 min-h-screen h-full bg-[#666699] bg-[radial-gradient(#777_1px,transparent_0)] bg-[length:24px_24px] bg-[-19px_-19px] z-[-1]"
      onClick={handleDesktopClick}
    >
      <div className="pt-8 p-4 flex flex-col items-end h-[calc(100%-2rem)]">
        <div className="flex flex-col flex-wrap-reverse justify-start gap-1 content-start h-full">
          {apps.map(
            (app) =>
              desktopIconState[app.id]?.visible && (
                <div
                  key={app.id}
                  className="flex flex-col items-center justify-center cursor-pointer w-24 h-24"
                  onClick={(e) => handleIconClick(app.id, e)}
                  onDoubleClick={() => {
                    toggleApp(app.id);
                    setSelectedAppId(null);
                  }}
                >
                  <div
                    className={`w-16 h-16 flex items-center justify-center ${
                      selectedAppId === app.id
                        ? "brightness-65 contrast-100 "
                        : ""
                    }`}
                  >
                    {typeof app.icon === "string" ? (
                      app.icon
                    ) : (
                      <img
                        src={app.icon.src}
                        alt={app.name}
                        className="w-12 h-12 object-contain"
                        style={{ imageRendering: "pixelated" }}
                      />
                    )}
                  </div>
                  <span
                    className={`text-center px-1.5 font-['Geneva-12'] antialiased text-[12px] max-w-full truncate ${
                      selectedAppId === app.id
                        ? "bg-black text-white"
                        : "bg-white text-black"
                    }`}
                  >
                    {app.name}
                  </span>
                </div>
              )
          )}
        </div>
      </div>
    </div>
  );
}
