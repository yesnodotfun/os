import { AppManager } from "./apps/base/AppManager";
import { SoundboardApp } from "./apps/soundboard";
import { InternetExplorerApp } from "./apps/internet-explorer";

const apps = [SoundboardApp, InternetExplorerApp];

function App() {
  return (
    <AppManager
      apps={apps}
      initialState={{ soundboard: { isOpen: true, isForeground: true } }}
    />
  );
}

export default App;
