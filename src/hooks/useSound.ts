import { useCallback, useEffect, useRef } from "react";

export function useSound(soundPath: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Pre-load the audio when the hook is initialized
    audioRef.current = new Audio(soundPath);
    audioRef.current.load();

    // Cleanup on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [soundPath]);

  const play = useCallback(() => {
    if (!audioRef.current) {
      return;
    }

    const playPromise = async () => {
      try {
        audioRef.current!.currentTime = 0;
        await audioRef.current!.play();
      } catch (error) {
        console.error("Error playing sound:", error);
      }
    };

    playPromise();
  }, []);

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
} as const;
