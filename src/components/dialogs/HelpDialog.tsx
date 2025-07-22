import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useThemeStore } from "@/stores/useThemeStore";
import { cn } from "@/lib/utils";

interface HelpCardProps {
  icon: string;
  title: string;
  description: string;
}

function HelpCard({ icon, title, description }: HelpCardProps) {
  const currentTheme = useThemeStore((state) => state.current);
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";

  return (
    <div className="p-4 bg-black/5 rounded-os transition-colors">
      <div className="text-xl">{icon}</div>
      <h3
        className={cn(
          "font-medium",
          isXpTheme
            ? "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
            : "font-medium"
        )}
        style={{
          fontFamily: isXpTheme
            ? '"Pixelated MS Sans Serif", Arial'
            : undefined,
          fontSize: isXpTheme ? "11px" : undefined,
        }}
      >
        {title}
      </h3>
      <p
        className={cn(
          "text-gray-700",
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
        {description}
      </p>
    </div>
  );
}

interface HelpDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  helpItems: HelpCardProps[];
  appName: string;
}

export function HelpDialog({
  isOpen,
  onOpenChange,
  helpItems = [],
  appName,
}: HelpDialogProps) {
  const currentTheme = useThemeStore((state) => state.current);
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";

  const dialogContent = (
    <div className={isXpTheme ? "p-2 px-4" : "p-6 pt-2"}>
      <p
        className={cn(
          "text-2xl mb-4",
          isXpTheme
            ? "font-['Pixelated_MS_Sans_Serif',Arial]"
            : "font-apple-garamond"
        )}
        style={{
          fontFamily: isXpTheme
            ? '"Pixelated MS Sans Serif", Arial'
            : undefined,
          fontSize: isXpTheme ? "18px" : undefined,
        }}
      >
        Welcome to {appName}
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {helpItems.map((item) => (
          <HelpCard key={item.title} {...item} />
        ))}
      </div>
    </div>
  );

  if (isXpTheme) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "p-0 overflow-hidden max-w-[600px] border-0", // Remove border but keep box-shadow
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
            <div className="title-bar-text">Help</div>
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
      <DialogContent className="bg-os-window-bg border-[length:var(--os-metrics-border-width)] border-os-window rounded-os shadow-os-window max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-normal text-[16px]">Help</DialogTitle>
          <DialogDescription className="sr-only">
            Help and documentation for {appName}
          </DialogDescription>
        </DialogHeader>
        {dialogContent}
      </DialogContent>
    </Dialog>
  );
}
