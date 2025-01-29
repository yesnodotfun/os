import React from "react";
import { BaseApp } from "../base/types";
import { SoundboardMenuBar } from "./components/SoundboardMenuBar";
import { SoundboardWindow } from "./components/SoundboardWindow";

export const SoundboardApp: BaseApp = {
  id: "soundboard",
  name: "Soundboard",
  icon: "🎵",
  description: "A simple soundboard app",
  MenuBar: SoundboardMenuBar,
  Window: SoundboardWindow,
};
