import { useCallback, useEffect, useRef } from "react";
import { useAppStore } from "@/stores/useAppStore";

// Global audio context and cache
let audioContext: AudioContext | null = null;
const audioBufferCache = new Map<string, AudioBuffer>();
const activeSources = new Set<AudioBufferSourceNode>();

// Return a valid AudioContext instance, recreating it (and clearing caches) if the
// previous one was closed – a common situation on iOS Safari when the page is
// backgrounded for a while.
const getAudioContext = () => {
  // Re-create if it never existed or if the browser has closed it behind our back
  if (!audioContext || audioContext.state === "closed") {
    try {
      audioContext = new AudioContext();
      // When a fresh context is created the previously decoded buffers belong
      // to the old (now closed) context – they will be invalid and may even
      // throw. Clear the cache so we can lazily re-decode on demand.
      audioBufferCache.clear();
      console.debug("Created new AudioContext and cleared buffer cache");
    } catch (err) {
      console.error("Failed to create AudioContext:", err);
    }
  }
  return audioContext!;
};

// Resume audio context - important for iOS
const resumeAudioContext = async () => {
  let ctx = getAudioContext();

  // Safari may move the context into a non-standard "interrupted" state when the
  // page loses the audio hardware (e.g. the user switches apps or receives a
  // phone call). In that case we need to call resume() as well.
  let state = ctx.state as AudioContextState | "interrupted";
  if (state === "suspended" || state === "interrupted") {
    try {
      await ctx.resume();
      console.debug("Audio context resumed");
    } catch (error) {
      console.error("Failed to resume audio context:", error);
    }
  }

  // If for some reason the context is still not running (a situation observed on
  // some iOS Safari versions after returning from background), fall back to
  // recreating a brand-new AudioContext so that subsequent playback works.
  state = ctx.state as AudioContextState | "interrupted";
  if (state !== "running") {
    try {
      console.debug(
        `AudioContext still in state "${state}" after resume – recreating`
      );
      await ctx.close();
    } catch (_) {
      /* ignored */
    }

    // Null-out so getAudioContext() makes a fresh one and clears caches.
    audioContext = null;
    ctx = getAudioContext();
  }
};

// Add global event listeners for visibility and focus
if (typeof document !== "undefined" && typeof window !== "undefined") {
  // Handle page visibility change (when app is switched to/from background)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      resumeAudioContext();
    }
  });

  // Handle window focus (when app regains focus)
  window.addEventListener("focus", resumeAudioContext);
}

// Preload a single sound and add it to cache
const preloadSound = async (soundPath: string): Promise<AudioBuffer> => {
  if (audioBufferCache.has(soundPath)) {
    return audioBufferCache.get(soundPath)!;
  }

  try {
    const response = await fetch(soundPath);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await getAudioContext().decodeAudioData(arrayBuffer);
    audioBufferCache.set(soundPath, audioBuffer);
    return audioBuffer;
  } catch (error) {
    console.error("Error loading sound:", error);
    throw error;
  }
};

// Preload multiple sounds at once
export const preloadSounds = async (sounds: string[]) => {
  await Promise.all(sounds.map(preloadSound));
};

export function useSound(soundPath: string, volume: number = 0.3) {
  const gainNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    // Create gain node for volume control
    gainNodeRef.current = getAudioContext().createGain();
    gainNodeRef.current.gain.value = volume;

    // Connect to destination
    gainNodeRef.current.connect(getAudioContext().destination);

    return () => {
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
      }
    };
  }, [volume]);

  const play = useCallback(async () => {
    // Check if UI sounds are enabled via global store
    if (!useAppStore.getState().uiSoundsEnabled) {
      return;
    }

    try {
      // Ensure audio context is running before playing
      await resumeAudioContext();
      
      const audioBuffer = await preloadSound(soundPath);
      // If the gain node belongs to a stale AudioContext (closed), recreate it
      if (!gainNodeRef.current || gainNodeRef.current.context.state === "closed") {
        if (gainNodeRef.current) {
          try {
            gainNodeRef.current.disconnect();
          } catch (_) {}
        }
        gainNodeRef.current = getAudioContext().createGain();
        gainNodeRef.current.gain.value = volume;
        gainNodeRef.current.connect(getAudioContext().destination);
      }

      const source = getAudioContext().createBufferSource();
      source.buffer = audioBuffer;

      // Connect to (possibly re-created) gain node
      source.connect(gainNodeRef.current);

      // Set volume
      gainNodeRef.current.gain.value = volume;

      // If too many concurrent sources are active, skip to avoid audio congestion
      if (activeSources.size > 32) {
        console.debug("Skipping sound – too many concurrent sources");
        return;
      }

      // Play the sound
      source.start(0);

      // Add to active sources
      activeSources.add(source);

      // Clean up when done
      source.onended = () => {
        activeSources.delete(source);
      };
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  }, [volume, soundPath]);

  // Additional control methods
  const stop = useCallback(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = 0;
    }
  }, []);

  const fadeOut = useCallback(
    (duration: number = 0.5) => {
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.setValueAtTime(
          volume,
          getAudioContext().currentTime
        );
        gainNodeRef.current.gain.linearRampToValueAtTime(
          0,
          getAudioContext().currentTime + duration
        );
      }
    },
    [volume]
  );

  const fadeIn = useCallback(
    (duration: number = 0.5) => {
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.setValueAtTime(
          0,
          getAudioContext().currentTime
        );
        gainNodeRef.current.gain.linearRampToValueAtTime(
          volume,
          getAudioContext().currentTime + duration
        );
      }
    },
    [volume]
  );

  return { play, stop, fadeOut, fadeIn };
}

// Predefined sound paths for easy access
export const Sounds = {
  ALERT_SOSUMI: "/sounds/AlertSosumi.mp3",
  WINDOW_CLOSE: "/sounds/WindowClose.mp3",
  WINDOW_OPEN: "/sounds/WindowOpen.mp3",
  WINDOW_EXPAND: "/sounds/WindowExpand.mp3",
  WINDOW_COLLAPSE: "/sounds/WindowCollapse.mp3",
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
  // Video player sounds
  VIDEO_TAPE: "/sounds/VideoTapeIn.mp3",
  // Photo booth sounds
  PHOTO_SHUTTER: "/sounds/PhotoShutter.mp3",
  // Boot sound
  BOOT: "/sounds/Boot.mp3",
} as const;

// Lazily preload sounds after the first user interaction (click or touch)
if (typeof document !== "undefined") {
  const handleFirstInteraction = () => {
preloadSounds(Object.values(Sounds));
    // Remove listeners after first invocation to avoid repeated work
    document.removeEventListener("click", handleFirstInteraction);
    document.removeEventListener("touchstart", handleFirstInteraction);
  };

  // Use `once: true` to ensure the handler fires a single time
  document.addEventListener("click", handleFirstInteraction, { once: true });
  document.addEventListener("touchstart", handleFirstInteraction, {
    once: true,
  });
}
