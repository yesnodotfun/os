import { BaseApp } from "../base/types";
import { IpodAppComponent } from "./components/IpodAppComponent";

export const helpItems = [
  {
    icon: "🎵",
    title: "Add Music",
    description: "Paste any YouTube URL to add to your iPod",
  },
  {
    icon: "🔄",
    title: "Navigation",
    description: "Use the click wheel to navigate menus and control playback",
  },
  {
    icon: "⏯️",
    title: "Playback",
    description:
      "Play/pause using the center button, skip tracks with the wheel",
  },
  {
    icon: "🔁",
    title: "Loop",
    description: "Enable repeat for current track or entire library",
  },
  {
    icon: "🔀",
    title: "Shuffle",
    description: "Randomize your music library order",
  },
  {
    icon: "📋",
    title: "Playlists",
    description: "Create and manage your music playlists",
  },
];

export const appMetadata = {
  name: "iPod",
  version: "1.0",
  creator: {
    name: "Ryo Lu",
    url: "https://ryo.lu",
  },
  github: "https://github.com/ryokun6/ryos",
  icon: "/icons/ipod.png",
};

export const IpodApp: BaseApp = {
  id: "ipod",
  name: "iPod",
  icon: { type: "image", src: appMetadata.icon },
  description: "1st Generation iPod music player with YouTube integration",
  component: IpodAppComponent,
  helpItems,
  metadata: appMetadata,
};
