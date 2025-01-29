import { createContext, useContext } from "react";
import { AppManagerState, BaseApp } from "@/apps/base/types";

interface AppContextType {
  appStates: AppManagerState;
  toggleApp: (appId: string) => void;
  bringToForeground: (appId: string) => void;
  apps: BaseApp[];
}

export const AppContext = createContext<AppContextType | null>(null);

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context)
    throw new Error("useAppContext must be used within AppProvider");
  return context;
}
