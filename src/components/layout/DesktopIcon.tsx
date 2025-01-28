import { cn } from "@/lib/utils";

interface DesktopIconProps {
  isWindowOpen: boolean;
  onToggleWindow: () => void;
}

export function DesktopIcon({
  isWindowOpen,
  onToggleWindow,
}: DesktopIconProps) {
  return (
    <div
      className="absolute top-12 right-4 flex flex-col items-center gap-1 cursor-pointer select-none group"
      onDoubleClick={onToggleWindow}
    >
      <div className="text-4xl group-hover:scale-105 transition-transform">
        <img src="/icons/cdrom.png" alt="CD-ROM" className="w-8 h-8" />
      </div>
      <div
        className={cn(
          "text-gray-900 text-sm text-center px-1.5 py-0 bg-white/100 border-1 border-transparent",
          isWindowOpen && "border-1 border-gray-900"
        )}
      >
        Soundboard.app
      </div>
    </div>
  );
}
