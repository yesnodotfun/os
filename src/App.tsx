import { AppManager } from "./apps/base/AppManager";
import { SoundboardApp } from "./apps/soundboard";
import { InternetExplorerApp } from "./apps/internet-explorer";
import { ChatsApp } from "./apps/chats";
import { TextEditApp } from "./apps/textedit";
import ControlPanelsApp from "./apps/control-panels";
import { MinesweeperApp } from "./apps/minesweeper";

const apps = [
  SoundboardApp,
  InternetExplorerApp,
  ChatsApp,
  TextEditApp,
  ControlPanelsApp,
  MinesweeperApp,
];

function App() {
  return <AppManager apps={apps} />;
}

export default App;
