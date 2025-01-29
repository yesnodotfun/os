import { AppManager } from "./apps/base/AppManager";
import { SoundboardApp } from "./apps/soundboard";
import { InternetExplorerApp } from "./apps/internet-explorer";

const apps = [SoundboardApp, InternetExplorerApp];

function App() {
  return <AppManager apps={apps} />;
}

export default App;
