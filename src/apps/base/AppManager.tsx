import { useState } from "react";
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
    <>
      {/* App Instances */}
      {apps.map((app) => {
        const isOpen = appStates[app.id]?.isOpen ?? false;
        const AppComponent = app.component;
        return (
          <AppComponent
            key={app.id}
            isWindowOpen={isOpen}
            onClose={() => toggleApp(app.id)}
          />
        );
      })}
      <div className="min-h-screen bg-[#666699] bg-[radial-gradient(#777_1px,transparent_0)] bg-[length:24px_24px] bg-[-19px_-19px] z-[-1]">
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
    </>
  );
}
