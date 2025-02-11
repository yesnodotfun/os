import { useCallback, useEffect, useRef } from "react";
import { loadUISoundsEnabled } from "@/utils/storage";

// Global audio cache to store preloaded sounds
const audioCache = new Map<string, HTMLAudioElement>();

// Preload a single sound and add it to cache
const preloadSound = (
  soundPath: string,
  volume: number = 0.3
): HTMLAudioElement => {
  if (audioCache.has(soundPath)) {
    return audioCache.get(soundPath)!;
  }

  const audio = new Audio(soundPath);
  audio.volume = volume;
  audio.load();
  audioCache.set(soundPath, audio);
  return audio;
};

// Preload multiple sounds at once
export const preloadSounds = (sounds: string[]) => {
  sounds.forEach((soundPath) => preloadSound(soundPath));
};

export function useSound(soundPath: string, volume: number = 0.3) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Use cached audio or create new one
    audioRef.current = preloadSound(soundPath, volume);

    // No need to cleanup from cache, just pause the current instance
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [soundPath, volume]);

  const play = useCallback(() => {
    // Check if UI sounds are enabled
    if (!loadUISoundsEnabled()) {
      return;
    }

    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const playPromise = async () => {
      try {
        // Create a new audio instance from the cached one if it's currently playing
        if (!audio.paused && audio.currentTime > 0) {
          const newAudio = audioCache
            .get(soundPath)
            ?.cloneNode(true) as HTMLAudioElement;
          if (newAudio) {
            newAudio.volume = volume;
            await newAudio.play();
            return;
          }
        }

        audio.currentTime = 0;
        audio.volume = volume;
        await audio.play();
      } catch (error) {
        console.error("Error playing sound:", error);
      }
    };

    playPromise();
  }, [volume, soundPath]);

  return { play };
}

// Predefined sound paths for easy access
export const Sounds = {
  ALERT_SOSUMI: "/sounds/AlertSosumi.mp3",
  WINDOW_CLOSE: "/sounds/WindowClose.mp3",
  WINDOW_OPEN: "/sounds/WindowOpen.mp3",
  BUTTON_CLICK: "/sounds/ButtonClickDown.mp3",
  MENU_OPEN: "/sounds/MenuOpen.mp3",
  MENU_CLOSE: "/sounds/MenuClose.mp3",
  // Window movement and resize sounds
  WINDOW_MOVE_MOVING: "/sounds/WindowMoveMoving.mp3",
  WINDOW_MOVE_STOP: "/sounds/WindowMoveStop.mp3",
  WINDOW_RESIZE_RESIZING: "/sounds/WindowResizeResizing.mp3",
  WINDOW_RESIZE_STOP: "/sounds/WindowResizeStop.mp3",
  // Minesweeper sounds
  CLICK: "/sounds/Click.mp3",
  ALERT_BONK: "/sounds/AlertBonk.mp3",
  ALERT_INDIGO: "/sounds/AlertIndigo.mp3",
  MSN_NUDGE: "/sounds/MSNNudge.mp3",
} as const;

// Preload all predefined sounds
preloadSounds(Object.values(Sounds));
