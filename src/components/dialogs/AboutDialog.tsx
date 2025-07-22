import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useThemeStore } from "@/stores/useThemeStore";
import { cn } from "@/lib/utils";

interface AboutDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  metadata: {
    name: string;
    version: string;
    creator: {
      name: string;
      url: string;
    };
    github: string;
    icon: string;
  };
}

export function AboutDialog({
  isOpen,
  onOpenChange,
  metadata,
}: AboutDialogProps) {
  const currentTheme = useThemeStore((state) => state.current);
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";

  const dialogContent = (
    <div className="flex flex-col items-center justify-center space-y-4 py-4">
      <div>
        <img
          src={metadata.icon}
          alt="App Icon"
          className="w-12 h-12 mx-auto [image-rendering:pixelated]"
        />
      </div>
      <div
        className={cn(
          "space-y-0 text-center",
          isXpTheme
            ? "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
            : "font-geneva-12 text-[10px]"
        )}
        style={{
          fontFamily: isXpTheme
            ? '"Pixelated MS Sans Serif", Arial'
            : undefined,
          fontSize: isXpTheme ? "11px" : undefined,
        }}
      >
        <div
          className={cn(
            "text-2xl font-medium",
            isXpTheme
              ? "font-['Pixelated_MS_Sans_Serif',Arial]"
              : "font-apple-garamond"
          )}
        >
          {metadata.name}
        </div>
        <p className="text-gray-500">Version {metadata.version}</p>
        <p>
          Made by{" "}
          <a
            href={metadata.creator.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            {metadata.creator.name}
          </a>
        </p>
        <p>
          <a
            href={metadata.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            Open in GitHub
          </a>
        </p>
      </div>
    </div>
  );

  if (isXpTheme) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "p-0 overflow-hidden max-w-[240px] border-0", // Remove border but keep box-shadow
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
            <div className="title-bar-text">About</div>
            <div className="title-bar-controls">
              <button aria-label="Close" onClick={() => onOpenChange(false)} />
            </div>
          </div>
          <div className={`window-body ${isXpTheme ? "p-2 px-4" : "p-4"}`}>
            {dialogContent}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-os-window-bg border-[length:var(--os-metrics-border-width)] border-os-window rounded-os shadow-os-window max-w-[280px]">
        <DialogHeader>
          <DialogTitle className="font-normal text-[16px]">About</DialogTitle>
          <DialogDescription className="sr-only">
            Information about the application
          </DialogDescription>
        </DialogHeader>
        {dialogContent}
      </DialogContent>
    </Dialog>
  );
}
