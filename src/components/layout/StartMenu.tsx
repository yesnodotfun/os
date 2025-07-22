import { useState } from "react";
import { useLaunchApp } from "@/hooks/useLaunchApp";
import { useThemeStore } from "@/stores/useThemeStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
            className="flex items-center gap-2 px-4 text-white font-bold transition-all"
            style={{
              width: "100px",
              height: "30px",
              borderRadius: "0 3px 3px 0",
              background:
                currentTheme === "xp"
                  ? isStartMenuOpen
                    ? "linear-gradient(0deg, #2f892f 0%, #4eb64e 6%, #4eb64e 51%, #4eb64e 63%, #4eb64e 77%, #c4ffc4 85%, #c4ffc4 93%, #2f892f 97%)"
                    : "linear-gradient(0deg, #0c450c 0%, #308f2f 6%, #308f2f 51%, #308f2f 63%, #308f2f 77%, #97c597 85%, #97c597 93%, #308f2f 97%)"
                  : "#c0c0c0", // Flat gray for Windows 98
              border: currentTheme === "xp" ? "none" : "2px outset #c0c0c0",
              color: currentTheme === "xp" ? "#ffffff" : "#000000",
              fontWeight: currentTheme === "xp" ? "500" : "bold",
              fontSize: currentTheme === "xp" ? "1.1rem" : "11px",
              fontStyle: currentTheme === "xp" ? "italic" : "normal",
              boxShadow:
                currentTheme === "xp"
                  ? "-2px -2px 10px #0000008e inset"
                  : isStartMenuOpen
                  ? "inset -1px -1px 0 #ffffff, inset 1px 1px 0 #808080"
                  : "inset 1px 1px 0 #ffffff, inset -1px -1px 0 #808080",
            }}
          >
            <img
              src="/icons/apple.png"
              alt="Start"
              className="w-6 h-6 [image-rendering:pixelated]"
              style={{
                filter:
                  currentTheme === "xp"
                    ? "drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.705))"
                    : "none",
              }}
            />
            <span
              style={{
                textShadow:
                  currentTheme === "xp"
                    ? "2px 2px 2px rgba(0, 0, 0, 0.685)"
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
          sideOffset={2}
          className="p-0 overflow-hidden"
          style={{
            width: "380px",
            maxHeight: "480px",
            background:
              currentTheme === "xp" || currentTheme === "win98"
                ? "#ece9d8"
                : "#c0c0c0",
            border:
              currentTheme === "xp"
                ? "3px solid #0855dd"
                : currentTheme === "win98"
                ? "2px outset #c0c0c0"
                : "2px outset #c0c0c0",
            borderRadius: currentTheme === "xp" ? "5px 5px 0 0" : "0",
          }}
        >
          <div className="flex h-full">
            {/* Left Panel with rotated text */}
            {(currentTheme === "xp" || currentTheme === "win98") && (
              <div
                className="relative w-[32px] overflow-hidden"
                style={{
                  background:
                    currentTheme === "xp"
                      ? "linear-gradient(to bottom, #3a6fd8, #2559ce)"
                      : "linear-gradient(to bottom, #1e4096, #143366)",
                  borderRight: "1px solid #1f4788",
                }}
              >
                <div
                  className="absolute whitespace-nowrap text-white font-semibold"
                  style={{
                    bottom: "12px",
                    left: "50%",
                    transform: "rotate(-90deg)",
                    transformOrigin: "left",
                    fontSize: "16px",
                    letterSpacing: "1px",
                    textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
                    width: "400px",
                    textAlign: "left",
                  }}
                >
                  ryOS {currentTheme === "xp" ? "Professional" : "98"}
                </div>
              </div>
            )}

            {/* Right Panel with menu items */}
            <div
              className="flex-1 flex flex-col"
              style={{
                background:
                  currentTheme === "xp" || currentTheme === "win98"
                    ? "#ffffff"
                    : "#c0c0c0",
              }}
            >
              {/* Top section with pinned items */}
              <div className="border-b" style={{ borderColor: "#9e9e9e" }}>
                <DropdownMenuItem
                  onClick={() => setAboutFinderOpen(true)}
                  className="h-8 px-3 flex items-center gap-2 hover:bg-blue-500 hover:text-white"
                  style={{
                    fontSize: "11px",
                    color: "#000000",
                  }}
                >
                  <img src="/icons/info.png" alt="" className="w-4 h-4" />
                  About This Computer
                </DropdownMenuItem>
              </div>

              {/* Programs Section */}
              <div className="py-1">
                {apps.map((app) => (
                  <DropdownMenuItem
                    key={app.id}
                    onClick={() => handleAppClick(app.id)}
                    className="h-8 px-3 flex items-center gap-2 hover:bg-blue-500 hover:text-white"
                    style={{
                      fontSize: "11px",
                      color: "#000000",
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
            </div>
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
