import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { useSound, Sounds } from "@/hooks/useSound";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, onCheckedChange, ...props }, ref) => {
  const { play: playClick } = useSound(Sounds.BUTTON_CLICK, 0.3);
  const [isChecked, setIsChecked] = React.useState(
    props.checked || props.defaultChecked || false
  );

  const handleCheckedChange = (checked: boolean) => {
    playClick();
    setIsChecked(checked);
    onCheckedChange?.(checked);
  };

  // Use inline styles to override XP/98 CSS with highest specificity
  const switchStyle: React.CSSProperties = {
    backgroundColor: isChecked ? "#111827" : "#9ca3af", // gray-900 : gray-400
    borderRadius: "9999px",
    border: "none",
    boxShadow: "none",
    background: isChecked ? "#111827" : "#9ca3af", // Ensure background property is also set
  };

  return (
    <SwitchPrimitives.Root
      className={cn(
        "peer inline-flex h-[16px] w-7 shrink-0 cursor-pointer items-center transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      style={switchStyle}
      onCheckedChange={handleCheckedChange}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block h-3 w-3 rounded-full bg-white transition-transform data-[state=checked]:translate-x-[14px] data-[state=unchecked]:translate-x-[2px]"
        )}
      />
    </SwitchPrimitives.Root>
  );
});
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
