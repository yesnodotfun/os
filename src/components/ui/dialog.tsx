import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { useSound, Sounds } from "@/hooks/useSound";
import { useVibration } from "@/hooks/useVibration";
import { useThemeStore } from "@/stores/useThemeStore";
import { getTheme } from "@/themes";

const Dialog = ({ children, onOpenChange, ...props }: DialogPrimitive.DialogProps) => {
  const { play: playWindowOpen } = useSound(Sounds.WINDOW_OPEN);
  const { play: playWindowClose } = useSound(Sounds.WINDOW_CLOSE);
  const vibrateClose = useVibration(50, 50);

  // Flag to prevent double-playing the open sound when `onOpenChange`
  // also triggers after programmatically opening the dialog
  const skipOpenEffectRef = React.useRef(false);

  // Play open sound if the dialog is mounted with `open` already true or if
  // `open` is changed programmatically without triggering `onOpenChange`.
  React.useEffect(() => {
    if (props.open && !skipOpenEffectRef.current) {
      playWindowOpen();
    }
    // Reset the flag so subsequent `open` changes trigger the effect again
    skipOpenEffectRef.current = false;
  }, [props.open, playWindowOpen]);

  return (
    <DialogPrimitive.Root
      {...props}
      onOpenChange={(open) => {
        if (open) {
          playWindowOpen();
          // Prevent the effect from replaying the sound for this change
          skipOpenEffectRef.current = true;
        } else {
          vibrateClose();
          playWindowClose();
        }
        onOpenChange?.(open);
      }}
    >
      {children}
    </DialogPrimitive.Root>
  );
};
Dialog.displayName = DialogPrimitive.Root.displayName;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const currentTheme = useThemeStore((state) => state.current);
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";
  const isMacOsxTheme = currentTheme === "macosx";

  // Function to clean up pointer-events
  const cleanupPointerEvents = React.useCallback(() => {
    // Use RAF to ensure this runs after animations complete
    requestAnimationFrame(() => {
      document.body.style.removeProperty("pointer-events");
    });
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => cleanupPointerEvents();
  }, [cleanupPointerEvents]);

  const getDialogContentClasses = () => {
    if (isXpTheme) {
      return cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 origin-center",
        "window", // Use xp.css window class
        className
      );
    }

    if (isMacOsxTheme) {
      return cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 origin-center",
        "bg-os-window-bg border-[length:var(--os-metrics-border-width)] border-os-window shadow-os-window macosx-dialog",
        className
      );
    }

    // Default System 7 style
    return cn(
      "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 origin-center",
      "bg-os-window-bg border-[length:var(--os-metrics-border-width)] border-os-window shadow-os-window",
      className
    );
  };

  return (
    <DialogPortal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        ref={ref}
        className={getDialogContentClasses()}
        style={
          isMacOsxTheme
            ? {
                backgroundImage: `var(--os-pinstripe-window), var(--os-color-window-bg)`,
              }
            : undefined
        }
        onEscapeKeyDown={cleanupPointerEvents}
        onPointerDownOutside={cleanupPointerEvents}
        onCloseAutoFocus={cleanupPointerEvents}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const currentTheme = useThemeStore((state) => state.current);
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";
  const isMacOsxTheme = currentTheme === "macosx";

  if (isXpTheme) {
    return (
      <div
        className={cn(
          "title-bar",
          className
        )}
        style={currentTheme === "xp" ? { minHeight: "30px" } : undefined}
        {...props}
      >
        <div className="title-bar-text">{children}</div>
        <div className="title-bar-controls">
          <DialogPrimitive.Close asChild>
            <button aria-label="Close" />
          </DialogPrimitive.Close>
        </div>
      </div>
    );
  }

  if (isMacOsxTheme) {
    const theme = getTheme(currentTheme);
    return (
      <div
        className={cn(
          "flex items-center shrink-0 h-6 min-h-[1.25rem] mx-0 mb-0 px-[0.1rem] py-[0.1rem] select-none cursor-move user-select-none z-50 draggable-area macosx-dialog-header",
          className
        )}
        style={{
          background: theme.colors.titleBar.activeBg,
          borderBottom: `1px solid ${theme.colors.titleBar.borderBottom || theme.colors.titleBar.border || "rgba(0, 0, 0, 0.1)"}`,
        }}
        {...props}
      >
        {/* Traffic Light Buttons */}
        <div className="flex items-center gap-1.5 ml-1.5">
          {/* Close Button (Red) */}
          <DialogPrimitive.Close asChild>
            <button
              className="w-3 h-3 rounded-full relative transition-all duration-150 hover:brightness-110 active:brightness-90"
              style={{
                background: theme.colors.trafficLights?.close || "rgba(255, 96, 87, 1)",
                border: `1px solid ${theme.colors.trafficLights?.closeHover || "rgba(225, 70, 64, 1)"}`,
              }}
              aria-label="Close"
            />
          </DialogPrimitive.Close>
          {/* Minimize Button (Yellow) */}
          <button
            className="w-3 h-3 rounded-full relative transition-all duration-150 hover:brightness-110 active:brightness-90"
            style={{
              background: theme.colors.trafficLights?.minimize || "rgba(255, 189, 46, 1)",
              border: `1px solid ${theme.colors.trafficLights?.minimizeHover || "rgba(223, 161, 35, 1)"}`,
            }}
            aria-label="Minimize"
          />
          {/* Maximize Button (Green) */}
          <button
            className="w-3 h-3 rounded-full relative transition-all duration-150 hover:brightness-110 active:brightness-90"
            style={{
              background: theme.colors.trafficLights?.maximize || "rgba(39, 201, 63, 1)",
              border: `1px solid ${theme.colors.trafficLights?.maximizeHover || "rgba(29, 173, 43, 1)"}`,
            }}
            aria-label="Maximize"
          />
        </div>

        {/* Title */}
        <span
          className="select-none mx-auto px-2 py-0 h-full flex items-center whitespace-nowrap overflow-hidden text-ellipsis max-w-[80%] text-[12px] text-os-titlebar-active-text"
          style={{
            textShadow: "0 1px 0 rgba(255, 255, 255, 0.5)",
          }}
        >
          <span className="truncate">{children}</span>
        </span>

        {/* Spacer to balance the traffic lights */}
        <div className="mr-2 w-12 h-4" />
      </div>
    );
  }

  // Default System 7 style
  return (
    <div
      className={cn(
        "flex items-center shrink-0 h-os-titlebar min-h-[1.5rem] mx-0 my-[0.1rem] mb-0 px-[0.1rem] py-[0.2rem] select-none cursor-move border-b-[1.5px] user-select-none z-50 draggable-area bg-os-titlebar-active-bg bg-os-titlebar-pattern bg-clip-content bg-[length:6.6666666667%_13.3333333333%] border-b-os-window",
        className
      )}
      {...props}
    >
      <DialogPrimitive.Close asChild>
        <div className="relative ml-2 w-4 h-4 cursor-default select-none">
          <div className="absolute inset-0 -m-2" />
          <div className="w-4 h-4 bg-os-button-face shadow-[0_0_0_1px_var(--os-color-button-face)] border-2 border-os-window hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center" />
        </div>
      </DialogPrimitive.Close>
      <div className="select-none mx-auto bg-os-button-face px-2 py-0 h-full flex items-center justify-center text-os-titlebar-active-text">
        {children}
      </div>
      <div className="mr-2 w-4 h-4" />
    </div>
  );
};
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
