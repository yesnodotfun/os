import { useAppStore } from "@/stores/useAppStore";
import { AppId } from "@/config/appRegistry";

// Export the interface
export interface LaunchAppOptions {
  initialPath?: string;
  initialData?: any; // Add initialData field
  multiWindow?: boolean; // Add multiWindow flag
}

export const useLaunchApp = () => {
  // Get the launch method from the store
  const launchAppInstance = useAppStore((state) => state.launchApp);

  const launchApp = (appId: AppId, options?: LaunchAppOptions) => {
    console.log(`[useLaunchApp] Launch event received for ${appId}`, options);

    // Special handling for Finder initial path
    if (appId === "finder" && options?.initialPath) {
      localStorage.setItem("app_finder_initialPath", options.initialPath);
    }

    // Use the new instance-based launch system
    const instanceId = launchAppInstance(
      appId,
      options?.initialData,
      undefined,
      options?.multiWindow
    );
    console.log(
      `[useLaunchApp] Created instance ${instanceId} for app ${appId}`
    );

    return instanceId;
  };

  return launchApp;
};
