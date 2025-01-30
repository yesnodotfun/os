import { AppManager } from "./apps/base/AppManager";
import { SoundboardApp } from "./apps/soundboard";
import { InternetExplorerApp } from "./apps/internet-explorer";
import { ChatsApp } from "./apps/chats";

const apps = [SoundboardApp, InternetExplorerApp, ChatsApp];

function App() {
  return <AppManager apps={apps} />;
}

export default App;
