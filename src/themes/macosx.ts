import { OsTheme } from "./types";

export const macosx: OsTheme = {
  id: "macosx",
  name: "Mac OS X",
  fonts: {
    ui: "Lucida Grande, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "Monaco, Menlo, monospace",
  },
  colors: {
    windowBg: "#ECECEC",
    menubarBg: "linear-gradient(to bottom, #FAFAFA, #D1D1D1)",
    menubarBorder: "#8E8E8E",
    windowBorder: "#7C7C7C",
    titleBar: {
      activeBg: "linear-gradient(to bottom, #EDEDED, #C8C8C8)",
      inactiveBg: "linear-gradient(to bottom, #F6F6F6, #E0E0E0)",
      text: "#000000",
      inactiveText: "#7F7F7F",
    },
    button: {
      face: "#FFFFFF",
      highlight: "#FFFFFF",
      shadow: "#999999",
      activeFace: "#E0E0E0",
    },
    trafficLights: {
      close: "#FF5F57",
      minimize: "#FFBD2E",
      maximize: "#28CA42",
    },
    selection: {
      bg: "#3875D7",
      text: "#FFFFFF",
    },
    text: {
      primary: "#000000",
      secondary: "#4B4B4B",
      disabled: "#999999",
    },
  },
  metrics: {
    borderWidth: "1px",
    radius: "0.375rem", // 6px - subtle rounding
    titleBarHeight: "1.375rem", // 22px - classic OS X height
    windowShadow: "0 3px 10px rgba(0,0,0,0.3)",
  },
  wallpaperDefaults: {
    photo: "/wallpapers/photos/landscapes/french_alps.jpg",
  },
};
