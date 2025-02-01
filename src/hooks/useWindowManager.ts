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
  const [windowPosition, setWindowPosition] = useState<WindowPosition>(
    initialState.position
  );
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
      if (isMobile) return; // Disable resizing on mobile

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

        if (isMobile) {
          // On mobile, only allow vertical dragging and keep window full width
          setWindowPosition({ x: 0, y: Math.max(0, newY) });
        } else {
          const maxX = window.innerWidth - windowSize.width;
          const maxY = window.innerHeight - windowSize.height;
          const x = Math.min(Math.max(0, newX), maxX);
          const y = Math.min(Math.max(0, newY), maxY);
          setWindowPosition({ x, y });
        }
      }

      if (resizeType && !isMobile) {
        e.preventDefault();
        const clientX =
          "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const clientY =
          "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
        const deltaX = clientX - resizeStart.x;
        const deltaY = clientY - resizeStart.y;
        const minWidth = 260;
        const minHeight = 400;
        const maxWidth = window.innerWidth - 32;
        const maxHeight = window.innerHeight - 32;

        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        let newLeft = resizeStart.left;
        let newTop = resizeStart.top;

        if (resizeType.includes("e")) {
          newWidth = Math.min(
            Math.max(resizeStart.width + deltaX, minWidth),
            maxWidth
          );
        } else if (resizeType.includes("w")) {
          const potentialWidth = Math.min(
            Math.max(resizeStart.width - deltaX, minWidth),
            maxWidth
          );
          if (potentialWidth !== resizeStart.width) {
            newLeft = resizeStart.left + (resizeStart.width - potentialWidth);
            newWidth = potentialWidth;
          }
        }

        if (resizeType.includes("s")) {
          newHeight = Math.min(
            Math.max(resizeStart.height + deltaY, minHeight),
            maxHeight
          );
        } else if (resizeType.includes("n")) {
          const potentialHeight = Math.min(
            Math.max(resizeStart.height - deltaY, minHeight),
            maxHeight
          );
          if (potentialHeight !== resizeStart.height) {
            newTop = resizeStart.top + (resizeStart.height - potentialHeight);
            newHeight = potentialHeight;
          }
        }

        setWindowSize({ width: newWidth, height: newHeight });
        setWindowPosition({ x: newLeft, y: newTop });
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
