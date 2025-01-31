import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";

interface AboutFinderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutFinderDialog({
  isOpen,
  onOpenChange,
}: AboutFinderDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-system7-window-bg border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] max-w-[280px] focus:outline-none">
        <DialogHeader>About This Macintosh</DialogHeader>
        <div className="space-y-2 text-center p-6">
          <div>
            <img
              src="/icons/mac-classic.png"
              alt="Happy Mac"
              className="w-12 h-12 mx-auto [image-rendering:pixelated]"
            />
          </div>
          <div className="space-y-0">
            <div className="text-lg font-medium">ryOS</div>
            <p className="text-gray-500">System Software 7.0</p>
            <p className="text-gray-500">
              © Ryo Lu, 1992-{new Date().getFullYear()}
            </p>
            <p className="text-gray-500">Total Memory: 8,192K</p>
            <p className="text-gray-500">Largest Unused Block: 4,096K</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
