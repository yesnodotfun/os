import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/contexts/AppContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { AboutFinderDialog } from "@/components/dialogs/AboutFinderDialog";

interface AppleMenuProps {
  apps: { id: string; name: string }[];
}

export function AppleMenu({ apps }: AppleMenuProps) {
  const [aboutFinderOpen, setAboutFinderOpen] = useState(false);
  const { appStates, toggleApp, bringToForeground } = useAppContext();

  const handleAppClick = (appId: string) => {
    const isOpen = appStates[appId]?.isOpen;
    if (!isOpen) {
      toggleApp(appId);
    } else {
      bringToForeground(appId);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="default"
            className="h-6 text-md px-3 py-1 border-none hover:bg-gray-200 active:bg-gray-900 active:text-white focus-visible:ring-0"
          >
            
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={1} className="px-0">
          <DropdownMenuItem
            onClick={() => setAboutFinderOpen(true)}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            About This Macintosh
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          {apps.map((app) => (
            <DropdownMenuItem
              key={app.id}
              onClick={() => handleAppClick(app.id)}
              className="text-md h-6 px-3 active:bg-gray-900 active:text-white flex justify-between"
            >
              {app.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <AboutFinderDialog
        isOpen={aboutFinderOpen}
        onOpenChange={setAboutFinderOpen}
      />
    </>
  );
}
