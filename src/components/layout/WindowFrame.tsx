import { useWindowManager } from "@/hooks/useWindowManager";
import { ResizeType } from "@/types/types";
import { APP_STORAGE_KEYS } from "@/utils/storage";
import { useAppContext } from "@/contexts/AppContext";
import { useSound, Sounds } from "@/hooks/useSound";
import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

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
  const [isOpen, setIsOpen] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [isInitialMount, setIsInitialMount] = useState(true);
  const { bringToForeground } = useAppContext();
  const { play: playWindowOpen } = useSound(Sounds.WINDOW_OPEN);
  const { play: playWindowClose } = useSound(Sounds.WINDOW_CLOSE);

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
  } = useWindowManager({ appId });

  const handleMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    handleMouseDownBase(e);
    if (!isForeground) {
      bringToForeground(appId);
    }
  };

  const handleResizeStartWithForeground = (
    e: React.MouseEvent,
    type: ResizeType
  ) => {
    handleResizeStart(e, type);
    if (!isForeground) {
      bringToForeground(appId);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "md:absolute p-2 md:p-0 w-full h-full mt-6 md:mt-0 select-none",
        "transition-all duration-200 ease-in-out",
        isInitialMount && "animate-in fade-in-0 zoom-in-95 duration-200"
      )}
      onTransitionEnd={handleTransitionEnd}
      style={{
        left: windowPosition.x,
        top: Math.max(30, windowPosition.y),
        width: window.innerWidth >= 768 ? windowSize.width : "100%",
        height: Math.max(windowSize.height, windowConstraints.minHeight || 0),
        minWidth:
          window.innerWidth >= 768 ? windowConstraints.minWidth : "100%",
        minHeight: windowConstraints.minHeight,
        maxWidth: windowConstraints.maxWidth || undefined,
        maxHeight: windowConstraints.maxHeight || undefined,
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
        {/* Resize handles */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 left-0 right-0 h-2 cursor-n-resize pointer-events-auto"
            onMouseDown={(e) =>
              handleResizeStartWithForeground(e, "n" as ResizeType)
            }
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize pointer-events-auto"
            onMouseDown={(e) =>
              handleResizeStartWithForeground(e, "s" as ResizeType)
            }
          />
          <div
            className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize pointer-events-auto"
            onMouseDown={(e) =>
              handleResizeStartWithForeground(e, "w" as ResizeType)
            }
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize pointer-events-auto"
            onMouseDown={(e) =>
              handleResizeStartWithForeground(e, "e" as ResizeType)
            }
          />
          <div
            className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize pointer-events-auto"
            onMouseDown={(e) =>
              handleResizeStartWithForeground(e, "ne" as ResizeType)
            }
          />
          <div
            className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize pointer-events-auto"
            onMouseDown={(e) =>
              handleResizeStartWithForeground(e, "sw" as ResizeType)
            }
          />
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize pointer-events-auto"
            onMouseDown={(e) =>
              handleResizeStartWithForeground(e, "se" as ResizeType)
            }
          />
        </div>

        {/* Title bar */}
        <div
          className={`flex items-center shrink-0 h-6 mx-0 my-[0.1rem] px-[0.1rem] py-[0.2rem] ${
            isForeground
              ? "bg-[linear-gradient(#000_50%,transparent_0)] bg-clip-content bg-[length:6.6666666667%_13.3333333333%] border-b-black"
              : "bg-white border-b-gray-400"
          } cursor-move border-b-[2px]`}
          onMouseDown={handleMouseDown}
        >
          <button
            onClick={handleClose}
            className={`ml-2 w-4 h-4 bg-white border-2 border-black hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center shadow-[0_0_0_1px_white] ${
              !isForeground && "invisible"
            }`}
          />
          <span
            className={`select-none mx-auto bg-white px-2 py-0 h-full flex items-center justify-center ${
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
