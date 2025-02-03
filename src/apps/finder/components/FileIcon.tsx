interface FileIconProps {
  name: string;
  isDirectory: boolean;
  icon?: string;
  onDoubleClick?: () => void;
  isSelected?: boolean;
  onClick?: () => void;
}

export function FileIcon({
  name,
  isDirectory,
  icon,
  onDoubleClick,
  isSelected,
  onClick,
}: FileIconProps) {
  const getIconPath = () => {
    if (icon) return icon;
    if (isDirectory) return "/icons/directory.png";
    if (name.endsWith(".txt") || name.endsWith(".md"))
      return "/icons/file-text.png";
    return "/icons/file.png";
  };

  return (
    <div
      className="flex flex-col items-center justify-start cursor-pointer w-[80px] gap-1"
      onDoubleClick={onDoubleClick}
      onClick={onClick}
    >
      <div
        className={`w-12 h-12 flex items-center justify-center ${
          isSelected ? "brightness-65 contrast-100" : ""
        }`}
      >
        <img
          src={getIconPath()}
          alt={isDirectory ? "Directory" : "File"}
          className="w-[32px] h-[32px] object-contain"
          style={{ imageRendering: "pixelated" }}
        />
      </div>
      <span
        className={`text-center px-1 max-w-[90px] font-['Geneva-12'] antialiased text-[10px] line-clamp-2 break-words ${
          isSelected ? "bg-black text-white" : "bg-white text-black"
        }`}
      >
        {name}
      </span>
    </div>
  );
}
