import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";

interface AboutDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutDialog({ isOpen, onOpenChange }: AboutDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-system7-window-bg border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] max-w-[280px]">
        <DialogHeader className="text-center"></DialogHeader>
        <div className="space-y-6 text-center py-4">
          <div>
            <span className="text-8xl font-sans">💿</span>
          </div>
          <div className="space-y-0">
            <div className="text-lg font-medium">Soundboard.app</div>
            <p className="text-gray-500">Version 0.10</p>
            <p>
              Made by{" "}
              <a
                href="https://ryo.lu"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Ryo Lu
              </a>
            </p>
            <p>
              <a
                href="https://github.com/ryokun6/soundboard"
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
