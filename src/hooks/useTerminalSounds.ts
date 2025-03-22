import { useEffect, useRef, useState, useCallback } from "react";
import * as Tone from "tone";

type SoundType = "command" | "error" | "aiResponse";

const TERMINAL_SOUND_PRESETS = {
  command: {
    oscillator: {
      type: "triangle" as const,
    },
    envelope: {
      attack: 0.005,
      decay: 0.1,
      sustain: 0,
      release: 0.1,
    },
    filter: {
      frequency: 3000,
      rolloff: -24 as const,
    },
    volume: -5,
    note: "C5",
    duration: "16n",
  },
  error: {
    oscillator: {
      type: "square" as const,
    },
    envelope: {
      attack: 0.01,
      decay: 0.3,
      sustain: 0.1,
      release: 0.2,
    },
    filter: {
      frequency: 1500,
      rolloff: -12 as const,
    },
    volume: -3,
    note: "E3",
    duration: "8n",
  },
  aiResponse: {
    oscillator: {
      type: "sine" as const,
    },
    envelope: {
      attack: 0.02,
      decay: 0.2,
      sustain: 0.1,
      release: 0.4,
    },
    filter: {
      frequency: 2000,
      rolloff: -24 as const,
    },
    volume: -8,
    note: "G4",
    duration: "16n",
  },
};

export function useTerminalSounds() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const lastSoundTimeRef = useRef(0);
  const synthsRef = useRef<Record<SoundType, Tone.Synth | null>>({
    command: null,
    error: null,
    aiResponse: null,
  });

  // Initialize synth on mount
  useEffect(() => {
    // Create synths for each sound type
    Object.entries(TERMINAL_SOUND_PRESETS).forEach(([type, preset]) => {
      const synth = createSynth(preset);
      synthsRef.current[type as SoundType] = synth;
    });

    return () => {
      // Dispose synths on unmount
      Object.values(synthsRef.current).forEach((synth) => {
        if (synth) synth.dispose();
      });
    };
  }, []);

  const initializeTone = useCallback(async () => {
    if (!isInitialized) {
      await Tone.start();
      setIsInitialized(true);
    }
  }, [isInitialized]);

  useEffect(() => {
    const handleFirstInteraction = () => {
      initializeTone();
      window.removeEventListener("click", handleFirstInteraction);
    };
    window.addEventListener("click", handleFirstInteraction);
    return () => window.removeEventListener("click", handleFirstInteraction);
  }, [initializeTone]);

  const playSound = useCallback(
    async (type: SoundType) => {
      if (isMuted) return;

      // Initialize Tone.js if not already initialized
      if (!isInitialized || Tone.context.state !== "running") {
        try {
          await Tone.start();
          setIsInitialized(true);
        } catch (error) {
          console.debug("Could not initialize Tone.js:", error);
          return;
        }
      }

      const synth = synthsRef.current[type];
      if (!synth) return;

      const preset = TERMINAL_SOUND_PRESETS[type];
      const now = Tone.now();
      const minTimeBetweenSounds = 0.15; // prevent sounds from overlapping too much

      if (now - lastSoundTimeRef.current >= minTimeBetweenSounds) {
        try {
          synth.triggerAttackRelease(preset.note, preset.duration, now);
          lastSoundTimeRef.current = now;
        } catch (error) {
          console.debug("Skipping sound due to timing", error);
        }
      }
    },
    [isMuted, isInitialized]
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  return {
    playCommandSound: () => {
      return playSound("command");
    },
    playErrorSound: () => {
      return playSound("error");
    },
    playAiResponseSound: () => {
      return playSound("aiResponse");
    },
    toggleMute,
    isMuted,
  };
}

function createSynth(preset: (typeof TERMINAL_SOUND_PRESETS)[SoundType]) {
  // Create effects chain
  const filter = new Tone.Filter({
    frequency: preset.filter.frequency,
    type: "lowpass",
    rolloff: preset.filter.rolloff,
  }).toDestination();

  const synth = new Tone.Synth({
    oscillator: preset.oscillator,
    envelope: preset.envelope,
  }).connect(filter);

  synth.volume.value = preset.volume;
  return synth;
}
