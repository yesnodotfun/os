import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRef, useEffect } from "react";
import { useSound, Sounds } from "@/hooks/useSound";
import { useThemeStore } from "@/stores/useThemeStore";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
}

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  title,
  description,
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const { play: playAlertSound } = useSound(Sounds.ALERT_SOSUMI);
  const currentTheme = useThemeStore((state) => state.current);
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";

  // Play sound when dialog opens
  useEffect(() => {
    if (isOpen) {
      playAlertSound();
    }
  }, [isOpen, playAlertSound]);

  const dialogContent = (
    <div className={isXpTheme ? "p-2 px-4" : "p-4 px-6"}>
      <div className="flex gap-3 items-start">
        <img
          src="/icons/warn.png"
          alt="Warning"
          className="w-[32px] h-[32px] mt-0.5 [image-rendering:pixelated]"
          width={32}
          height={32}
        />
        <p
          className={cn(
            "text-gray-900 mb-2 leading-tight",
            isXpTheme
              ? "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
              : "font-geneva-12 text-[12px]"
          )}
          style={{
            fontFamily: isXpTheme
              ? '"Pixelated MS Sans Serif", Arial'
              : undefined,
            fontSize: isXpTheme ? "11px" : undefined,
          }}
        >
          {description}
        </p>
      </div>
      <DialogFooter className="mt-4 gap-1">
        <Button 
          variant="retro" 
          onClick={() => onOpenChange(false)}
          className={cn(
            "h-7",
            isXpTheme
              ? "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
              : "font-geneva-12 text-[12px]"
          )}
          style={{
            fontFamily: isXpTheme
              ? '"Pixelated MS Sans Serif", Arial'
              : undefined,
            fontSize: isXpTheme ? "11px" : undefined,
          }}
        >
          Cancel
        </Button>
        <Button 
          variant="retro" 
          onClick={onConfirm} 
          ref={confirmButtonRef}
          className={cn(
            "h-7",
            isXpTheme
              ? "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
              : "font-geneva-12 text-[12px]"
          )}
          style={{
            fontFamily: isXpTheme
              ? '"Pixelated MS Sans Serif", Arial'
              : undefined,
            fontSize: isXpTheme ? "11px" : undefined,
          }}
        >
          Confirm
        </Button>
      </DialogFooter>
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
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            confirmButtonRef.current?.focus();
          }}
        >
          <div
            className="title-bar"
            style={currentTheme === "xp" ? { minHeight: "30px" } : undefined}
          >
            <div className="title-bar-text">{title}</div>
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
      <DialogContent
        className="bg-os-window-bg border-[length:var(--os-metrics-border-width)] border-os-window rounded-os shadow-os-window"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          confirmButtonRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-normal text-[16px]">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            {description}
          </DialogDescription>
        </DialogHeader>
        {dialogContent}
      </DialogContent>
    </Dialog>
  );
}
