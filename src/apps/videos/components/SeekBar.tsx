import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SeekBarProps {
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  isPlaying: boolean;
  isHovered?: boolean;
  onDragChange?: (isDragging: boolean, seekTime?: number) => void;
}

export function SeekBar({
  duration,
  currentTime,
  onSeek,
  isPlaying,
  isHovered: parentHovered,
  onDragChange,
}: SeekBarProps) {
  const [isLocalHovered, setIsLocalHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const seekBarRef = useRef<HTMLDivElement>(null);

  // Calculate progress percentage
  const progress = (currentTime / duration) * 100;

  // Update seek position when current time changes
  useEffect(() => {
    if (!isDragging) {
      setSeekPosition(progress);
    }
  }, [currentTime, duration, isDragging, progress]);

  // Handle mouse movement on seek bar
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!seekBarRef.current) return;
    const rect = seekBarRef.current.getBoundingClientRect();
    const position = ((e.clientX - rect.left) / rect.width) * 100;
    const clampedPosition = Math.max(0, Math.min(100, position));
    setSeekPosition(clampedPosition);
  };

  // Handle mouse down on seek bar
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent click from reaching the play/pause overlay
    setIsDragging(true);
    handleMouseMove(e);
    const rect = seekBarRef.current?.getBoundingClientRect();
    if (rect && onDragChange) {
      const position = ((e.clientX - rect.left) / rect.width) * 100;
      const clampedPosition = Math.max(0, Math.min(100, position));
      const seekTime = (clampedPosition / 100) * duration;
      onDragChange(true, seekTime);
    }
  };

  // Handle mouse up - seek to position
  const handleMouseUp = () => {
    if (isDragging) {
      onSeek((seekPosition / 100) * duration);
      setIsDragging(false);
      if (onDragChange) {
        onDragChange(false);
      }
    }
  };

  // Add global mouse up listener when dragging
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = () => {
        handleMouseUp();
      };

      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!seekBarRef.current) return;
        const rect = seekBarRef.current.getBoundingClientRect();
        const position = ((e.clientX - rect.left) / rect.width) * 100;
        const clampedPosition = Math.max(0, Math.min(100, position));
        setSeekPosition(clampedPosition);
        if (onDragChange) {
          const seekTime = (clampedPosition / 100) * duration;
          onDragChange(true, seekTime);
        }
      };

      document.addEventListener("mouseup", handleGlobalMouseUp);
      document.addEventListener("mousemove", handleGlobalMouseMove);

      return () => {
        document.removeEventListener("mouseup", handleGlobalMouseUp);
        document.removeEventListener("mousemove", handleGlobalMouseMove);
      };
    }
  }, [isDragging, duration, onSeek]);

  // Format time for display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const isVisible =
    isPlaying && (parentHovered || isLocalHovered || isDragging);

  if (!isPlaying) return null;

  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent h-48 pointer-events-none"
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: isVisible ? 1 : 0,
        y: isVisible ? 0 : 20,
      }}
      transition={{
        duration: 0.2,
        ease: "easeOut",
      }}
      onMouseEnter={() => setIsLocalHovered(true)}
      onMouseLeave={() => setIsLocalHovered(false)}
    >
      <div className="absolute bottom-0 left-0 right-0 px-4 py-3">
        {/* Seek bar */}
        <div
          ref={seekBarRef}
          className={`relative h-[8px] rounded-full cursor-pointer pointer-events-auto overflow-hidden transition-all duration-150 ${
            isDragging
              ? "border border-white/80 bg-white/25"
              : "border border-white/50 bg-white/15"
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={!isDragging ? handleMouseMove : undefined}
        >
          {/* Progress bar */}
          <div
            className={`absolute left-0 top-0 h-full transition-colors duration-150 ${
              isDragging ? "bg-white/80" : "bg-white/50"
            }`}
            style={{ width: `${isDragging ? seekPosition : progress}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
}
