import { WindowSize } from "../types/types";

interface WindowConstraints {
  minSize?: WindowSize;
  maxSize?: WindowSize;
  defaultSize: WindowSize;
  mobileDefaultSize?: WindowSize;
}

export const windowConfig: Record<string, WindowConstraints> = {
  textedit: {
    defaultSize: { width: 420, height: 475 },
    minSize: { width: 300, height: 200 },
  },
  "internet-explorer": {
    defaultSize: { width: 730, height: 600 },
    minSize: { width: 400, height: 300 },
  },
  chats: {
    defaultSize: { width: 316, height: 360 },
    minSize: { width: 280, height: 320 },
  },
  soundboard: {
    defaultSize: { width: 800, height: 475 },
    minSize: { width: 400, height: 300 },
  },
  "control-panels": {
    defaultSize: { width: 480, height: 400 },
    minSize: { width: 320, height: 240 },
  },
  minesweeper: {
    defaultSize: { width: 305, height: 380 },
    minSize: { width: 305, height: 380 },
    maxSize: { width: 305, height: 380 },
  },
  finder: {
    defaultSize: { width: 400, height: 400 },
    minSize: { width: 300, height: 200 },
  },
};

// Default constraints for any app not specified above
export const defaultWindowConstraints: WindowConstraints = {
  defaultSize: { width: 800, height: 475 },
  minSize: { width: 300, height: 200 },
};

export const getWindowConfig = (appId: string): WindowConstraints => {
  return windowConfig[appId] || defaultWindowConstraints;
};

export const getMobileWindowSize = (config: WindowConstraints): WindowSize => {
  if (config.mobileDefaultSize) {
    return config.mobileDefaultSize;
  }
  return {
    width: window.innerWidth,
    height: config.defaultSize.height,
  };
};
