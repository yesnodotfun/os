import { AppManager } from "./apps/base/AppManager";
import { SoundboardApp } from "./apps/soundboard";

const apps = [SoundboardApp];

function App() {
  return (
    <AppManager apps={apps} initialState={{ soundboard: { isOpen: true } }} />
  );
}

export default App;
