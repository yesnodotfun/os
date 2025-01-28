import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface HelpDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpDialog({ isOpen, onOpenChange }: HelpDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-system7-window-bg border-2 border-black rounded-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            Getting Started
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>Welcome to Soundboard.app! Here's how to use it:</p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <span>🎬</span>
              <span>Click any empty slot to start recording a sound</span>
            </li>
            <li className="flex items-center gap-2">
              <span>✂️</span>
              <span>Click again to stop recording</span>
            </li>
            <li className="flex items-center gap-2">
              <span>🚀</span>
              <span>Click a recorded slot to play the sound</span>
            </li>
            <li className="flex items-center gap-2">
              <span>⚡️</span>
              <span>Press number keys 1-9 to quickly play sounds</span>
            </li>
            <li className="flex items-center gap-2">
              <span>✨</span>
              <span>
                Add emojis and titles to your sounds by clicking the respective
                icons
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span>🎯</span>
              <span>
                Create multiple soundboards using the + button in the sidebar
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span>🔄</span>
              <span>
                Import and export your soundboards using the File menu
              </span>
            </li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
