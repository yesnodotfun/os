import {
  LyricLine,
  LyricsAlignment,
  ChineseVariant,
  KoreanDisplay,
} from "@/types/lyrics";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";
import { Converter } from "opencc-js";
import { convert as romanize } from "hangul-romanization";
import {
  loadDefaultJapaneseParser,
  loadDefaultSimplifiedChineseParser,
} from "budoux";

interface LyricsDisplayProps {
  lines: LyricLine[];
  currentLine: number;
  isLoading: boolean;
  error?: string;
  /** Whether the overlay should be visible */
  visible?: boolean;
  alignment?: LyricsAlignment;
  chineseVariant?: ChineseVariant;
  koreanDisplay?: KoreanDisplay;
}

const ANIMATION_CONFIG = {
  spring: {
    type: "spring" as const,
    stiffness: 200,
    damping: 30,
    mass: 1,
  },
  fade: {
    duration: 0.2,
  },
} as const;

const LoadingState = () => (
  <div className="absolute inset-x-0 bottom-20 pointer-events-none flex justify-center z-40">
    <div className="text-white/70 text-[12px]">Loading lyrics…</div>
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <div className="absolute inset-x-0 bottom-20 pointer-events-none flex justify-center z-40">
    <div className="text-white/70 text-[12px]">{message}</div>
  </div>
);

const getVariants = (
  position: number,
  isAlternating: boolean,
  isCurrent: boolean
) => ({
  initial: {
    opacity: 0,
    scale: 0.8,
    filter: "blur(3px)",
    y: 10,
    textShadow: "0 0 0px rgba(255,255,255,0)",
  },
  animate: {
    opacity: isAlternating
      ? isCurrent
        ? 1
        : 0.5
      : isCurrent
      ? 1
      : position === 1 || position === -1
      ? 0.5
      : 0.1,
    scale: isAlternating
      ? 1
      : isCurrent || position === 1 || position === -1
      ? 1
      : 0.9,
    filter: isAlternating
      ? "blur(0px)"
      : `blur(${isCurrent || position === 1 || position === -1 ? 0 : 3}px)`,
    y: isAlternating
      ? 0
      : isCurrent
      ? -10
      : position === 1 || position === -1
      ? -10
      : 0,
    textShadow: isCurrent
      ? "0 0 20px rgba(255,255,255,0.6)"
      : "0 0 0px rgba(255,255,255,0)",
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    filter: "blur(5px)",
    y: -10,
    textShadow: "0 0 0px rgba(255,255,255,0)",
  },
});

export function LyricsDisplay({
  lines,
  currentLine,
  isLoading,
  error,
  visible = true,
  alignment = LyricsAlignment.FocusThree,
  chineseVariant = ChineseVariant.Original,
  koreanDisplay = KoreanDisplay.Original,
}: LyricsDisplayProps) {
  const chineseConverter = useMemo(
    () => Converter({ from: "cn", to: "tw" }),
    []
  );
  const japaneseParser = useMemo(() => loadDefaultJapaneseParser(), []);
  const chineseParser = useMemo(() => loadDefaultSimplifiedChineseParser(), []);

  const isChineseText = (text: string) => {
    const chineseRegex = /[\u4E00-\u9FFF]/;
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF]/;
    return chineseRegex.test(text) && !japaneseRegex.test(text);
  };

  const processText = (text: string) => {
    let processed = text;
    if (
      chineseVariant === ChineseVariant.Traditional &&
      isChineseText(processed)
    ) {
      processed = chineseConverter(processed);
    }
    if (koreanDisplay === KoreanDisplay.Romanized) {
      if (/[\u3131-\u314e\u314f-\u3163\uac00-\ud7a3]/.test(processed)) {
        processed = romanize(processed);
      }
    }
    if (/[\u3000-\u9fff]/.test(processed)) {
      const parser = isChineseText(processed) ? chineseParser : japaneseParser;
      return parser.parse(processed).join("\u200b");
    }
    return processed;
  };

  const getTextAlign = (
    align: LyricsAlignment,
    lineIndex: number,
    isCurrentLine: boolean,
    totalVisibleLines: number
  ) => {
    if (align === LyricsAlignment.Center) return "center";
    if (align === LyricsAlignment.Alternating) {
      return "center";
    }
    if (totalVisibleLines === 1) return "center";
    if (totalVisibleLines === 2) return lineIndex === 0 ? "left" : "right";
    if (isCurrentLine) return "center";
    return lineIndex % 2 === 0 ? "left" : "right";
  };

  const visibleLines = useMemo(() => {
    if (!lines.length) return [] as LyricLine[];
    if (currentLine < 0 && lines.length > 0)
      return lines.slice(0, alignment === LyricsAlignment.Alternating ? 2 : 1);

    if (alignment === LyricsAlignment.Alternating) {
      if (currentLine < 0) return lines.slice(0, 2).filter(Boolean);
      const current = lines[currentLine];
      const next = lines[currentLine + 1];
      const prev = lines[currentLine - 1];
      if (next) return [current, next].filter(Boolean);
      if (prev) return [prev, current].filter(Boolean);
      return [current].filter(Boolean);
    }

    return lines.slice(Math.max(0, currentLine - 1), currentLine + 2);
  }, [lines, currentLine, alignment]);

  if (!visible) return null;
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error || "Error loading lyrics."} />;
  if (!lines.length && !isLoading)
    return <ErrorState message="No lyrics available." />;

  return (
    <motion.div
      layout
      transition={ANIMATION_CONFIG.spring}
      className="absolute inset-x-0 mx-auto bottom-5 w-full h-full overflow-hidden flex flex-col items-center justify-end gap-2 pointer-events-none z-40 select-none px-2"
    >
      <AnimatePresence mode="popLayout">
        {visibleLines.map((line, index) => {
          const isCurrent = line === lines[currentLine];
          let position = 0;

          if (alignment === LyricsAlignment.Alternating) {
            position = isCurrent ? 0 : 1;
          } else {
            const currentActualIdx = lines.indexOf(lines[currentLine]);
            const lineActualIdx = lines.indexOf(line);
            position = lineActualIdx - currentActualIdx;
          }

          const variants = getVariants(
            position,
            alignment === LyricsAlignment.Alternating,
            isCurrent
          );
          const lineTextAlign = getTextAlign(
            alignment,
            index,
            isCurrent,
            visibleLines.length
          );

          return (
            <motion.div
              key={line.startTimeMs}
              layoutId={`${line.startTimeMs}-${line.words.substring(0, 10)}`}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={variants}
              transition={{
                ...ANIMATION_CONFIG.spring,
                opacity: ANIMATION_CONFIG.fade,
                filter: ANIMATION_CONFIG.fade,
              }}
              className="px-2 md:px-6 text-[12px] font-geneva-12 leading-[1.1] whitespace-pre-wrap break-words max-w-full text-white"
              style={{
                textAlign: lineTextAlign as CanvasTextAlign,
                fontWeight: isCurrent ? 700 : 500,
                width: "100%",
                paddingLeft:
                  alignment === LyricsAlignment.Alternating &&
                  position === 0 &&
                  visibleLines.length > 1
                    ? "5%"
                    : undefined,
                paddingRight:
                  alignment === LyricsAlignment.Alternating &&
                  position === 1 &&
                  visibleLines.length > 1
                    ? "5%"
                    : undefined,
              }}
            >
              {processText(line.words)}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}
