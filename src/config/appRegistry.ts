import { TextEditApp } from "@/apps/textedit";
import { InternetExplorerApp } from "@/apps/internet-explorer";
import { ChatsApp } from "@/apps/chats";
import ControlPanelsApp from "@/apps/control-panels";
import { MinesweeperApp } from "@/apps/minesweeper";
import { SoundboardApp } from "@/apps/soundboard";
import { FinderApp } from "@/apps/finder";

// Registry of all available apps
export const appRegistry = {
  [FinderApp.id]: FinderApp,
  [SoundboardApp.id]: SoundboardApp,
  [InternetExplorerApp.id]: InternetExplorerApp,
  [ChatsApp.id]: ChatsApp,
  [TextEditApp.id]: TextEditApp,
  [MinesweeperApp.id]: MinesweeperApp,
  [ControlPanelsApp.id]: ControlPanelsApp,
} as const;

// Type for app IDs
export type AppId = keyof typeof appRegistry & string;

// Helper function to get app icon path
export const getAppIconPath = (appId: AppId): string => {
  const app = appRegistry[appId];
  if (typeof app.icon === "string") {
    return app.icon;
  }
  return app.icon.src;
};

// Helper function to get all apps except Finder
export const getNonFinderApps = (): Array<{
  name: string;
  icon: string;
  id: AppId;
}> => {
  return Object.entries(appRegistry)
    .filter(([id]) => id !== "finder")
    .map(([id, app]) => ({
      name: app.name,
      icon: getAppIconPath(id as AppId),
      id: id as AppId,
    }));
};

// Helper function to get app metadata
export const getAppMetadata = (appId: AppId) => {
  return appRegistry[appId].metadata;
};

// Helper function to get app component
export const getAppComponent = (appId: AppId) => {
  return appRegistry[appId].component;
};
