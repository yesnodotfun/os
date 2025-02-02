import { BaseApp } from "../base/types";
import { MinesweeperAppComponent } from "./components/MinesweeperAppComponent";

export const appMetadata: BaseApp["metadata"] = {
  name: "Minesweeper",
  version: "1.0.0",
  creator: {
    name: "Ryo",
    url: "https://github.com/ryokun6",
  },
  github: "https://github.com/ryokun6/soundboard",
  icon: "/icons/minesweeper.png",
};

export const helpItems: BaseApp["helpItems"] = [
  {
    icon: "🎮",
    title: "How to Play",
    description:
      "Left click to reveal a cell. Right click to place a flag. Avoid the mines!",
  },
  {
    icon: "📖",
    title: "Game Rules",
    description:
      "Numbers show how many mines are adjacent to a cell. Flag all mines to win!",
  },
];

export const MinesweeperApp: BaseApp = {
  id: "minesweeper",
  name: "Minesweeper",
  icon: { type: "image", src: "/icons/minesweeper.png" },
  description: "Classic Minesweeper game",
  component: MinesweeperAppComponent,
  windowConstraints: {
    minWidth: 280,
    maxWidth: 320,
    minHeight: 300,
    maxHeight: 400,
  },
  helpItems,
  metadata: appMetadata,
};
