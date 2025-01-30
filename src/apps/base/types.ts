import React from "react";

export interface AppProps {
  onClose: () => void;
  isWindowOpen: boolean;
  isForeground?: boolean;
  className?: string;
  helpItems?: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
}

export interface BaseApp {
  id: "soundboard" | "internet-explorer" | "chats";
  name: string;
  icon: string | { type: "image"; src: string };
  description: string;
  component: React.ComponentType<AppProps>;
  windowConstraints?: {
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
  };
  helpItems?: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
  metadata?: {
    name: string;
    version: string;
    creator: {
      name: string;
      url: string;
    };
    github: string;
    icon: string;
  };
}

export interface AppState {
  isOpen: boolean;
  position?: { x: number; y: number };
  isForeground?: boolean;
}

export interface AppManagerState {
  [appId: string]: AppState;
}
