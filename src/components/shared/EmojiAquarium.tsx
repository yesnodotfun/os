import { useMemo, useLayoutEffect, useRef, useState, useEffect } from "react";
import { motion, MotionConfig } from "framer-motion";
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
  // Create a stable seed once so re-renders (e.g., hover) don't change layout.
  const seedRef = useRef<string | undefined>(seed);
  if (seedRef.current === undefined) {
    seedRef.current = Math.floor(Math.random() * 2 ** 31).toString();
  }
  // If a seed prop is provided later, allow switching to it.
  useEffect(() => {
    if (seed && seed !== seedRef.current) {
      seedRef.current = seed;
    }
  }, [seed]);

  const rand = useSeededRandom(seedRef.current);

  // Responsive: fill the container width and compute height via aspect ratio.
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(420);
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth || 420);
    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const aspect = 236 / 420; // ~16:9
  const width = containerWidth;
  const height = Math.max(120, Math.round(containerWidth * aspect));
  // Scale sand height with container for a larger, responsive base
  const sandHeight = Math.max(24, Math.round(height * 0.35));

  const { fishCount, jellyCount, bubbleCount, floorCount } = useMemo(() => {
    return { fishCount: 6, jellyCount: 3, bubbleCount: 4, floorCount: 7 };
  }, []);

  const largeCount = Math.max(1, Math.floor(fishCount / 3));
  const smallCount = Math.max(0, fishCount - largeCount);

  const smallFishes = ["🐟", "🐠", "🐡"];
  const largeFishes = ["🦈", "🐬"];
  const decor = ["🪸", "⚓️", "🪨", "🌿", "🗿", "🐚"];

  const bubbles = "🫧"; // falls back to monochrome when unsupported

  return (
    <MotionConfig reducedMotion="never">
      <div
        className={cn(
          "chat-bubble bg-blue-300 text-black !p-0 mb-2 w-full max-w-[420px] rounded",
          className
        )}
      >
        <div
          ref={containerRef}
          className={cn("relative z-0 overflow-hidden rounded")}
          style={{ width: "100%", height }}
        >
          {/* small fish */}
          {Array.from({ length: smallCount }).map((_, i) => {
            const emoji = smallFishes[Math.floor(rand() * smallFishes.length)];
            const dirRight = rand() > 0.5;
            const sizePx = 24;
            const y = 20 + rand() * (height - 80);
            const duration = 14 + rand() * 16;
            const delay = rand() * 4;
            const xFrom = dirRight ? -60 : width + 60;
            const xTo = dirRight ? width + 60 : -60;
            const wiggle = 6 + rand() * 8;
            return (
              <motion.span
                key={`fish-small-${i}`}
                initial={{ x: xFrom, y }}
                animate={{
                  x: [xFrom, xTo],
                  y: [y, y - wiggle, y, y + wiggle, y],
                }}
                transition={{
                  x: {
                    duration,
                    ease: "linear",
                    repeat: Infinity,
                    repeatType: "loop",
                    delay,
                  },
                  y: {
                    duration: duration / 2,
                    repeat: Infinity,
                    repeatType: "mirror",
                    ease: "easeInOut",
                  },
                }}
                style={{ position: "absolute", willChange: "transform" }}
                className="select-none z-30"
              >
                <span
                  style={{
                    display: "inline-block",
                    transform: dirRight ? "scaleX(-1)" : undefined,
                    fontSize: `${sizePx}px`,
                  }}
                >
                  {emoji}
                </span>
              </motion.span>
            );
          })}

          {/* large fish */}
          {Array.from({ length: largeCount }).map((_, i) => {
            const emoji = largeFishes[Math.floor(rand() * largeFishes.length)];
            const dirRight = rand() > 0.5;
            const sizePx = 40;
            const safeZone = height - sandHeight - 20;
            const y = 20 + rand() * Math.max(40, safeZone);
            const duration = 18 + rand() * 18;
            const delay = rand() * 4;
            const xFrom = dirRight ? -80 : width + 80;
            const xTo = dirRight ? width + 80 : -80;
            const wiggle = 8 + rand() * 10;
            return (
              <motion.span
                key={`fish-large-${i}`}
                initial={{ x: xFrom, y }}
                animate={{
                  x: [xFrom, xTo],
                  y: [y, y - wiggle, y, y + wiggle, y],
                }}
                transition={{
                  x: {
                    duration,
                    ease: "linear",
                    repeat: Infinity,
                    repeatType: "loop",
                    delay,
                  },
                  y: {
                    duration: duration / 2,
                    repeat: Infinity,
                    repeatType: "mirror",
                    ease: "easeInOut",
                  },
                }}
                style={{ position: "absolute", willChange: "transform" }}
                className="select-none z-30"
              >
                <span
                  style={{
                    display: "inline-block",
                    transform: dirRight ? "scaleX(-1)" : undefined,
                    fontSize: `${sizePx}px`,
                  }}
                >
                  {emoji}
                </span>
              </motion.span>
            );
          })}

          {/* jellyfish drifting */}
          {Array.from({ length: jellyCount }).map((_, i) => {
            const x = 40 + rand() * (width - 80);
            const startY = 20 + rand() * (height * 0.45);
            const float = 18 + rand() * 10;
            const delay = rand() * 3;
            const xDrift = 14 + rand() * 24;
            return (
              <motion.span
                key={`jelly-${i}`}
                initial={{ x, y: startY }}
                animate={{
                  x: [x - xDrift, x + xDrift, x - xDrift],
                  y: [startY, startY + 18, startY],
                  opacity: [0.85, 1, 0.85],
                }}
                transition={{
                  duration: float,
                  repeat: Infinity,
                  delay,
                  ease: "easeInOut",
                  x: {
                    duration: float * 1.4,
                    repeat: Infinity,
                    repeatType: "mirror",
                    ease: "easeInOut",
                    delay,
                  },
                }}
                style={{
                  position: "absolute",
                  willChange: "transform, opacity",
                }}
                className="text-[24px] select-none z-20"
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
            const dur = 15 + rand() * 18;
            const delay = rand() * 6;
            return (
              <motion.span
                key={`bubble-${i}`}
                initial={{ x, y: height - start, opacity: 0, scale: 0.4 }}
                animate={{
                  x: [x, x + drift],
                  y: [height - start, -25],
                  opacity: [0, 0.3, 0.7, 0.4, 0],
                  scale: [0.4, 0.8, 1.2, 1, 0.6],
                }}
                transition={{
                  duration: dur,
                  ease: "easeOut",
                  repeat: Infinity,
                  delay,
                }}
                style={{
                  position: "absolute",
                  willChange: "transform, opacity",
                }}
                className="text-[28px] select-none z-10"
              >
                {bubbles}
              </motion.span>
            );
          })}

          {/* sand base */}
          <div
            className="absolute left-0 right-0 bottom-0 z-0 bg-gradient-to-t from-yellow-200/90 via-yellow-100/50 to-transparent"
            style={{ height: sandHeight }}
          />

          {/* floor decorations */}
          {Array.from({ length: floorCount }).map((_, i) => {
            const emoji = decor[Math.floor(rand() * decor.length)];
            const x = 8 + rand() * (width - 16);
            const delay = 0.2 + i * 0.07 + rand() * 0.2;
            const rot = (rand() - 0.5) * 10;
            const size = 18 + rand() * 8;
            const bottomOffset = 8 + rand() * 4; // place items a few px from bottom edge
            const yPos = Math.max(0, height - size - bottomOffset);
            return (
              <motion.span
                key={`floor-${i}`}
                initial={{ x, y: -20, opacity: 0, rotate: rot }}
                animate={{ x, y: yPos, opacity: 1, rotate: rot }}
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: 20,
                  delay,
                }}
                style={{ position: "absolute" }}
                className="select-none z-0"
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
            className="absolute right-4 top-1.5 select-none text-[24px]"
          >
            🛟
          </motion.span>
        </div>
      </div>
    </MotionConfig>
  );
}

export default EmojiAquarium;
