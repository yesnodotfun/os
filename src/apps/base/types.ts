import React from "react";

export interface AppMenuBarProps {
  onToggleWindow: () => void;
  isWindowOpen: boolean;
}

export interface AppWindowProps {
  onClose: () => void;
}

export interface BaseApp {
  id: string;
  name: string;
  icon: string;
  description: string;
  MenuBar: React.ComponentType<AppMenuBarProps>;
  Window: React.ComponentType<AppWindowProps>;
}

export interface AppState {
  isOpen: boolean;
  position?: { x: number; y: number };
}

export interface AppManagerState {
  [appId: string]: AppState;
}
