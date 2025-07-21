import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface AboutDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  metadata: {
    name: string;
    version: string;
    creator: {
      name: string;
      url: string;
    };
    github: string;
    icon: string;
  };
}

export function AboutDialog({
  isOpen,
  onOpenChange,
  metadata,
}: AboutDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-os-window-bg border-[length:var(--os-metrics-border-width)] border-os-window rounded-os shadow-os-window max-w-[280px]">
        <DialogHeader>
          <DialogTitle className="font-normal text-[16px]">About</DialogTitle>
          <DialogDescription className="sr-only">
            Information about the application
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center space-y-4 py-4">
          <div>
            <img
              src={metadata.icon}
              alt="App Icon"
              className="w-12 h-12 mx-auto [image-rendering:pixelated]"
            />
          </div>
          <div className="space-y-0 font-geneva-12 text-[10px]">
            <div className="text-2xl font-medium font-apple-garamond">
              {metadata.name}
            </div>
            <p className="text-gray-500">Version {metadata.version}</p>
            <p>
              Made by{" "}
              <a
                href={metadata.creator.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                {metadata.creator.name}
              </a>
            </p>
            <p>
              <a
                href={metadata.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Open in GitHub
              </a>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
