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
  { id: "pencil", icon: "✏️", label: "Pencil" },
  { id: "brush", icon: "🖌️", label: "Brush" },
  { id: "eraser", icon: "🧽", label: "Eraser" },
  { id: "line", icon: "/", label: "Line" },
  { id: "rectangle", icon: "⬜", label: "Rectangle" },
  { id: "filled-rectangle", icon: "■", label: "Filled Rectangle" },
  { id: "oval", icon: "⭕", label: "Oval" },
  { id: "filled-oval", icon: "●", label: "Filled Oval" },
  { id: "text", icon: "字", label: "Text" },
  { id: "select", icon: "🔍", label: "Select" },
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
                className={`w-10 h-10 p-0 font-['SerenityOS-Emoji'] text-lg ${
                  selectedTool === tool.id ? "bg-gray-200" : ""
                }`}
                onClick={() => onToolSelect(tool.id)}
              >
                {tool.icon}
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
