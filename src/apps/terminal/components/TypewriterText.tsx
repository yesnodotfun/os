import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface TypewriterTextProps {
  text: string;
  className?: string;
  speed?: number;
  renderMarkdown?: boolean;
}

// Helper function to parse simple markdown formatting
export const parseSimpleMarkdown = (text: string): React.ReactNode[] => {
  if (!text) return [text];

  // Process the bold formatting first, then italic
  let result: React.ReactNode[] = [];
  const currentText = text;

  // Process bold patterns first (**text** or __text__)
  const boldRegex = /(\*\*.*?\*\*|__.*?__)/g;
  let lastIndex = 0;
  let boldMatch;

  while ((boldMatch = boldRegex.exec(currentText)) !== null) {
    // Add text before the match
    if (boldMatch.index > lastIndex) {
      result.push(currentText.substring(lastIndex, boldMatch.index));
    }

    // Add the bold text
    const boldContent = boldMatch[0].replace(/^\*\*|\*\*$|^__|__$/g, "");
    result.push(
      <span key={`bold-${boldMatch.index}`} className="font-bold">
        {boldContent}
      </span>
    );

    lastIndex = boldMatch.index + boldMatch[0].length;
  }

  // Add any remaining text after the last bold match
  if (lastIndex < currentText.length) {
    result.push(currentText.substring(lastIndex));
  }

  // Now process italic in each text segment
  result = result.flatMap((segment, i) => {
    if (typeof segment !== "string") return segment;

    const italicParts: React.ReactNode[] = [];
    const italicRegex = /(\*[^*]+\*|_[^_]+_)/g;
    let lastItalicIndex = 0;
    let italicMatch;

    while ((italicMatch = italicRegex.exec(segment)) !== null) {
      // Add text before the match
      if (italicMatch.index > lastItalicIndex) {
        italicParts.push(segment.substring(lastItalicIndex, italicMatch.index));
      }

      // Add the italic text
      const italicContent = italicMatch[0].replace(/^\*|\*$|^_|_$/g, "");
      italicParts.push(
        <span key={`italic-${i}-${italicMatch.index}`} className="italic">
          {italicContent}
        </span>
      );

      lastItalicIndex = italicMatch.index + italicMatch[0].length;
    }

    // Add any remaining text after the last italic match
    if (lastItalicIndex < segment.length) {
      italicParts.push(segment.substring(lastItalicIndex));
    }

    return italicParts.length > 0 ? italicParts : segment;
  });

  return result;
};

export function TypewriterText({
  text,
  className,
  speed = 15,
  renderMarkdown = false,
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const textRef = useRef(text);

  useEffect(() => {
    // Reset when text changes
    setDisplayedText("");
    setIsComplete(false);
    textRef.current = text;

    // Skip animation for long text (performance)
    if (text.length > 200) {
      setDisplayedText(text);
      setIsComplete(true);
      return;
    }

    // Adjust speed based on text length - faster for longer text
    const adjustedSpeed =
      text.length > 100 ? speed * 0.7 : text.length > 50 ? speed * 0.85 : speed;

    // Split into reasonable chunks for better performance
    // This makes animation smoother by reducing React state updates
    const chunkSize = text.length > 100 ? 3 : text.length > 50 ? 2 : 1;
    const chunks: string[] = [];

    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.substring(i, Math.min(i + chunkSize, text.length)));
    }

    // Use a recursive setTimeout for more reliable animation
    let currentIndex = 0;
    let timeoutId: NodeJS.Timeout;

    const typeNextChunk = () => {
      if (currentIndex < chunks.length) {
        const chunk = chunks[currentIndex];
        setDisplayedText((prev) => prev + chunk);
        currentIndex++;

        // Pause longer after punctuation for natural rhythm
        const endsWithPunctuation = /[.,!?;:]$/.test(chunk);
        const delay = endsWithPunctuation ? adjustedSpeed * 3 : adjustedSpeed;

        timeoutId = setTimeout(typeNextChunk, delay);
      } else {
        setIsComplete(true);
      }
    };

    // Start the typing animation
    timeoutId = setTimeout(typeNextChunk, adjustedSpeed);

    // Clean up on unmount
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [text, speed]);

  return (
    <span className={`select-text cursor-text ${className || ""}`}>
      {renderMarkdown ? parseSimpleMarkdown(displayedText) : displayedText}
      {!isComplete && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
        >
          _
        </motion.span>
      )}
    </span>
  );
}