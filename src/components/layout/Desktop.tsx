import { BaseApp } from "@/apps/base/types";
import { AppManagerState } from "@/apps/base/types";

interface DesktopProps {
  apps: BaseApp[];
  appStates: AppManagerState;
  toggleApp: (appId: string) => void;
}

export function Desktop({ apps, appStates, toggleApp }: DesktopProps) {
  return (
    <div className="absolute inset-0 min-h-screen bg-[#666699] bg-[radial-gradient(#777_1px,transparent_0)] bg-[length:24px_24px] bg-[-19px_-19px] z-[-1]">
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
              className={`text-center px-1.5 font-['Geneva-12'] antialiased text-[12px] ${
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
  );
}
