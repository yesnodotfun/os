import { useState, useEffect } from "react";
import { BaseApp, AppManagerState } from "./types";
import { AppContext } from "@/contexts/AppContext";
import { MenuBar } from "@/components/layout/MenuBar";
import { Desktop } from "@/components/layout/Desktop";
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
    setAppStates((prev) => {
      const newStates = { ...prev };
      // Update all apps' foreground state and the target app's open state
      Object.keys(newStates).forEach((id) => {
        newStates[id] = {
          ...newStates[id],
          isForeground: id === appId,
          ...(id === appId && { isOpen: !prev[appId]?.isOpen }),
        };
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
            className="absolute inset-x-0 md:inset-x-auto w-full md:w-auto"
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

      <Desktop apps={apps} appStates={appStates} toggleApp={toggleApp} />
    </AppContext.Provider>
  );
}
