import { BaseApp } from "../base/types";
import { TextEditAppComponent } from "./components/TextEditAppComponent";

export const helpItems = [
  {
    icon: "📝",
    title: "Edit",
    description: "Type and format your text",
  },
  {
    icon: "🎨",
    title: "Format",
    description: "Bold, italic, underline, and align text",
  },
  {
    icon: "📋",
    title: "Lists",
    description: "Create ordered and unordered lists",
  },
  {
    icon: "💾",
    title: "Save",
    description: "Auto-saves your work",
  },
  {
    icon: "⚡",
    title: "Slash Commands",
    description: "Type / to access quick formatting commands",
  },
];

export const appMetadata = {
  name: "TextEdit",
  version: "1.0",
  creator: {
    name: "Ryo Lu",
    url: "https://ryo.lu",
  },
  github: "https://github.com/ryokun6/soundboard",
  icon: "/icons/textedit.png",
};

export const TextEditApp: BaseApp = {
  id: "textedit",
  name: "TextEdit",
  icon: { type: "image", src: appMetadata.icon },
  description: "A simple rich text editor",
  component: TextEditAppComponent,
  helpItems,
  metadata: appMetadata,
  windowConstraints: {
    minWidth: 400,
    minHeight: 300,
  },
};
