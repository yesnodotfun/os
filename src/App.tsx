import { AppManager } from "./apps/base/AppManager";
import { appRegistry } from "./config/appRegistry";

// Convert registry to array
const apps = Object.values(appRegistry);

function App() {
  return <AppManager apps={apps} />;
}

export default App;
