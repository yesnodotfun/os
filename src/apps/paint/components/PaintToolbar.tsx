import React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useThemeStore } from "@/stores/useThemeStore";

interface PaintToolbarProps {
  selectedTool: string;
  onToolSelect: (tool: string) => void;
}

const tools = [
  // Selection tools
  { id: "select", icon: "/icons/default/macpaint/lasso.png", label: "Select" },
  {
    id: "rect-select",
    icon: "/icons/default/macpaint/select.png",
    label: "Rectangle Select",
  },

  // Text and eraser
  { id: "hand", icon: "/icons/default/macpaint/hand.png", label: "Hand" },

  { id: "text", icon: "/icons/default/macpaint/text.png", label: "Text" },

  // Fill and spray
  {
    id: "bucket",
    icon: "/icons/default/macpaint/bucket.png",
    label: "Fill Color",
  },
  { id: "spray", icon: "/icons/default/macpaint/spray.png", label: "Spray" },

  // Drawing tools
  { id: "brush", icon: "/icons/default/macpaint/brush.png", label: "Brush" },
  { id: "pencil", icon: "/icons/default/macpaint/pencil.png", label: "Pencil" },

  // Shapes
  { id: "line", icon: "/icons/default/macpaint/line.png", label: "Line" },
  { id: "eraser", icon: "/icons/default/macpaint/eraser.png", label: "Eraser" },

  {
    id: "rectangle",
    icon: "/icons/default/macpaint/rectangle.png",
    label: "Rectangle",
  },
  { id: "oval", icon: "/icons/default/macpaint/oval.png", label: "Oval" },
];

export const PaintToolbar: React.FC<PaintToolbarProps> = ({
  selectedTool,
  onToolSelect,
}) => {
  const currentTheme = useThemeStore((state) => state.current);
  const isMacTheme = currentTheme === "macosx";

  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 gap-0">
        {tools.map((tool) => (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <Button
                variant={
                  isMacTheme
                    ? "outline"
                    : selectedTool === tool.id
                    ? "secondary"
                    : "ghost"
                }
                className={`p-1 border-1 transition-none ${
                  selectedTool === tool.id ? "invert border-white" : ""
                }`}
                onClick={() => onToolSelect(tool.id)}
              >
                <img
                  src={tool.icon}
                  alt={tool.label}
                  className="w-[36px] h-[36px] object-contain mix-blend-multiply"
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={2}>
              <p>{tool.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};
