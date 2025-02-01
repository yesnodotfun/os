import { AppManager } from "./apps/base/AppManager";
import { SoundboardApp } from "./apps/soundboard";
import { InternetExplorerApp } from "./apps/internet-explorer";
import { ChatsApp } from "./apps/chats";
import { TextEditApp } from "./apps/textedit";
import ControlPanelsApp from "./apps/control-panels";

const apps = [
  SoundboardApp,
  InternetExplorerApp,
  ChatsApp,
  TextEditApp,
  ControlPanelsApp,
];

function App() {
  return <AppManager apps={apps} />;
}

export default App;
