import React from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface PaintPatternPaletteProps {
  selectedPattern: string;
  onPatternSelect: (pattern: string) => void;
}

export const PaintPatternPalette: React.FC<PaintPatternPaletteProps> = ({
  selectedPattern,
  onPatternSelect,
}) => {
  // Generate pattern numbers from 1 to 38
  const patterns = Array.from({ length: 38 }, (_, i) => i + 1);

  return (
    <ScrollArea className="w-full h-[72px]">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(32px,1fr))] grid-rows-2 gap-1 p-1 h-full">
        {patterns.map((num) => (
          <button
            key={num}
            className={`aspect-square border hover:border-blue-500 ${
              selectedPattern === `pattern-${num}`
                ? "border-blue-500"
                : "border-gray-300"
            }`}
            onClick={() => onPatternSelect(`pattern-${num}`)}
          >
            <img
              src={`/patterns/Property 1=${num}.svg`}
              alt={`Pattern ${num}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};
