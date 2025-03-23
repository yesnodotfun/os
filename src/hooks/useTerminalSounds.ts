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

// Completion ding sound preset
const DING_PRESET = {
  oscillator: {
    type: "sine" as const,
  },
  envelope: {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.3,
    release: 0.5,
  },
  filter: {
    frequency: 5000,
    rolloff: -12 as const,
  },
  volume: -10,
  note: "A5",
  duration: "8n",
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

  // For elevator music
  const elevatorMusicRef = useRef<{
    isPlaying: boolean;
    pattern: Tone.Pattern<string> | null;
    synth: Tone.PolySynth | null;
    effects: Tone.ToneAudioNode[] | null;
  }>({
    isPlaying: false,
    pattern: null,
    synth: null,
    effects: null,
  });

  // For completion ding
  const dingSynthRef = useRef<Tone.Synth | null>(null);

  // Initialize synth on mount
  useEffect(() => {
    // Create synths for each sound type
    Object.entries(TERMINAL_SOUND_PRESETS).forEach(([type, preset]) => {
      const synth = createSynth(preset);
      synthsRef.current[type as SoundType] = synth;
    });

    // Create ding synth
    dingSynthRef.current = createSynth(DING_PRESET);

    // Create cute and fun ambient effects with less reverb/decay
    const reverb = new Tone.Reverb({
      decay: 3, // Shorter decay for more cutesy effect
      wet: 0.4, // Less reverb
    }).toDestination();

    const delay = new Tone.FeedbackDelay({
      delayTime: 0.3, // Shorter delay
      feedback: 0.2, // Less feedback for less moodiness
      wet: 0.2, // Subtle delay
    }).connect(reverb);

    // Use AM synth for brighter, cuter tones
    const cutePolySynth = new Tone.PolySynth(Tone.AMSynth).connect(delay);
    cutePolySynth.set({
      volume: -14, // Slightly louder
      harmonicity: 3,
      oscillator: {
        type: "fatsine", // Triangle for softer but brighter tone
      },
      envelope: {
        attack: 0.1, // Faster attack
        decay: 0.2, // Faster decay
        sustain: 0.3, // Less sustain for bouncier feel
        release: 0.8, // Shorter release
      },
      modulation: {
        type: "square", // Square for more playful sound
      },
      modulationEnvelope: {
        attack: 0.2,
        decay: 0.2,
        sustain: 0.2,
        release: 0.5,
      },
    });

    // Create cute and fun note pattern with higher pitched notes
    const cuteNotes = [
      "C5",
      "E5",
      "G5",
      "A5", // C major scale - bright and happy
      "D5",
      "F#5",
      "A5", // D major triad
      "G5",
      "B5",
      "D6", // G major triad - higher octave
      "E5",
      "G5",
      "C6", // C major 1st inversion
      "A5",
      "C6",
      "E6", // A minor high - sparkly
      "F5",
      "A5",
      "C6",
      "E6", // F major 7th - playful
      "G6",
      "E6",
      "C6", // High sparkly notes
    ];

    // More playful rhythm with alternating patterns
    const pattern = new Tone.Pattern(
      (time, note) => {
        if (
          !isMuted &&
          elevatorMusicRef.current.isPlaying &&
          elevatorMusicRef.current.synth
        ) {
          // Use shorter note durations for more playful feeling
          elevatorMusicRef.current.synth.triggerAttackRelease(note, "8n", time);
        }
      },
      cuteNotes,
      "upDown" // More predictable pattern for cute feeling
    );

    pattern.interval = "6n"; // Faster notes for more playful feel
    pattern.probability = 0.8; // Occasional random skips for playfulness
    pattern.humanize = true;

    // Store references
    elevatorMusicRef.current.pattern = pattern;
    elevatorMusicRef.current.synth = cutePolySynth;
    elevatorMusicRef.current.effects = [delay, reverb];

    return () => {
      // Dispose synths on unmount
      Object.values(synthsRef.current).forEach((synth) => {
        if (synth) synth.dispose();
      });

      if (dingSynthRef.current) {
        dingSynthRef.current.dispose();
      }

      // Dispose elevator music resources
      if (elevatorMusicRef.current.pattern) {
        elevatorMusicRef.current.pattern.dispose();
      }

      if (elevatorMusicRef.current.synth) {
        elevatorMusicRef.current.synth.dispose();
      }

      if (elevatorMusicRef.current.effects) {
        elevatorMusicRef.current.effects.forEach((effect) => effect.dispose());
      }
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

  // Play elevator music (atmospheric background sound)
  const playElevatorMusic = useCallback(async () => {
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

    // Start playing elevator music if not already playing
    if (!elevatorMusicRef.current.isPlaying) {
      elevatorMusicRef.current.isPlaying = true;

      // Start the pattern
      if (elevatorMusicRef.current.pattern) {
        if (Tone.Transport.state !== "started") {
          Tone.Transport.start();
        }
        elevatorMusicRef.current.pattern.start(0);
      }
    }
  }, [isMuted, isInitialized]);

  // Stop elevator music
  const stopElevatorMusic = useCallback(() => {
    elevatorMusicRef.current.isPlaying = false;

    // Optionally stop the pattern completely
    if (elevatorMusicRef.current.pattern) {
      elevatorMusicRef.current.pattern.stop();
    }
  }, []);

  // Play completion "ding" sound
  const playDingSound = useCallback(async () => {
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

    if (dingSynthRef.current) {
      const now = Tone.now();
      try {
        dingSynthRef.current.triggerAttackRelease("C6", "16n", now);
      } catch (error) {
        console.debug("Error playing ding sound:", error);
      }
    }
  }, [isMuted, isInitialized]);

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
    playElevatorMusic,
    stopElevatorMusic,
    playDingSound,
    toggleMute,
    isMuted,
  };
}

function createSynth(
  preset: (typeof TERMINAL_SOUND_PRESETS)[SoundType] | typeof DING_PRESET
) {
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
