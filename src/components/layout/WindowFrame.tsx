import { useWindowManager } from "@/hooks/useWindowManager";
import { ResizeType } from "@/types/types";
import { APP_STORAGE_KEYS } from "@/utils/storage";
import { useAppContext } from "@/contexts/AppContext";
import { useSound, Sounds } from "@/hooks/useSound";
import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { getWindowConfig } from "@/config/appRegistry";

interface WindowFrameProps {
  children: React.ReactNode;
  title: string;
  onClose?: () => void;
  isForeground?: boolean;
  appId: keyof typeof APP_STORAGE_KEYS;
  windowConstraints?: {
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number | string;
    maxHeight?: number | string;
  };
}

export function WindowFrame({
  children,
  title,
  onClose,
  isForeground = true,
  appId,
  windowConstraints = {},
}: WindowFrameProps) {
  const config = getWindowConfig(appId);
  const defaultConstraints = {
    minWidth: config.minSize?.width,
    minHeight: config.minSize?.height,
    maxWidth: config.maxSize?.width,
    maxHeight: config.maxSize?.height,
  };

  // Merge provided constraints with defaults from config
  const mergedConstraints = {
    ...defaultConstraints,
    ...windowConstraints,
  };

  const [isOpen, setIsOpen] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [isInitialMount, setIsInitialMount] = useState(true);
  const { bringToForeground } = useAppContext();
  const { play: playWindowOpen } = useSound(Sounds.WINDOW_OPEN);
  const { play: playWindowClose } = useSound(Sounds.WINDOW_CLOSE);
  const [isFullHeight, setIsFullHeight] = useState(false);

  useEffect(() => {
    playWindowOpen();
    // Remove initial mount state after animation
    const timer = setTimeout(() => setIsInitialMount(false), 200);
    return () => clearTimeout(timer);
  }, []); // Play sound when component mounts

  const handleTransitionEnd = useCallback(
    (e: React.TransitionEvent) => {
      if (
        e.target === e.currentTarget &&
        !isOpen &&
        e.propertyName === "opacity"
      ) {
        setIsVisible(false);
        onClose?.();
      }
    },
    [isOpen, onClose]
  );

  const handleClose = () => {
    playWindowClose();
    setIsOpen(false);
  };

  const {
    windowPosition,
    windowSize,
    isDragging,
    resizeType,
    handleMouseDown: handleMouseDownBase,
    handleResizeStart,
    maximizeWindowHeight,
    setWindowSize,
  } = useWindowManager({ appId });

  // Track window height changes
  useEffect(() => {
    const menuBarHeight = 30;
    const maxPossibleHeight = window.innerHeight - menuBarHeight;
    // Consider window at full height if it's within 5px of max height (to account for rounding)
    setIsFullHeight(Math.abs(windowSize.height - maxPossibleHeight) < 5);
  }, [windowSize.height]);

  const handleMouseDown = (
    e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>
  ) => {
    handleMouseDownBase(e);
    if (!isForeground) {
      bringToForeground(appId);
    }
  };

  const handleResizeStartWithForeground = (
    e: React.MouseEvent | React.TouchEvent,
    type: ResizeType
  ) => {
    handleResizeStart(e, type);
    if (!isForeground) {
      bringToForeground(appId);
    }
  };

  const handleDoubleClickResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFullHeight) {
      // Restore to default height using window's minHeight constraint
      setIsFullHeight(false);
      setWindowSize((prev) => ({
        ...prev,
        height: mergedConstraints.minHeight || 400,
      }));
    } else {
      // Set to full height
      setIsFullHeight(true);
      maximizeWindowHeight(mergedConstraints.maxHeight);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "absolute p-2 md:p-0 w-full h-full md:mt-0 select-none",
        "transition-all duration-200 ease-in-out",
        isInitialMount && "animate-in fade-in-0 zoom-in-95 duration-200"
      )}
      onTransitionEnd={handleTransitionEnd}
      style={{
        left: windowPosition.x,
        top: Math.max(0, windowPosition.y),
        width: window.innerWidth >= 768 ? windowSize.width : "100%",
        height: Math.max(windowSize.height, mergedConstraints.minHeight || 0),
        minWidth:
          window.innerWidth >= 768 ? mergedConstraints.minWidth : "100%",
        minHeight: mergedConstraints.minHeight,
        maxWidth: mergedConstraints.maxWidth || undefined,
        maxHeight: mergedConstraints.maxHeight || undefined,
        transition: isDragging || resizeType ? "none" : undefined,
        transform: !isInitialMount && !isOpen ? "scale(0.95)" : undefined,
        opacity: !isInitialMount && !isOpen ? 0 : undefined,
        transformOrigin: "center",
      }}
    >
      <div
        className={cn(
          "relative h-full flex flex-col bg-system7-window-bg border-[2px] border-black rounded-lg overflow-hidden",
          isForeground ? "shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]" : ""
        )}
      >
        {/* Resize handles - positioned outside main content */}
        <div className="absolute -top-4 -left-4 -right-4 -bottom-4 pointer-events-none z-50">
          {/* Top resize handle */}
          <div
            className={cn(
              "absolute left-0 right-0 cursor-n-resize pointer-events-auto transition-[top,height]",
              resizeType?.includes("n")
                ? "top-[-100px] h-[200px]"
                : "-top-4 h-10" // 64px for all screen sizes
            )}
            onMouseDown={(e) =>
              handleResizeStartWithForeground(e, "n" as ResizeType)
            }
            onTouchStart={(e) =>
              handleResizeStartWithForeground(e, "n" as ResizeType)
            }
            onDoubleClick={handleDoubleClickResize}
          />

          {/* Bottom resize handle */}
          <div
            className={cn(
              "absolute left-0 right-0 cursor-s-resize pointer-events-auto transition-[bottom,height]",
              resizeType?.includes("s")
                ? "bottom-[-100px] h-[200px]"
                : "-bottom-4 h-10" // 64px for all screen sizes
            )}
            onMouseDown={(e) =>
              handleResizeStartWithForeground(e, "s" as ResizeType)
            }
            onTouchStart={(e) =>
              handleResizeStartWithForeground(e, "s" as ResizeType)
            }
            onDoubleClick={handleDoubleClickResize}
          />

          {/* Left resize handle */}
          <div
            className={cn(
              "absolute top-8 cursor-w-resize pointer-events-auto transition-[left,width]",
              resizeType?.includes("w")
                ? "left-[-100px] w-[200px]"
                : "-left-4 w-10"
            )}
            style={{ bottom: resizeType?.includes("s") ? "32px" : "32px" }}
            onMouseDown={(e) =>
              handleResizeStartWithForeground(e, "w" as ResizeType)
            }
          />

          {/* Right resize handle */}
          <div
            className={cn(
              "absolute top-8 cursor-e-resize pointer-events-auto transition-[right,width]",
              resizeType?.includes("e")
                ? "right-[-100px] w-[200px]"
                : "-right-4 w-10"
            )}
            style={{ bottom: resizeType?.includes("s") ? "32px" : "32px" }}
            onMouseDown={(e) =>
              handleResizeStartWithForeground(e, "e" as ResizeType)
            }
          />

          {/* Corner resize handles */}
          <div
            className={cn(
              "absolute cursor-ne-resize pointer-events-auto transition-all",
              resizeType === "ne"
                ? "top-[-100px] right-[-100px] w-[200px] h-[200px]"
                : "top-0 right-0 w-8 h-8"
            )}
            onMouseDown={(e) =>
              handleResizeStartWithForeground(e, "ne" as ResizeType)
            }
          />

          <div
            className={cn(
              "absolute cursor-sw-resize pointer-events-auto transition-all",
              resizeType === "sw"
                ? "bottom-[-100px] left-[-100px] w-[200px] h-[200px]"
                : "bottom-0 left-0 w-8 h-8"
            )}
            onMouseDown={(e) =>
              handleResizeStartWithForeground(e, "sw" as ResizeType)
            }
          />

          <div
            className={cn(
              "absolute cursor-se-resize pointer-events-auto transition-all",
              resizeType === "se"
                ? "bottom-[-100px] right-[-100px] w-[200px] h-[200px]"
                : "bottom-0 right-0 w-8 h-8"
            )}
            onMouseDown={(e) =>
              handleResizeStartWithForeground(e, "se" as ResizeType)
            }
          />
        </div>

        {/* Title bar */}
        <div
          className={`flex items-center shrink-0 h-6 min-h-6 mx-0 my-[0.1rem] px-[0.1rem] py-[0.2rem] ${
            isForeground
              ? "bg-[linear-gradient(#000_50%,transparent_0)] bg-clip-content bg-[length:6.6666666667%_13.3333333333%] border-b-black"
              : "bg-white border-b-gray-400"
          } cursor-move border-b-[2px]`}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
        >
          <button
            onClick={handleClose}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className={`ml-2 w-4 h-4 bg-white border-2 border-black hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center shadow-[0_0_0_1px_white] ${
              !isForeground && "invisible"
            }`}
          />
          <span
            className={`select-none mx-auto bg-white px-2 py-0 h-full flex items-center justify-center max-w-[80%] truncate ${
              !isForeground && "text-gray-500"
            }`}
          >
            {title}
          </span>
          <div className="mr-2 w-4 h-4" />
        </div>

        {/* Content */}
        <div className="flex flex-1 min-h-0 flex-col md:flex-row">
          {children}
        </div>
      </div>
    </div>
  );
}
