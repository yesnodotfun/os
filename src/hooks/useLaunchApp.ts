import { AppId } from "@/config/appRegistry";

// Export the interface
export interface LaunchAppOptions {
  initialPath?: string;
  initialData?: any; // Add initialData field
}

export function useLaunchApp() {
  const launchApp = (appId: AppId | string, options: LaunchAppOptions = {}) => {
    window.dispatchEvent(
      new CustomEvent("launchApp", {
        detail: {
          appId,
          // Ensure initialData is included if present
          initialPath: options.initialPath,
          initialData: options.initialData,
        },
      })
    );
  };

  return launchApp;
}
