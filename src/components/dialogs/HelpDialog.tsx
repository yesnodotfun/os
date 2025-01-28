import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";

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
    icon: "📂",
    title: "Organize",
    description: "Make multiple soundboards",
  },
  {
    icon: "🌎",
    title: "Export & share",
    description: "Or import from file downloaded",
  },
  {
    icon: "🖥️",
    title: "Modern GUI",
    description: "System 7 style aesthetics",
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
        <DialogHeader>Help</DialogHeader>
        <div className="p-6 pt-2">
          <p className="text-lg mb-4">Welcome to Soundboard.app</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {HELP_ITEMS.map((item) => (
              <HelpCard key={item.title} {...item} />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
