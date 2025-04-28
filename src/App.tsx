import { AppManager } from "./apps/base/AppManager";
import { appRegistry } from "./config/appRegistry";
import { useEffect } from "react";
import { loadDisplayMode, applyDisplayMode } from "./utils/displayMode";
import { Toaster } from "./components/ui/sonner";

// Convert registry to array
const apps = Object.values(appRegistry);

function App() {
  useEffect(() => {
    const savedMode = loadDisplayMode();
    applyDisplayMode(savedMode);
  }, []);

  return (
    <>
      <AppManager apps={apps} />
      <Toaster position="bottom-left" offset={32} />
    </>
  );
}

export default App;
