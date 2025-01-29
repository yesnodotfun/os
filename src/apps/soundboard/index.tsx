import { BaseApp } from "../base/types";
import { SoundboardAppComponent } from "./components/SoundboardAppComponent";

export const SoundboardApp: BaseApp = {
  id: "soundboard",
  name: "Soundboard",
  icon: { type: "image", src: "/icons/cdrom.png" },
  description: "A simple soundboard app",
  component: SoundboardAppComponent,
};
