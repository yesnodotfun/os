import { useState, useEffect, useCallback } from "react";
import {
  WindowPosition,
  WindowSize,
  ResizeType,
  ResizeStart,
} from "../types/types";
import {
  loadWindowState,
  saveWindowState,
  APP_STORAGE_KEYS,
} from "../utils/storage";

interface UseWindowManagerProps {
  appId: keyof typeof APP_STORAGE_KEYS;
}

export const useWindowManager = ({ appId }: UseWindowManagerProps) => {
  const initialState = loadWindowState(appId);
  const adjustedPosition = { ...initialState.position };

  // Ensure window is visible within viewport
  if (adjustedPosition.x + initialState.size.width > window.innerWidth) {
    adjustedPosition.x = Math.max(
      0,
      window.innerWidth - initialState.size.width
    );
  }

  const [windowPosition, setWindowPosition] =
    useState<WindowPosition>(adjustedPosition);
  const [windowSize, setWindowSize] = useState<WindowSize>(initialState.size);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeType, setResizeType] = useState<ResizeType>("");
  const [resizeStart, setResizeStart] = useState<ResizeStart>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    left: 0,
    top: 0,
  });

  const isMobile = window.innerWidth < 768;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const clientX =
        "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY =
        "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

      setDragOffset({
        x: clientX - rect.left,
        y: clientY - rect.top,
      });
      setIsDragging(true);
    },
    []
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, type: ResizeType) => {
      if (isMobile && type !== "s") return; // Only allow bottom resizing on mobile

      e.stopPropagation();
      e.preventDefault();
      const rect = (
        e.currentTarget.parentElement as HTMLElement
      ).getBoundingClientRect();
      const clientX =
        "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY =
        "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

      setResizeStart({
        x: clientX,
        y: clientY,
        width: rect.width,
        height: rect.height,
        left: windowPosition.x,
        top: windowPosition.y,
      });
      setResizeType(type);
    },
    [windowPosition, isMobile]
  );

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (isDragging) {
        const clientX =
          "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const clientY =
          "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

        const newX = clientX - dragOffset.x;
        const newY = clientY - dragOffset.y;
        const menuBarHeight = 30;

        if (isMobile) {
          // On mobile, only allow vertical dragging and keep window full width
          setWindowPosition({ x: 0, y: Math.max(menuBarHeight, newY) });
        } else {
          const maxX = window.innerWidth - windowSize.width;
          const maxY = window.innerHeight - windowSize.height;
          const x = Math.min(Math.max(0, newX), maxX);
          const y = Math.min(Math.max(menuBarHeight, newY), maxY);
          setWindowPosition({ x, y });
        }
      }

      if (resizeType && (resizeType === "s" || !isMobile)) {
        e.preventDefault();
        const clientX =
          "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const clientY =
          "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
        const deltaX = clientX - resizeStart.x;
        const deltaY = clientY - resizeStart.y;
        const minWidth = 260;
        const minHeight = 400;
        const maxWidth = window.innerWidth;
        const maxHeight = window.innerHeight;
        const menuBarHeight = 30;

        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        let newLeft = resizeStart.left;
        let newTop = resizeStart.top;

        if (!isMobile) {
          if (resizeType.includes("e")) {
            const maxPossibleWidth = maxWidth - resizeStart.left;
            newWidth = Math.min(
              Math.max(resizeStart.width + deltaX, minWidth),
              maxPossibleWidth
            );
          } else if (resizeType.includes("w")) {
            const maxPossibleWidth = resizeStart.width + resizeStart.left;
            const potentialWidth = Math.min(
              Math.max(resizeStart.width - deltaX, minWidth),
              maxPossibleWidth
            );
            if (potentialWidth !== resizeStart.width) {
              newLeft = Math.max(
                0,
                resizeStart.left + (resizeStart.width - potentialWidth)
              );
              newWidth = potentialWidth;
            }
          }
        }

        if (resizeType.includes("s")) {
          const maxPossibleHeight = maxHeight - resizeStart.top;
          newHeight = Math.min(
            Math.max(resizeStart.height + deltaY, minHeight),
            maxPossibleHeight
          );
        } else if (resizeType.includes("n") && !isMobile) {
          const maxPossibleHeight =
            resizeStart.height + (resizeStart.top - menuBarHeight);
          const potentialHeight = Math.min(
            Math.max(resizeStart.height - deltaY, minHeight),
            maxPossibleHeight
          );
          if (potentialHeight !== resizeStart.height) {
            newTop = Math.max(
              menuBarHeight,
              Math.min(
                resizeStart.top + (resizeStart.height - potentialHeight),
                maxHeight - minHeight
              )
            );
            newHeight = potentialHeight;
          }
        }

        if (isMobile) {
          // Keep window full width on mobile
          newWidth = window.innerWidth;
          newLeft = 0;
        }

        setWindowSize({ width: newWidth, height: newHeight });
        setWindowPosition({ x: newLeft, y: Math.max(menuBarHeight, newTop) });
      }
    };

    const handleEnd = () => {
      if (isDragging) {
        setIsDragging(false);
        saveWindowState(appId, { position: windowPosition, size: windowSize });
      }
      if (resizeType) {
        setResizeType("");
        saveWindowState(appId, { position: windowPosition, size: windowSize });
      }
    };

    if (isDragging || resizeType) {
      // Add both mouse and touch event listeners
      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleEnd);
      document.addEventListener("touchmove", handleMove);
      document.addEventListener("touchend", handleEnd);
    }

    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [
    isDragging,
    dragOffset,
    resizeType,
    resizeStart,
    windowPosition,
    windowSize,
    appId,
    isMobile,
  ]);

  return {
    windowPosition,
    windowSize,
    isDragging,
    resizeType,
    handleMouseDown,
    handleResizeStart,
  };
};
