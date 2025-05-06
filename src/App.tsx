import { AppManager } from "./apps/base/AppManager";
import { appRegistry } from "./config/appRegistry";
import { useEffect, useState } from "react";
import { applyDisplayMode } from "./utils/displayMode";
import { Toaster } from "./components/ui/sonner";
import { useAppStore } from "./stores/useAppStore";
import { BootScreen } from "./components/dialogs/BootScreen";
import { getNextBootMessage, clearNextBootMessage } from "./utils/bootMessage";

// Convert registry to array
const apps = Object.values(appRegistry);

function App() {
  const displayMode = useAppStore((state) => state.displayMode);
  const isFirstBoot = useAppStore((state) => state.isFirstBoot);
  const setHasBooted = useAppStore((state) => state.setHasBooted);
  const [bootScreenMessage, setBootScreenMessage] = useState<string | null>(null);
  const [showBootScreen, setShowBootScreen] = useState(false);

  useEffect(() => {
    applyDisplayMode(displayMode);
  }, [displayMode]);

  useEffect(() => {
    const persistedMessage = getNextBootMessage();
    if (persistedMessage) {
      setBootScreenMessage(persistedMessage);
      setShowBootScreen(true);
    } else if (isFirstBoot) {
      setBootScreenMessage("Starting Up...");
      setShowBootScreen(true);
    }
  }, [isFirstBoot]);

  if (showBootScreen) {
    return (
      <BootScreen
        isOpen={true}
        onOpenChange={() => {}}
        title={bootScreenMessage || "Starting Up..."}
        onBootComplete={() => {
          if (isFirstBoot) {
            setHasBooted();
          }
          clearNextBootMessage();
          setShowBootScreen(false);
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
