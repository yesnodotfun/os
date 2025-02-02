import { FileIcon } from "./FileIcon";

export interface FileItem {
  name: string;
  isDirectory: boolean;
  path: string;
  icon?: string;
}

interface FileListProps {
  files: FileItem[];
  onFileOpen: (file: FileItem) => void;
  onFileSelect: (file: FileItem) => void;
  selectedFile?: FileItem;
}

export function FileList({
  files,
  onFileOpen,
  onFileSelect,
  selectedFile,
}: FileListProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2 p-4">
      {files.map((file) => (
        <FileIcon
          key={file.path}
          name={file.name}
          isDirectory={file.isDirectory}
          icon={file.icon}
          onDoubleClick={() => onFileOpen(file)}
          onClick={() => onFileSelect(file)}
          isSelected={selectedFile?.path === file.path}
        />
      ))}
    </div>
  );
}
