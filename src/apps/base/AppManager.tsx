import { useEffect, useState } from "react";
import { AnyApp } from "./types";
import { AppContext } from "@/contexts/AppContext";
import { MenuBar } from "@/components/layout/MenuBar";
import { Desktop } from "@/components/layout/Desktop";
import { AppId, getAppComponent, appRegistry } from "@/config/appRegistry";
import { useAppStore } from "@/stores/useAppStore";
import { extractCodeFromPath } from "@/utils/sharedUrl";
import { toast } from "sonner";

interface AppManagerProps {
  apps: AnyApp[];
}

const BASE_Z_INDEX = 1;
const FOREGROUND_Z_INDEX_OFFSET = 1;

export function AppManager({ apps }: AppManagerProps) {
  // Legacy state for compatibility
  const windowOrder = useAppStore((state) => state.windowOrder);
  const appStates = useAppStore((state) => state.apps);
  const bringToForeground = useAppStore((state) => state.bringToForeground);
  const toggleApp = useAppStore((state) => state.toggleApp);
  const closeApp = useAppStore((state) => state.closeApp);
  const navigateToNextApp = useAppStore((state) => state.navigateToNextApp);
  const navigateToPreviousApp = useAppStore(
    (state) => state.navigateToPreviousApp
  );

  // New instance-based state
  const instances = useAppStore((state) => state.instances);
  const instanceWindowOrder = useAppStore((state) => state.instanceWindowOrder);
  const launchApp = useAppStore((state) => state.launchApp);
  const closeAppInstance = useAppStore((state) => state.closeAppInstance);
  const bringInstanceToForeground = useAppStore(
    (state) => state.bringInstanceToForeground
  );
  const navigateToNextInstance = useAppStore(
    (state) => state.navigateToNextInstance
  );
  const navigateToPreviousInstance = useAppStore(
    (state) => state.navigateToPreviousInstance
  );

  const [isInitialMount, setIsInitialMount] = useState(true);
  const useInstanceSystem = true; // Enable instance system

  const getZIndexForApp = (appId: AppId) => {
    const index = windowOrder.indexOf(appId);
    if (index === -1) return BASE_Z_INDEX;
    return BASE_Z_INDEX + (index + 1) * FOREGROUND_Z_INDEX_OFFSET;
  };

  const getZIndexForInstance = (instanceId: string) => {
    const index = instanceWindowOrder.indexOf(instanceId);
    if (index === -1) return BASE_Z_INDEX;
    return BASE_Z_INDEX + (index + 1) * FOREGROUND_Z_INDEX_OFFSET;
  };

  // Set isInitialMount to false after a short delay
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialMount(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Process shared URLs and direct app launch paths
  useEffect(() => {
    const handleUrlNavigation = async () => {
      const path = window.location.pathname;
      console.log("[AppManager] Checking path:", path); // Keep this log for debugging
      const ieShareCode = extractCodeFromPath(path); // Specifically checks for /internet-explorer/:code format

      if (ieShareCode) {
        // Handle shared Internet Explorer URL - Pass code directly
        console.log("[AppManager] Detected IE share code:", ieShareCode);
        toast.info("Opening shared Internet Explorer link...");

        // Use setTimeout to ensure the event listener is ready
        setTimeout(() => {
          const event = new CustomEvent("launchApp", {
            detail: {
              appId: "internet-explorer",
              initialData: {
                shareCode: ieShareCode,
              },
            },
          });
          window.dispatchEvent(event);
          console.log(
            "[AppManager] Dispatched launchApp event for IE share code."
          );
        }, 0);

        window.history.replaceState({}, "", "/"); // Clean URL
      } else if (path.startsWith("/ipod/")) {
        const videoId = path.substring("/ipod/".length);
        if (videoId) {
          console.log("[AppManager] Detected iPod videoId:", videoId);
          toast.info("Opening shared iPod track...");
          setTimeout(() => {
            const event = new CustomEvent("launchApp", {
              detail: {
                appId: "ipod",
                initialData: { videoId },
              },
            });
            window.dispatchEvent(event);
            console.log(
              "[AppManager] Dispatched launchApp event for iPod videoId."
            );
          }, 0);
          window.history.replaceState({}, "", "/"); // Clean URL
        }
      } else if (path.startsWith("/videos/")) {
        const videoId = path.substring("/videos/".length);
        if (videoId) {
          console.log("[AppManager] Detected Videos videoId:", videoId);
          toast.info("Opening shared video...");
          setTimeout(() => {
            const event = new CustomEvent("launchApp", {
              detail: {
                appId: "videos",
                initialData: { videoId },
              },
            });
            window.dispatchEvent(event);
            console.log(
              "[AppManager] Dispatched launchApp event for Videos videoId."
            );
          }, 0);
          window.history.replaceState({}, "", "/"); // Clean URL
        }
      } else if (path.startsWith("/") && path.length > 1) {
        // Handle direct app launch path (e.g., /soundboard)
        const potentialAppId = path.substring(1) as AppId;

        // Check if it's a valid app ID from the registry
        if (potentialAppId in appRegistry) {
          const appName = appRegistry[potentialAppId]?.name || potentialAppId;
          toast.info(`Launching ${appName}...`);

          // Use a slight delay to ensure the app launch event is caught
          setTimeout(() => {
            const event = new CustomEvent("launchApp", {
              detail: { appId: potentialAppId },
            });
            window.dispatchEvent(event);
            window.history.replaceState({}, "", "/"); // Clean URL
          }, 100); // Small delay might help robustness
        } else {
          // Optional: Handle invalid app paths if necessary, or just ignore
          // console.log(`Path ${path} does not correspond to a known app.`);
          // Maybe redirect to root or show a 404 within the app context
          // For now, just clean the URL if it wasn't a valid app path or IE code
          // Update condition: Only clean if it's not an IE path (we handle cleaning IE path above)
          // Update condition: Also check for ipod and videos paths
          if (
            !path.startsWith("/internet-explorer/") &&
            !path.startsWith("/ipod/") &&
            !path.startsWith("/videos/")
          ) {
            window.history.replaceState({}, "", "/");
          }
        }
      }
    };

    // Process URL on initial load
    handleUrlNavigation();
  }, []); // Run only once on mount

  // Listen for app launch events (e.g., from Finder, URL handling)
  useEffect(() => {
    const handleAppLaunch = (
      event: CustomEvent<{
        appId: AppId;
        initialPath?: string;
        initialData?: unknown;
      }>
    ) => {
      const { appId, initialPath, initialData } = event.detail; // Destructure initialData
      const isAppOpen = appStates[appId]?.isOpen;

      console.log(
        `[AppManager] Launch event received for ${appId}`,
        event.detail
      );

      if (useInstanceSystem) {
        // Use new instance system
        const instanceId = launchApp(appId, initialData);
        console.log(
          `[AppManager] Launched instance ${instanceId} for app ${appId}`
        );

        // Store initialPath if provided
        if (initialPath) {
          localStorage.setItem(`app_${appId}_initialPath`, initialPath);
        }
      } else {
        // Use legacy system
        if (!isAppOpen) {
          console.log(`[AppManager] Toggling app ${appId} to open.`);
          // Pass initialData when toggling the app open
          toggleApp(appId, initialData); // Pass initialData to toggleApp
          // Keep localStorage for path for now, as it might be used differently
          if (initialPath) {
            localStorage.setItem(`app_${appId}_initialPath`, initialPath);
          }
        } else {
          console.log(`[AppManager] Bringing app ${appId} to foreground.`);
          bringToForeground(appId);

          // --- FIX: Handle generic initialData (like url/year) for already open IE ---
          if (appId === "internet-explorer" && initialData) {
            // Dispatch updateApp event with the received initialData
            console.log(
              `[AppManager] Dispatching updateApp event for already open IE with initialData:`,
              initialData
            );
            const updateEvent = new CustomEvent("updateApp", {
              detail: { appId, initialData },
            });
            window.dispatchEvent(updateEvent);
          }
          // --- END FIX ---

          // --- ADDED: Handle initialData (videoId) for already open iPod ---
          if (
            appId === "ipod" &&
            initialData &&
            typeof initialData === "object" &&
            "videoId" in initialData
          ) {
            console.log(
              `[AppManager] Dispatching updateApp event for already open iPod with initialData:`,
              initialData
            );
            const updateEvent = new CustomEvent("updateApp", {
              detail: { appId, initialData },
            });
            window.dispatchEvent(updateEvent);
          }
          // --- END ADDED ---

          // --- ADDED: Handle initialData (videoId) for already open Videos ---
          if (
            appId === "videos" &&
            initialData &&
            typeof initialData === "object" &&
            "videoId" in initialData
          ) {
            console.log(
              `[AppManager] Dispatching updateApp event for already open Videos with initialData:`,
              initialData
            );
            const updateEvent = new CustomEvent("updateApp", {
              detail: { appId, initialData },
            });
            window.dispatchEvent(updateEvent);
          }
          // --- END ADDED ---

          // Existing shareCode specific logic (can be potentially removed if the above handles it, but keep for now for safety)
          // if (appId === 'internet-explorer' && initialData?.shareCode) {
          //    // Option 1: Dispatch another event specifically for the open app
          //    const updateEvent = new CustomEvent('updateApp', { detail: { appId, initialData } });
          //    window.dispatchEvent(updateEvent);
          //    // Option 2: Update zustand store directly if needed (less preferred for cross-component)
          // }
        }
      }
    };

    window.addEventListener("launchApp", handleAppLaunch as EventListener);
    return () => {
      window.removeEventListener("launchApp", handleAppLaunch as EventListener);
    };
    // Update dependencies to include appStates for checking if app is open
  }, [appStates, bringToForeground, toggleApp, useInstanceSystem, launchApp]);

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
      {useInstanceSystem
        ? // Instance-based rendering
          Object.values(instances).map((instance) => {
            if (!instance.isOpen) return null;

            const appId = instance.appId as AppId;
            const zIndex = getZIndexForInstance(instance.instanceId);
            const AppComponent = getAppComponent(appId);

            return (
              <div
                key={instance.instanceId}
                style={{ zIndex }}
                className="absolute inset-x-0 md:inset-x-auto w-full md:w-auto"
                onClick={() =>
                  !instance.isForeground &&
                  bringInstanceToForeground(instance.instanceId)
                }
              >
                <AppComponent
                  isWindowOpen={instance.isOpen}
                  isForeground={instance.isForeground}
                  onClose={() => closeAppInstance(instance.instanceId)}
                  className="pointer-events-auto"
                  helpItems={apps.find((app) => app.id === appId)?.helpItems}
                  skipInitialSound={isInitialMount}
                  initialData={instance.initialData as unknown as undefined}
                  instanceId={instance.instanceId}
                  title={instance.title}
                  onNavigateNext={() =>
                    navigateToNextInstance(instance.instanceId)
                  }
                  onNavigatePrevious={() =>
                    navigateToPreviousInstance(instance.instanceId)
                  }
                />
              </div>
            );
          })
        : // Legacy app-based rendering
          apps.map((app) => {
            const appId = app.id as AppId;
            const isOpen = appStates[appId]?.isOpen ?? false;
            const isForeground = appStates[appId]?.isForeground ?? false;
            const zIndex = getZIndexForApp(appId);
            const AppComponent = getAppComponent(appId);
            // Retrieve initialData associated with this app instance from the store
            const initialData = appStates[appId]?.initialData;

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
                  onClose={() => closeApp(appId)}
                  className="pointer-events-auto"
                  helpItems={app.helpItems}
                  skipInitialSound={isInitialMount}
                  initialData={initialData as unknown as undefined}
                />
              </div>
            ) : null;
          })}

      <Desktop
        apps={apps}
        toggleApp={(appId, initialData) => {
          // Use the instance-based launch system for Desktop
          launchApp(appId, initialData);
        }}
        appStates={{ windowOrder, apps: appStates }}
      />
    </AppContext.Provider>
  );
}
