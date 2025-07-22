export type OsThemeId = "system7" | "macosx" | "xp" | "win98";

export interface OsTheme {
  id: OsThemeId;
  name: string;
  fonts: {
    ui: string;
    mono?: string;
  };
  colors: {
    windowBg: string;
    menubarBg: string;
    menubarBorder: string;
    windowBorder: string;
    titleBar: {
      activeBg: string;
      inactiveBg: string;
      text: string;
      inactiveText: string;
      pattern?: string; // For System 7's dotted pattern
    };
    button: {
      face: string;
      highlight: string;
      shadow: string;
      activeFace?: string;
    };
    trafficLights?: {
      close: string;
      minimize: string;
      maximize: string;
    };
    selection: {
      bg: string;
      text: string;
    };
    text: {
      primary: string;
      secondary: string;
      disabled: string;
    };
  };
  metrics: {
    borderWidth: string;
    radius: string;
    titleBarHeight: string;
    windowShadow: string;
  };
  assets?: {
    closeButton?: string;
    maximizeButton?: string;
    minimizeButton?: string;
  };
  wallpaperDefaults?: {
    photo?: string;
    tile?: string;
    video?: string;
  };
}
