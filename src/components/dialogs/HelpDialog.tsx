import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface HelpCardProps {
  icon: string;
  title: string;
  description: string;
}

function HelpCard({ icon, title, description }: HelpCardProps) {
  return (
    <div className="p-4 bg-black/5 rounded-lg transition-colors">
      <div className="text-xl">{icon}</div>
      <h3 className="font-medium">{title}</h3>
      <p className="text-gray-500 leading-[1]">{description}</p>
    </div>
  );
}

const HELP_ITEMS: HelpCardProps[] = [
  {
    icon: "🎙️",
    title: "Record",
    description: "Click slot to record, click again to stop",
  },
  {
    icon: "▶️",
    title: "Play",
    description: "Click or press numbers 1-9 to play",
  },
  {
    icon: "✏️",
    title: "Customize",
    description: "Add emojis and name your sounds",
  },
  {
    icon: "🎯",
    title: "Organize",
    description: "Make multiple soundboards",
  },
  {
    icon: "🌎",
    title: "Export and share",
    description: "Import download from the web",
  },
  {
    icon: "🖥️",
    title: "Modern GUI",
    description: "Mac OS 7 style desktop design",
  },
];

interface HelpDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpDialog({ isOpen, onOpenChange }: HelpDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-system7-window-bg border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl mb-2 font-normal">
            Welcome to Soundboard.app
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-4">
          {HELP_ITEMS.map((item) => (
            <HelpCard key={item.title} {...item} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
