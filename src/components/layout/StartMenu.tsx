import { useState } from "react";
import { useLaunchApp } from "@/hooks/useLaunchApp";
import { useThemeStore } from "@/stores/useThemeStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { AboutFinderDialog } from "@/components/dialogs/AboutFinderDialog";
import { AnyApp } from "@/apps/base/types";
import { AppId } from "@/config/appIds";

interface StartMenuProps {
  apps: AnyApp[];
}

export function StartMenu({ apps }: StartMenuProps) {
  const launchApp = useLaunchApp();
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [aboutFinderOpen, setAboutFinderOpen] = useState(false);
  const currentTheme = useThemeStore((state) => state.current);

  const handleAppClick = (appId: string) => {
    launchApp(appId as AppId);
    setIsStartMenuOpen(false);
  };

  return (
    <>
      <DropdownMenu open={isStartMenuOpen} onOpenChange={setIsStartMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 px-3 py-1 h-8 text-white font-bold rounded-sm transition-all duration-75"
            style={{
              background:
                currentTheme === "xp"
                  ? "linear-gradient(to bottom, #3A7BE0, #2E6CE8, #1E4F99)"
                  : "#c0c0c0", // Flat gray for Windows 98
              border:
                currentTheme === "xp"
                  ? "1px solid #1941A5"
                  : "2px outset #c0c0c0",
              color: currentTheme === "xp" ? "#ffffff" : "#000000",
              boxShadow: isStartMenuOpen
                ? currentTheme === "xp"
                  ? "inset -1px -1px 0 rgba(255,255,255,0.3), inset 1px 1px 0 rgba(0,0,0,0.3)"
                  : "inset -1px -1px 0 #ffffff, inset 1px 1px 0 #808080"
                : currentTheme === "xp"
                ? "inset 1px 1px 0 rgba(255,255,255,0.3), inset -1px -1px 0 rgba(0,0,0,0.3)"
                : "inset 1px 1px 0 #ffffff, inset -1px -1px 0 #808080",
            }}
          >
            <img
              src="/icons/apple.png"
              alt="Start"
              className="w-6 h-6 [image-rendering:pixelated]"
            />
            <span
              style={{
                textShadow:
                  currentTheme === "xp"
                    ? "1px 1px 1px rgba(0,0,0,0.5)"
                    : "none",
              }}
            >
              {currentTheme === "xp" ? "start" : "Start"}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="top"
          sideOffset={8}
          className="w-64 max-h-96 overflow-y-auto px-0"
          style={{
            background:
              currentTheme === "xp"
                ? "linear-gradient(to right, #245EDC 50px, #ffffff 50px)"
                : "#c0c0c0", // Flat gray for Windows 98
            border:
              currentTheme === "xp"
                ? "1px solid #1941A5"
                : "2px outset #c0c0c0",
          }}
        >
          <DropdownMenuItem
            onClick={() => setAboutFinderOpen(true)}
            className="text-md h-6 px-3 hover:bg-blue-100 flex items-center"
            style={{
              color: currentTheme === "xp" ? "#000000" : "#000000",
            }}
          >
            About This Computer
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />

          {/* Programs Section */}
          <div className="px-2">
            <div
              className="text-xs font-bold mb-2 px-2"
              style={{ color: currentTheme === "xp" ? "#003D82" : "#000000" }}
            >
              Programs
            </div>
            {apps.map((app) => (
              <DropdownMenuItem
                key={app.id}
                onClick={() => handleAppClick(app.id)}
                className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-blue-100 rounded"
                style={{
                  color: currentTheme === "xp" ? "#000000" : "#000000",
                }}
              >
                {typeof app.icon === "string" ? (
                  <div className="w-6 h-6 flex items-center justify-center">
                    {app.icon}
                  </div>
                ) : (
                  <img
                    src={app.icon.src}
                    alt=""
                    className="w-6 h-6 [image-rendering:pixelated]"
                  />
                )}
                {app.name}
              </DropdownMenuItem>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <AboutFinderDialog
        isOpen={aboutFinderOpen}
        onOpenChange={setAboutFinderOpen}
      />
    </>
  );
}
