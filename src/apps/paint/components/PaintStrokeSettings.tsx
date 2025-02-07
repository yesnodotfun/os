import React from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface PaintStrokeSettingsProps {
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
}

export const PaintStrokeSettings: React.FC<PaintStrokeSettingsProps> = ({
  strokeWidth,
  onStrokeWidthChange,
}) => {
  return (
    <div className="space-y-2 p-2 border-t border-gray-200">
      <Label className="text-xs">Stroke Width</Label>
      <Slider
        value={[strokeWidth]}
        onValueChange={(value) => onStrokeWidthChange(value[0])}
        min={1}
        max={20}
        step={1}
        className="w-full"
      />
      <div className="text-xs text-center">{strokeWidth}px</div>
    </div>
  );
};
