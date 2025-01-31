import { useState, useEffect } from "react";
import { AppleMenu } from "./AppleMenu";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface MenuBarProps {
  children?: React.ReactNode;
}

function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="ml-auto mr-2">
      {time.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
    </div>
  );
}

function DefaultMenuItems() {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="default"
            className="h-6 text-md px-2 py-1 border-none hover:bg-gray-200 active:bg-gray-900 active:text-white focus-visible:ring-0"
          >
            File
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={1} className="px-0">
          <DropdownMenuItem className="text-md h-6 px-3 active:bg-gray-900 active:text-white">
            New Finder Window
          </DropdownMenuItem>
          <DropdownMenuItem className="text-md h-6 px-3 active:bg-gray-900 active:text-white">
            New Folder
          </DropdownMenuItem>

          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuItem className="text-md h-6 px-3 active:bg-gray-900 active:text-white">
            Close
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="default"
            className="h-6 text-md px-2 py-1 border-none hover:bg-gray-200 active:bg-gray-900 active:text-white focus-visible:ring-0"
          >
            Edit
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={1} className="px-0">
          <DropdownMenuItem className="text-md h-6 px-3 active:bg-gray-900 active:text-white">
            Undo
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuItem className="text-md h-6 px-3 active:bg-gray-900 active:text-white">
            Cut
          </DropdownMenuItem>
          <DropdownMenuItem className="text-md h-6 px-3 active:bg-gray-900 active:text-white">
            Copy
          </DropdownMenuItem>
          <DropdownMenuItem className="text-md h-6 px-3 active:bg-gray-900 active:text-white">
            Paste
          </DropdownMenuItem>
          <DropdownMenuItem className="text-md h-6 px-3 active:bg-gray-900 active:text-white">
            Clear
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuItem className="text-md h-6 px-3 active:bg-gray-900 active:text-white">
            Select All
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="default"
            className="h-6 text-md px-2 py-1 border-none hover:bg-gray-200 active:bg-gray-900 active:text-white focus-visible:ring-0"
          >
            View
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={1} className="px-0">
          <DropdownMenuItem className="text-md h-6 px-3 active:bg-gray-900 active:text-white">
            by Small Icon
          </DropdownMenuItem>
          <DropdownMenuItem className="text-md h-6 px-3 active:bg-gray-900 active:text-white">
            by Icon
          </DropdownMenuItem>
          <DropdownMenuItem className="text-md h-6 px-3 active:bg-gray-900 active:text-white">
            by Name
          </DropdownMenuItem>
          <DropdownMenuItem className="text-md h-6 px-3 active:bg-gray-900 active:text-white">
            by Date
          </DropdownMenuItem>
          <DropdownMenuItem className="text-md h-6 px-3 active:bg-gray-900 active:text-white">
            by Size
          </DropdownMenuItem>
          <DropdownMenuItem className="text-md h-6 px-3 active:bg-gray-900 active:text-white">
            by Kind
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export function MenuBar({ children }: MenuBarProps) {
  const { apps, appStates } = useAppContext();
  const hasActiveApp = Object.values(appStates).some(
    (state) => state?.isForeground && state?.isOpen
  );

  return (
    <div className="fixed top-0 left-0 right-0 flex bg-system7-menubar-bg border-b-[2px] border-black px-2 h-7 items-center z-50">
      <AppleMenu apps={apps} />
      {hasActiveApp ? children : <DefaultMenuItems />}
      <Clock />
    </div>
  );
}
