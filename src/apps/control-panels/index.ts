import { BaseApp } from "../base/types";
import { ControlPanelsAppComponent } from "./components/ControlPanelsAppComponent";

export const helpItems = [
  {
    icon: "🎨",
    title: "Overview",
    description:
      "Control Panels lets you customize various system settings including appearance, sound, keyboard, and location preferences.",
  },
  {
    icon: "⚙️",
    title: "Using Control Panels",
    description:
      "Click on any panel icon to open its specific settings. Changes are saved automatically.",
  },
];

export const appMetadata = {
  name: "Control Panels",
  version: "1.0.0",
  creator: {
    name: "System",
    url: "https://github.com/ryoid",
  },
  github: "https://github.com/ryoid/soundboard",
  icon: "/icons/control-panels/icon.png",
};

const app: BaseApp = {
  id: "control-panels",
  name: "Control Panels",
  icon: {
    type: "image",
    src: "/icons/control-panels/appearance-manager/app.png",
  },
  description: "System settings and configuration",
  component: ControlPanelsAppComponent,
  helpItems,
  metadata: appMetadata,
};

export default app;
