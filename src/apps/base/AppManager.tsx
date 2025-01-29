import React, { useState } from "react";
import { BaseApp, AppManagerState } from "./types";

interface AppManagerProps {
  apps: BaseApp[];
  initialState?: AppManagerState;
}

export function AppManager({ apps, initialState = {} }: AppManagerProps) {
  const [appStates, setAppStates] = useState<AppManagerState>(initialState);

  const toggleApp = (appId: string) => {
    setAppStates((prev) => ({
      ...prev,
      [appId]: {
        ...prev[appId],
        isOpen: !prev[appId]?.isOpen,
      },
    }));
  };

  return (
    <div className="min-h-screen bg-[#666699] bg-[radial-gradient(#777_1px,transparent_0)] bg-[length:24px_24px] bg-[-19px_-19px]">
      {/* Menu Bar */}
      <div className="fixed top-0 left-0 right-0 flex bg-system7-menubar-bg border-b-[2px] border-black px-2 h-7 items-center z-50">
        {apps.map((app) => (
          <app.MenuBar
            key={app.id}
            isWindowOpen={appStates[app.id]?.isOpen ?? false}
            onToggleWindow={() => toggleApp(app.id)}
          />
        ))}
      </div>

      {/* Desktop Icons */}
      <div className="pt-8 p-4 grid grid-cols-auto-fit-100 gap-4">
        {apps.map((app) => (
          <div
            key={app.id}
            className="flex flex-col items-center gap-2 cursor-pointer"
            onDoubleClick={() => toggleApp(app.id)}
          >
            <div className="w-16 h-16 bg-white border-2 border-black flex items-center justify-center">
              {app.icon}
            </div>
            <span className="text-white text-center bg-black px-1">
              {app.name}
            </span>
          </div>
        ))}
      </div>

      {/* App Windows */}
      {apps.map(
        (app) =>
          appStates[app.id]?.isOpen && (
            <app.Window key={app.id} onClose={() => toggleApp(app.id)} />
          )
      )}
    </div>
  );
}
