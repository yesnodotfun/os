import { useState, useEffect } from "react";
import { BaseApp, AppManagerState } from "./types";
import { AppContext } from "@/contexts/AppContext";
import { MenuBar } from "@/components/layout/MenuBar";
import { Desktop } from "@/components/layout/Desktop";
import { loadAppState, saveAppState } from "@/utils/storage";

interface AppManagerProps {
  apps: BaseApp[];
}

const BASE_Z_INDEX = 1;
const FOREGROUND_Z_INDEX_OFFSET = 1;

export function AppManager({ apps }: AppManagerProps) {
  const [appStates, setAppStates] = useState<AppManagerState>(() =>
    loadAppState()
  );

  useEffect(() => {
    saveAppState(appStates);
  }, [appStates]);

  const getZIndexForApp = (appId: string) => {
    const index = appStates.windowOrder.indexOf(appId);
    if (index === -1) return BASE_Z_INDEX;
    return BASE_Z_INDEX + (index + 1) * FOREGROUND_Z_INDEX_OFFSET;
  };

  const bringToForeground = (appId: string) => {
    setAppStates((prev) => {
      const newStates = { ...prev };

      // If appId is empty, just remove foreground state from all windows
      if (!appId) {
        Object.keys(newStates.apps).forEach((id) => {
          newStates.apps[id] = { ...newStates.apps[id], isForeground: false };
        });
        return newStates;
      }

      // Remove appId from current position and add to end of windowOrder
      newStates.windowOrder = [
        ...newStates.windowOrder.filter((id) => id !== appId),
        appId,
      ];

      // Update foreground states
      Object.keys(newStates.apps).forEach((id) => {
        newStates.apps[id] = {
          ...newStates.apps[id],
          isForeground: id === appId,
        };
      });

      return newStates;
    });
  };

  const toggleApp = (appId: string) => {
    setAppStates((prev) => {
      const newStates = { ...prev };
      const isCurrentlyOpen = prev.apps[appId]?.isOpen;

      if (!isCurrentlyOpen) {
        // Add to end of windowOrder when opening
        newStates.windowOrder = [...prev.windowOrder, appId];
      } else {
        // Remove from windowOrder when closing
        newStates.windowOrder = prev.windowOrder.filter((id) => id !== appId);
      }

      Object.keys(newStates.apps).forEach((id) => {
        if (id === appId) {
          newStates.apps[id] = {
            ...newStates.apps[id],
            isOpen: !isCurrentlyOpen,
            isForeground: !isCurrentlyOpen,
          };
        } else {
          newStates.apps[id] = {
            ...newStates.apps[id],
            isForeground: false,
          };
        }
      });
      return newStates;
    });
  };

  return (
    <AppContext.Provider
      value={{
        appStates: appStates.apps,
        toggleApp,
        bringToForeground,
        apps,
      }}
    >
      <MenuBar />
      {/* App Instances */}
      {apps.map((app) => {
        const isOpen = appStates.apps[app.id]?.isOpen ?? false;
        const isForeground = appStates.apps[app.id]?.isForeground ?? false;
        const zIndex = getZIndexForApp(app.id);
        const AppComponent = app.component;
        return isOpen ? (
          <div
            key={app.id}
            style={{ zIndex }}
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

      <Desktop apps={apps} toggleApp={toggleApp} appStates={appStates} />
    </AppContext.Provider>
  );
}
