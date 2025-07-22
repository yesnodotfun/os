import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getNonFinderApps } from "@/config/appRegistry";
import { useAppContext } from "@/contexts/AppContext";
import { useThemeStore } from "@/stores/useThemeStore";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface AboutFinderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AppMemoryUsage {
  name: string;
  memoryMB: number;
  percentage: number;
}

export function AboutFinderDialog({
  isOpen,
  onOpenChange,
}: AboutFinderDialogProps) {
  const { appStates } = useAppContext();
  const currentTheme = useThemeStore((state) => state.current);
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";

  const memoryUsage = useMemo(() => {
    const totalMemory = 32; // 32MB total memory
    const systemUsage = 8.5; // System takes about 8.5MB
    const apps = getNonFinderApps();

    // Get only open apps
    const openApps = apps.filter((app) => appStates[app.id]?.isOpen);

    // Calculate memory usage for system and open apps (limited to 4)
    const appUsages: AppMemoryUsage[] = [
      {
        name: "System",
        memoryMB: systemUsage,
        percentage: (systemUsage / totalMemory) * 100,
      },
      ...openApps.map((app, index) => {
        const memory = 1.5 + index * 0.5; // Simulate different memory usage per app
        return {
          name: app.name,
          memoryMB: memory,
          percentage: (memory / totalMemory) * 100,
        };
      }),
    ];

    return appUsages;
  }, [appStates]);

  const totalUsedMemory = useMemo(() => {
    return memoryUsage.reduce((acc, app) => acc + app.memoryMB, 0);
  }, [memoryUsage]);

  const dialogContent = (
    <div className={isXpTheme ? "p-2 px-4" : "p-4"}>
      <div className="flex">
        {/* Right side with system info */}
        <div className="space-y-3 flex-1 ">
          <div className="flex flex-row items-center space-x-2 p-2 px-4">
            <div className="flex flex-col w-1/3 items-center space-x-2">
              <img
                src="/icons/mac-classic.png"
                alt="Happy Mac"
                className="w-10 h-10 mb-0 [image-rendering:pixelated]"
              />
              <div
                className={cn(
                  isXpTheme
                    ? "font-['Pixelated_MS_Sans_Serif',Arial] text-[16px]"
                    : "font-apple-garamond text-xl"
                )}
                style={{
                  fontFamily: isXpTheme
                    ? '"Pixelated MS Sans Serif", Arial'
                    : undefined,
                  fontSize: isXpTheme ? "16px" : undefined,
                }}
              >
                ryOS 8.2
              </div>
            </div>

            <div
              className={cn(
                "space-y-4",
                isXpTheme
                  ? "font-['Pixelated_MS_Sans_Serif',Arial] text-[10px]"
                  : "font-geneva-12 text-[10px]"
              )}
              style={{
                fontFamily: isXpTheme
                  ? '"Pixelated MS Sans Serif", Arial'
                  : undefined,
                fontSize: isXpTheme ? "10px" : undefined,
              }}
            >
              <div>
                <div>Built-in Memory: 32MB</div>
                <div>Virtual Memory: Off</div>
                <div>
                  Largest Unused Block: {(32 - totalUsedMemory).toFixed(1)}MB
                </div>
                <div
                  className={cn(
                    "text-[10px] text-gray-500 mt-2",
                    isXpTheme
                      ? "font-['Pixelated_MS_Sans_Serif',Arial]"
                      : "font-geneva-12"
                  )}
                  style={{
                    fontFamily: isXpTheme
                      ? '"Pixelated MS Sans Serif", Arial'
                      : undefined,
                  }}
                >
                  © Ryo Lu. 1992-{new Date().getFullYear()}
                </div>
              </div>
            </div>
          </div>
          <hr className="border-gray-300" />

          {/* Memory usage bars */}
          <div
            className={cn(
              "space-y-2 p-2 px-4 pb-4",
              isXpTheme
                ? "font-['Pixelated_MS_Sans_Serif',Arial] text-[10px]"
                : "font-geneva-12 text-[10px]"
            )}
            style={{
              fontFamily: isXpTheme
                ? '"Pixelated MS Sans Serif", Arial'
                : undefined,
              fontSize: isXpTheme ? "10px" : undefined,
            }}
          >
            {memoryUsage.map((app, index) => (
              <div className="flex flex-row gap-1" key={index}>
                <div className="flex justify-between w-full">
                  <div className="w-1/2 truncate">{app.name}</div>
                  <div className="w-1/3">{app.memoryMB.toFixed(1)} MB</div>
                </div>
                <div className="h-2 bg-gray-200 w-full ">
                  <div
                    className="h-full bg-blue-500 transition-all duration-200"
                    style={{ width: `${app.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (isXpTheme) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "p-0 overflow-hidden max-w-[400px] border-0", // Remove border but keep box-shadow
            currentTheme === "xp" ? "window" : "window" // Use window class for both themes
          )}
          style={{
            fontSize: "11px",
          }}
        >
          <div
            className="title-bar"
            style={currentTheme === "xp" ? { minHeight: "30px" } : undefined}
          >
            <div className="title-bar-text">About This Computer</div>
            <div className="title-bar-controls">
              <button aria-label="Close" onClick={() => onOpenChange(false)} />
            </div>
          </div>
          <div className="window-body">{dialogContent}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-os-window-bg border-[length:var(--os-metrics-border-width)] border-os-window rounded-os shadow-os-window max-w-[400px] focus:outline-none">
        <DialogHeader>
          <DialogTitle className="font-normal text-[16px]">
            About This Computer
          </DialogTitle>
          <DialogDescription className="sr-only">
            Information about ryOS on this computer
          </DialogDescription>
        </DialogHeader>
        {dialogContent}
      </DialogContent>
    </Dialog>
  );
}
