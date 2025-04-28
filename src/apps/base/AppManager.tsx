import { useEffect, useState } from "react";
import { BaseApp } from "./types";
import { AppContext } from "@/contexts/AppContext";
import { MenuBar } from "@/components/layout/MenuBar";
import { Desktop } from "@/components/layout/Desktop";
import { AppId, getAppComponent } from "@/config/appRegistry";
import { useWallpaper } from "@/hooks/useWallpaper";
import { useAppStore } from "@/stores/useAppStore";
import { extractCodeFromPath, decodeSharedUrl } from "@/utils/sharedUrl";
import { toast } from "sonner";

interface AppManagerProps {
  apps: BaseApp[];
}


const BASE_Z_INDEX = 1;
const FOREGROUND_Z_INDEX_OFFSET = 1;

export function AppManager({ apps }: AppManagerProps) {
  const windowOrder = useAppStore((state) => state.windowOrder);
  const appStates = useAppStore((state) => state.apps);
  const bringToForeground = useAppStore((state) => state.bringToForeground);
  const toggleApp = useAppStore((state) => state.toggleApp);
  const navigateToNextApp = useAppStore((state) => state.navigateToNextApp);
  const navigateToPreviousApp = useAppStore(
    (state) => state.navigateToPreviousApp
  );
  const { currentWallpaper } = useWallpaper();
  const [isInitialMount, setIsInitialMount] = useState(true);

  const getZIndexForApp = (appId: AppId) => {
    const index = windowOrder.indexOf(appId);
    if (index === -1) return BASE_Z_INDEX;
    return BASE_Z_INDEX + (index + 1) * FOREGROUND_Z_INDEX_OFFSET;
  };

  // Set isInitialMount to false after a short delay
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialMount(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Process shared URLs
  useEffect(() => {
    const handleSharedUrl = async () => {
      const path = window.location.pathname;
      const code = extractCodeFromPath(path);
      
      if (code) {
        toast.loading("Decoding shared link...", {
          id: "decode-shared-url",
        });
        
        const sharedData = await decodeSharedUrl(code);
        
        if (sharedData) {
          
          // Store the shared URL data for Internet Explorer
          localStorage.setItem('ryos:shared_ie_url', sharedData.url);
          localStorage.setItem('ryos:shared_ie_year', sharedData.year);
          
          // Launch Internet Explorer
          const event = new CustomEvent('launchApp', {
            detail: { 
              appId: 'internet-explorer',
              // Pass additional data that will be processed by IE
              initialData: {
                url: sharedData.url,
                year: sharedData.year
              }
            }
          });
          window.dispatchEvent(event);
          
          // Update the URL to remove the share code
          window.history.replaceState({}, '', '/');
        } else {
          toast.error("Invalid shared link", {
            id: "decode-shared-url",
            description: "Could not decode the shared URL",
          });
        }
      }
    };

    // Process shared URLs on initial load
    handleSharedUrl();
  }, []);

  // Listen for app launch events from Finder
  useEffect(() => {
    const handleAppLaunch = (
      event: CustomEvent<{ appId: AppId; initialPath?: string; initialData?: any }>
    ) => {
      const { appId, initialPath, initialData } = event.detail;
      if (!appStates[appId]?.isOpen) {
        toggleApp(appId);
        if (initialPath) {
          localStorage.setItem(`app_${appId}_initialPath`, initialPath);
        }
        if (initialData) {
          localStorage.setItem(`app_${appId}_initialData`, JSON.stringify(initialData));
        }
      } else {
        bringToForeground(appId);
      }
    };

    window.addEventListener("launchApp", handleAppLaunch as EventListener);
    return () => {
      window.removeEventListener("launchApp", handleAppLaunch as EventListener);
    };
  }, [appStates, bringToForeground, toggleApp]);

  return (
    <AppContext.Provider
      value={{
        appStates: appStates,
        toggleApp,
        bringToForeground,
        apps,
        navigateToNextApp,
        navigateToPreviousApp,
      }}
    >
      <MenuBar />
      {/* App Instances */}
      {apps.map((app) => {
        const appId = app.id as AppId;
        const isOpen = appStates[appId]?.isOpen ?? false;
        const isForeground = appStates[appId]?.isForeground ?? false;
        const zIndex = getZIndexForApp(appId);
        const AppComponent = getAppComponent(appId);

        return isOpen ? (
          <div
            key={appId}
            style={{ zIndex }}
            className="absolute inset-x-0 md:inset-x-auto w-full md:w-auto"
            onClick={() => !isForeground && bringToForeground(appId)}
          >
            <AppComponent
              isWindowOpen={isOpen}
              isForeground={isForeground}
              onClose={() => toggleApp(appId)}
              className="pointer-events-auto"
              helpItems={app.helpItems}
              skipInitialSound={isInitialMount}
            />
          </div>
        ) : null;
      })}

      <Desktop
        apps={apps}
        toggleApp={toggleApp}
        appStates={{ windowOrder, apps: appStates }}
        wallpaperPath={currentWallpaper}
      />
    </AppContext.Provider>
  );
}
