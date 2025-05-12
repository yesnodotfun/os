import { motion } from "framer-motion";

interface PlaybackBarsProps {
  className?: string;
  color?: "white" | "black";
  /** Number of bars to render (default 5) */
  barCount?: number;
}

/**
 * Simple animated equalizer bars used to show audio playback.
 */
export function PlaybackBars({
  className = "",
  color = "white",
  barCount = 5,
}: PlaybackBarsProps) {
  const MIN_SCALE = 0.4;

  return (
    <div
      className={`flex gap-[2px] items-center justify-center h-full ${className}`}
    >
      {Array.from({ length: barCount }).map((_, index) => (
        <motion.div
          key={index}
          className={`w-[2px] rounded-full ${
            color === "white" ? "bg-white" : "bg-black"
          }`}
          initial={{ scaleY: MIN_SCALE }}
          animate={{ scaleY: [MIN_SCALE, 1, MIN_SCALE] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 0.1,
          }}
          style={{ height: 12 }}
        />
      ))}
    </div>
  );
}
