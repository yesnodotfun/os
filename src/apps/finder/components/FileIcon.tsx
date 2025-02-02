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
  return (
    <div
      className={`flex flex-col items-center gap-1 p-2 rounded cursor-default select-none ${
        isSelected ? "bg-blue-500/20" : "hover:bg-gray-100"
      }`}
      onDoubleClick={onDoubleClick}
      onClick={onClick}
    >
      <div className="text-2xl">{icon || (isDirectory ? "📁" : "📄")}</div>
      <div className="text-sm text-center max-w-[100px] truncate">{name}</div>
    </div>
  );
}
