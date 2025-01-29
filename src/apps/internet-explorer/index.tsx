import { BaseApp } from "../base/types";
import { InternetExplorerAppComponent } from "./components/InternetExplorerAppComponent";

export const InternetExplorerApp: BaseApp = {
  id: "internet-explorer",
  name: "Internet Explorer",
  icon: { type: "image", src: "/icons/ie.png" },
  description: "Browse the web like it's 1999",
  component: InternetExplorerAppComponent,
};
