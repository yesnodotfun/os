import React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface PaintToolbarProps {
  selectedTool: string;
  onToolSelect: (tool: string) => void;
}

const tools = [
  { id: "pencil", icon: "/icons/macpaint/pencil.png", label: "Pencil" },
  { id: "brush", icon: "/icons/macpaint/brush.png", label: "Brush" },
  { id: "eraser", icon: "/icons/macpaint/eraser.png", label: "Eraser" },
  { id: "line", icon: "/icons/macpaint/line.png", label: "Line" },
  {
    id: "rectangle",
    icon: "/icons/macpaint/rectangle.png",
    label: "Rectangle",
  },
  {
    id: "filled-rectangle",
    icon: "/icons/macpaint/rectangle.png",
    label: "Filled Rectangle",
  },
  { id: "oval", icon: "/icons/macpaint/oval.png", label: "Oval" },
  { id: "filled-oval", icon: "/icons/macpaint/oval.png", label: "Filled Oval" },
  { id: "text", icon: "/icons/macpaint/text.png", label: "Text" },
  { id: "select", icon: "/icons/macpaint/lasso.png", label: "Select" },
];

export const PaintToolbar: React.FC<PaintToolbarProps> = ({
  selectedTool,
  onToolSelect,
}) => {
  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 gap-1">
        {tools.map((tool) => (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <Button
                variant={selectedTool === tool.id ? "secondary" : "ghost"}
                className={`w-10 h-10 p-1 ${
                  selectedTool === tool.id ? "bg-gray-200" : ""
                }`}
                onClick={() => onToolSelect(tool.id)}
              >
                <img
                  src={tool.icon}
                  alt={tool.label}
                  className="w-6 h-6 object-contain"
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{tool.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};
