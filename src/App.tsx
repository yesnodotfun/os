import { AppManager } from "./apps/base/AppManager";
import { appRegistry } from "./config/appRegistry";
import { useEffect, useState } from "react";
import { applyDisplayMode } from "./utils/displayMode";
import { Toaster } from "./components/ui/sonner";
import { useAppStore } from "./stores/useAppStore";
import { BootScreen } from "./components/dialogs/BootScreen";
import { getNextBootMessage } from "./utils/bootMessage";

// Convert registry to array
const apps = Object.values(appRegistry);

function App() {
  const displayMode = useAppStore((state) => state.displayMode);
  const isFirstBoot = useAppStore((state) => state.isFirstBoot);
  const setHasBooted = useAppStore((state) => state.setHasBooted);
  const [currentBootMessage, setCurrentBootMessage] = useState<string | null>(null);

  useEffect(() => {
    applyDisplayMode(displayMode);
  }, [displayMode]);

  useEffect(() => {
    // Check for a boot message only once on initial load or if isFirstBoot is true
    if (isFirstBoot) {
      const msg = getNextBootMessage();
      if (msg) {
        setCurrentBootMessage(msg);
      } else {
        setCurrentBootMessage("Starting Up..."); // Default message if none found
      }
    }
  }, [isFirstBoot]);

  if (isFirstBoot) {
    return (
      <BootScreen
        isOpen={isFirstBoot}
        onOpenChange={() => {}}
        title={currentBootMessage || "Starting Up..."}
        onBootComplete={() => {
          setHasBooted();
          setCurrentBootMessage(null);
        }}
      />
    );
  }

  return (
    <>
      <AppManager apps={apps} />
      <Toaster position="bottom-left" offset={`calc(env(safe-area-inset-bottom, 0px) + 32px)`} />
    </>
  );
}

export default App;
