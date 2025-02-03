import { FileIcon } from "./FileIcon";
import { ViewType } from "./FinderMenuBar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface FileItem {
  name: string;
  isDirectory: boolean;
  path: string;
  icon?: string;
  appId?: string; // For application files
  content?: string; // For document files
  size?: number; // File size in bytes
  modifiedAt?: Date; // Last modified date
}

interface FileListProps {
  files: FileItem[];
  onFileOpen: (file: FileItem) => void;
  onFileSelect: (file: FileItem) => void;
  selectedFile?: FileItem;
  viewType?: ViewType;
}

export function FileList({
  files,
  onFileOpen,
  onFileSelect,
  selectedFile,
  viewType = "small",
}: FileListProps) {
  const handleFileOpen = (file: FileItem) => {
    onFileOpen(file);
    onFileSelect(null as unknown as FileItem); // Clear selection with proper typing
  };

  if (viewType === "list") {
    return (
      <div className="font-[Geneva-12] antialiased">
        <Table>
          <TableHeader>
            <TableRow className="text-[9px] border-none font-normal">
              <TableHead className="font-normal bg-gray-100/50 h-[28px]">
                Name
              </TableHead>
              <TableHead className="font-normal bg-gray-100/50 h-[28px]">
                Type
              </TableHead>
              <TableHead className="font-normal bg-gray-100/50 h-[28px]">
                Size
              </TableHead>
              <TableHead className="font-normal bg-gray-100/50 h-[28px]">
                Modified
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-[10px]">
            {files.map((file) => (
              <TableRow
                key={file.path}
                className={`border-none hover:bg-gray-100/50 transition-colors cursor-default ${
                  selectedFile?.path === file.path
                    ? "bg-black text-white hover:bg-black"
                    : "odd:bg-gray-200/50"
                }`}
                onClick={() => onFileSelect(file)}
                onDoubleClick={() => handleFileOpen(file)}
              >
                <TableCell className="flex items-center gap-2">
                  <img
                    src={
                      file.icon ||
                      (file.isDirectory
                        ? "/icons/directory.png"
                        : "/icons/file.png")
                    }
                    alt={file.isDirectory ? "Directory" : "File"}
                    className={`w-4 h-4 ${
                      selectedFile?.path === file.path ? "invert" : ""
                    }`}
                    style={{ imageRendering: "pixelated" }}
                  />
                  {file.name}
                </TableCell>
                <TableCell>
                  {file.isDirectory
                    ? "Folder"
                    : file.appId
                    ? "Application"
                    : "Document"}
                </TableCell>
                <TableCell>
                  {file.size
                    ? file.size < 1024
                      ? `${file.size} B`
                      : file.size < 1024 * 1024
                      ? `${(file.size / 1024).toFixed(1)} KB`
                      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                    : "--"}
                </TableCell>
                <TableCell>
                  {file.modifiedAt
                    ? file.modifiedAt.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "--"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2 p-4">
      {files.map((file) => (
        <FileIcon
          key={file.path}
          name={file.name}
          isDirectory={file.isDirectory}
          icon={file.icon}
          onDoubleClick={() => handleFileOpen(file)}
          onClick={() => onFileSelect(file)}
          isSelected={selectedFile?.path === file.path}
          size={viewType}
        />
      ))}
    </div>
  );
}
