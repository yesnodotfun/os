import { BaseApp } from "../base/types";
import { FinderAppComponent } from "./components/FinderAppComponent";

export const helpItems = [
  {
    icon: "🔍",
    title: "Browse Files",
    description: "Navigate through your files and folders",
  },
  {
    icon: "📁",
    title: "Create Folders",
    description: "Organize your files with new folders",
  },
  {
    icon: "🗑️",
    title: "Delete Files",
    description: "Remove unwanted files and folders",
  },
];

export const appMetadata = {
  name: "Finder",
  version: "1.0.0",
  creator: {
    name: "Ryo",
    url: "https://github.com/ryoid",
  },
  github: "https://github.com/ryoid/soundboard",
  icon: "🔍",
};

export const FinderApp: BaseApp = {
  id: "finder",
  name: "Finder",
  description: "Browse and manage files",
  icon: {
    type: "image",
    src: "/icons/mac.png",
  },
  component: FinderAppComponent,
  helpItems,
  metadata: appMetadata,
};
