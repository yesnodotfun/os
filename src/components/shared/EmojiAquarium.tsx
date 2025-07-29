import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type AquariumSize = "small" | "medium" | "large";
type AquariumDensity = "calm" | "default" | "crowded";

interface EmojiAquariumProps {
  size?: AquariumSize;
  density?: AquariumDensity;
  seed?: string;
  className?: string;
}

function useSeededRandom(seed?: string) {
  // Mulberry32 PRNG
  let a = 0;
  if (seed && seed.length > 0) {
    for (let i = 0; i < seed.length; i++) a = (a + seed.charCodeAt(i)) | 0;
  } else {
    a = Math.floor(Math.random() * 2 ** 31);
  }
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function EmojiAquarium({ seed, className }: EmojiAquariumProps) {
  const rand = useSeededRandom(seed);

  const { width, height, fishCount, jellyCount, bubbleCount, floorCount } =
    useMemo(() => {
      // Match LinkPreview typical full-width thumbnail: aspect-video within max width 420.
      // We'll pick 420x236 approximation.
      const s = { w: 420, h: 236 };
      const d = { fish: 7, jelly: 2, bubbles: 18, floor: 9 };
      return {
        width: s.w,
        height: s.h,
        fishCount: d.fish,
        jellyCount: d.jelly,
        bubbleCount: d.bubbles,
        floorCount: d.floor,
      };
    }, []);

  const fishes = ["🐟", "🐠", "🐡", "🦈", "🐬"];
  const decor = ["🪸", "⚓️", "🏺", "🪨", "🌿", "🗿", "🐚", "🦑", "🍃"];

  const bubbles = "🫧"; // falls back to monochrome when unsupported

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded bg-gradient-to-b from-sky-200 to-sky-300",
        "border border-black/10",
        className
      )}
      style={{ width, height }}
    >
      {/* subtle gloss */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-2 right-2 top-2 h-6 rounded-[12px] bg-white/30 blur-[1px]" />
      </div>

      {/* swimming fish */}
      {Array.from({ length: fishCount }).map((_, i) => {
        const emoji = fishes[Math.floor(rand() * fishes.length)];
        const dirRight = rand() > 0.5;
        const scale = 0.9 + rand() * 0.6;
        const y = 20 + rand() * (height - 80);
        const duration = 14 + rand() * 16;
        const delay = rand() * 4;
        const xFrom = dirRight ? -60 : width + 60;
        const xTo = dirRight ? width + 60 : -60;
        const wiggle = 6 + rand() * 8;
        return (
          <motion.span
            key={`fish-${i}`}
            initial={{ x: xFrom, y, scale, rotateY: dirRight ? 0 : 180 }}
            animate={{
              x: xTo,
              y: [y, y - wiggle, y, y + wiggle, y],
            }}
            transition={{
              x: { duration, ease: "linear", repeat: Infinity, delay },
              y: {
                duration: duration / 2,
                repeat: Infinity,
                ease: "easeInOut",
              },
            }}
            style={{ position: "absolute" }}
            className="text-[20px] select-none"
          >
            {emoji}
          </motion.span>
        );
      })}

      {/* jellyfish drifting */}
      {Array.from({ length: jellyCount }).map((_, i) => {
        const x = 40 + rand() * (width - 80);
        const startY = 20 + rand() * (height * 0.45);
        const float = 18 + rand() * 10;
        const delay = rand() * 3;
        return (
          <motion.span
            key={`jelly-${i}`}
            initial={{ x, y: startY }}
            animate={{
              y: [startY, startY + 18, startY],
              opacity: [0.85, 1, 0.85],
            }}
            transition={{
              duration: float,
              repeat: Infinity,
              delay,
              ease: "easeInOut",
            }}
            style={{ position: "absolute" }}
            className="text-[22px] select-none"
          >
            {"🪼"}
          </motion.span>
        );
      })}

      {/* bubbles rising */}
      {Array.from({ length: bubbleCount }).map((_, i) => {
        const x = 10 + rand() * (width - 20);
        const start = rand() * (height * 0.65);
        const drift = (rand() - 0.5) * 20;
        const dur = 10 + rand() * 12;
        const delay = rand() * 4;
        return (
          <motion.span
            key={`bubble-${i}`}
            initial={{ x, y: height - start, opacity: 0.4 }}
            animate={{ x: x + drift, y: -20, opacity: [0.4, 0.9, 0.4] }}
            transition={{
              duration: dur,
              ease: "easeOut",
              repeat: Infinity,
              delay,
            }}
            style={{ position: "absolute" }}
            className="text-[16px] select-none"
          >
            {bubbles}
          </motion.span>
        );
      })}

      {/* sand base */}
      <div className="absolute left-0 right-0 bottom-0 h-8 bg-gradient-to-t from-yellow-200/80 to-transparent" />

      {/* floor decorations */}
      {Array.from({ length: floorCount }).map((_, i) => {
        const emoji = decor[Math.floor(rand() * decor.length)];
        const x = 8 + rand() * (width - 16);
        const delay = 0.2 + i * 0.07 + rand() * 0.2;
        const rot = (rand() - 0.5) * 10;
        const size = 18 + rand() * 6;
        return (
          <motion.span
            key={`floor-${i}`}
            initial={{ x, y: -20, opacity: 0, rotate: rot }}
            animate={{ x, y: height - 22, opacity: 1, rotate: rot }}
            transition={{ type: "spring", stiffness: 380, damping: 20, delay }}
            style={{ position: "absolute" }}
            className="select-none"
          >
            <span style={{ fontSize: `${size}px` }}>{emoji}</span>
          </motion.span>
        );
      })}

      {/* life ring at corner */}
      <motion.span
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="absolute right-1.5 top-1.5 select-none text-[18px]"
      >
        🛟
      </motion.span>
    </div>
  );
}

export default EmojiAquarium;
