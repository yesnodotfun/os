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

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  }, []);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, type: ResizeType) => {
      e.stopPropagation();
      e.preventDefault();
      const rect = (
        e.currentTarget.parentElement as HTMLElement
      ).getBoundingClientRect();
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: rect.width,
        height: rect.height,
        left: windowPosition.x,
        top: windowPosition.y,
      });
      setResizeType(type);
    },
    [windowPosition]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        const maxX = window.innerWidth - windowSize.width;
        const maxY = window.innerHeight - windowSize.height;
        const x = Math.min(Math.max(0, newX), maxX);
        const y = Math.min(Math.max(0, newY), maxY);
        setWindowPosition({ x, y });
      }

      if (resizeType) {
        e.preventDefault();
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
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

    const handleMouseUp = () => {
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
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDragging,
    dragOffset,
    resizeType,
    resizeStart,
    windowPosition,
    windowSize,
    appId,
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
