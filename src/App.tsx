import { AppManager } from "./apps/base/AppManager";
import { SoundboardApp } from "./apps/soundboard";
import { InternetExplorerApp } from "./apps/internet-explorer";
import { ChatsApp } from "./apps/chats";
import { TextEditApp } from "./apps/textedit";
import ControlPanelsApp from "./apps/control-panels";
import { MinesweeperApp } from "./apps/minesweeper";
import { FinderApp } from "./apps/finder";

const apps = [
  SoundboardApp,
  InternetExplorerApp,
  ChatsApp,
  TextEditApp,
  ControlPanelsApp,
  MinesweeperApp,
  FinderApp,
];

function App() {
  return <AppManager apps={apps} />;
}

export default App;
