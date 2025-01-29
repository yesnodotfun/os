import { useState, useEffect } from "react";
import { BaseApp, AppManagerState } from "./types";
import { AppContext } from "@/contexts/AppContext";
import { MenuBar } from "@/components/layout/MenuBar";
import { loadAppState, saveAppState } from "@/utils/storage";

interface AppManagerProps {
  apps: BaseApp[];
}

export function AppManager({ apps }: AppManagerProps) {
  const [appStates, setAppStates] = useState<AppManagerState>(() =>
    loadAppState()
  );

  useEffect(() => {
    saveAppState(appStates);
  }, [appStates]);

  const bringToForeground = (appId: string) => {
    setAppStates((prev) => {
      const newStates = { ...prev };
      Object.keys(newStates).forEach((id) => {
        newStates[id] = { ...newStates[id], isForeground: id === appId };
      });
      return newStates;
    });
  };

  const toggleApp = (appId: string) => {
    setAppStates((prev) => ({
      ...prev,
      [appId]: {
        ...prev[appId],
        isOpen: !prev[appId]?.isOpen,
        isForeground: true,
      },
    }));

    // Set all other apps to background
    setAppStates((prev) => {
      const newStates = { ...prev };
      Object.keys(newStates).forEach((id) => {
        if (id !== appId) {
          newStates[id] = { ...newStates[id], isForeground: false };
        }
      });
      return newStates;
    });
  };

  return (
    <AppContext.Provider
      value={{ appStates, toggleApp, bringToForeground, apps }}
    >
      <MenuBar />
      {/* App Instances */}
      {apps.map((app) => {
        const isOpen = appStates[app.id]?.isOpen ?? false;
        const isForeground = appStates[app.id]?.isForeground ?? false;
        const AppComponent = app.component;
        return isOpen ? (
          <div
            key={app.id}
            style={{ zIndex: isForeground ? 50 : 10 }}
            className="absolute"
            onClick={() => !isForeground && bringToForeground(app.id)}
          >
            <AppComponent
              isWindowOpen={isOpen}
              isForeground={isForeground}
              onClose={() => toggleApp(app.id)}
              className="pointer-events-auto"
              helpItems={app.helpItems}
            />
          </div>
        ) : null;
      })}

      <div className="fixed inset-0 min-h-screen bg-[#666699] bg-[radial-gradient(#777_1px,transparent_0)] bg-[length:24px_24px] bg-[-19px_-19px] z-[-1]">
        {" "}
        {/* Desktop  */}
        <div className="pt-8 p-4 grid grid-cols-auto-fit-100 gap-4 justify-end">
          {apps.map((app) => (
            <div
              key={app.id}
              className="flex flex-col items-center gap-0 cursor-pointer"
              onDoubleClick={() => toggleApp(app.id)}
            >
              <div className="w-16 h-16 border-black flex items-center justify-center">
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
                className={`text-center px-1 ${
                  appStates[app.id]?.isOpen ?? false
                    ? "bg-black text-white"
                    : "bg-white text-black"
                }`}
              >
                {app.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AppContext.Provider>
  );
}
