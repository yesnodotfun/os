import { BaseApp } from "../base/types";
import { InternetExplorerAppComponent } from "./components/InternetExplorerAppComponent";

export const helpItems = [
  {
    icon: "🌐",
    title: "Browse",
    description: "Enter URLs to browse the web",
  },
  {
    icon: "⭐",
    title: "Favorites",
    description: "Save and manage your favorite sites",
  },
  {
    icon: "🔄",
    title: "Refresh",
    description: "Reload the current page",
  },
  {
    icon: "🏠",
    title: "Home",
    description: "Return to the home page",
  },
  {
    icon: "⏹️",
    title: "Stop",
    description: "Stop loading the current page",
  },
  {
    icon: "🖥️",
    title: "Classic",
    description: "Windows 98 style aesthetics",
  },
];

export const appMetadata = {
  version: "1.02",
  name: "Internet Explorer",
  creator: {
    name: "Ryo Lu",
    url: "https://ryo.lu",
  },
  github: "https://github.com/ryokun6/soundboard",
  icon: "/icons/ie.png",
};

export const InternetExplorerApp: BaseApp = {
  id: "internet-explorer",
  name: "Internet Explorer",
  icon: { type: "image", src: appMetadata.icon },
  description: "Browse the web like it's 1999",
  component: InternetExplorerAppComponent,
  helpItems,
  metadata: appMetadata,
};
