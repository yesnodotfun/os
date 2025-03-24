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
    players: {
      player: Tone.Player | null;
      interval: Tone.Loop | null;
    }[];
    generativePlayers: {
      synth: Tone.PolySynth | Tone.MonoSynth | null;
      pattern: Tone.Pattern<string> | null;
    }[];
    notePool: string[];
    melodySequencer: {
      synth: Tone.MonoSynth | null;
      currentMelody: string[];
      currentIndex: number;
      timeout: number | null;
    };
    effects: Tone.ToneAudioNode[] | null;
    timeoutIds: number[];
  }>({
    isPlaying: false,
    players: [],
    generativePlayers: [],
    notePool: [],
    melodySequencer: {
      synth: null,
      currentMelody: [],
      currentIndex: 0,
      timeout: null,
    },
    effects: null,
    timeoutIds: [],
  });

  // Function to generate a Brian Eno inspired ambient sound environment
  const setupAmbientEnvironment = useCallback(() => {
    // Dispose of any existing effects or players
    if (elevatorMusicRef.current.effects) {
      elevatorMusicRef.current.effects.forEach((effect) => effect.dispose());
    }

    elevatorMusicRef.current.players.forEach(({ player, interval }) => {
      if (player) player.dispose();
      if (interval) interval.dispose();
    });

    elevatorMusicRef.current.generativePlayers.forEach(({ synth, pattern }) => {
      if (synth) synth.dispose();
      if (pattern) pattern.dispose();
    });

    // Clear any ongoing timeouts
    elevatorMusicRef.current.timeoutIds.forEach((id) =>
      window.clearTimeout(id)
    );

    // Cancel any melody timeout
    if (elevatorMusicRef.current.melodySequencer.timeout) {
      window.clearTimeout(elevatorMusicRef.current.melodySequencer.timeout);
    }

    // Reset the arrays
    elevatorMusicRef.current.players = [];
    elevatorMusicRef.current.generativePlayers = [];
    elevatorMusicRef.current.timeoutIds = [];

    // Brian Eno inspired ambient effects chain
    const reverb = new Tone.Reverb({
      decay: 10, // Very long reverb decay
      wet: 0.8, // High reverb mix
    }).toDestination();

    const delay = new Tone.PingPongDelay({
      delayTime: 0.7,
      feedback: 0.5,
      wet: 0.3,
    }).connect(reverb);

    const filter = new Tone.Filter({
      type: "lowpass",
      frequency: 2000,
      Q: 1,
    }).connect(delay);

    // Create a note pool for generative composition
    // Using notes from Db major pentatonic scale, which gives an ethereal sound
    const notePool = [
      "Db3",
      "Eb3",
      "Gb3",
      "Ab3",
      "Bb3",
      "Db4",
      "Eb4",
      "Gb4",
      "Ab4",
      "Bb4",
      "Db5",
      "Eb5",
    ];
    elevatorMusicRef.current.notePool = notePool;

    // Create melody synth
    const melodySynth = new Tone.MonoSynth().connect(filter);
    melodySynth.set({
      volume: -15,
      oscillator: {
        type: "triangle",
      },
      envelope: {
        attack: 0.02,
        decay: 0.2,
        sustain: 0.2,
        release: 0.8,
      },
      filterEnvelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.6,
        release: 1.5,
        baseFrequency: 800,
        octaves: 2,
      },
    });

    // Initialize melody sequencer
    elevatorMusicRef.current.melodySequencer = {
      synth: melodySynth,
      currentMelody: [],
      currentIndex: 0,
      timeout: null,
    };

    // Create pad sounds
    const createPadSynth = () => {
      const padSynth = new Tone.PolySynth(Tone.FMSynth).connect(filter);
      padSynth.set({
        volume: -18,
        harmonicity: 3.5,
        modulationIndex: 10,
        oscillator: {
          type: "sine",
        },
        envelope: {
          attack: 3,
          decay: 2,
          sustain: 0.8,
          release: 8,
        },
        modulation: {
          type: "sine",
        },
        modulationEnvelope: {
          attack: 4,
          decay: 2,
          sustain: 0.5,
          release: 10,
        },
      });

      return padSynth;
    };

    // Create a soft piano/bell-like synth
    const createBellSynth = () => {
      const bellSynth = new Tone.MonoSynth().connect(filter);
      bellSynth.set({
        volume: -20,
        oscillator: {
          type: "sine",
        },
        envelope: {
          attack: 0.1,
          decay: 0.8,
          sustain: 0.4,
          release: 4,
        },
        filterEnvelope: {
          attack: 0.1,
          decay: 0.2,
          sustain: 0.1,
          release: 2,
          baseFrequency: 300,
          octaves: 2,
        },
      });

      return bellSynth;
    };

    // Create generative players
    const padSynth1 = createPadSynth();
    const padSynth2 = createPadSynth();
    const bellSynth = createBellSynth();

    // Store synths in ref
    elevatorMusicRef.current.generativePlayers = [
      { synth: padSynth1, pattern: null },
      { synth: padSynth2, pattern: null },
      { synth: bellSynth, pattern: null },
    ];

    // Store effects chain
    elevatorMusicRef.current.effects = [filter, delay, reverb];
  }, []);

  // Function to randomly select notes from the pool
  const getRandomNote = useCallback(() => {
    const notePool = elevatorMusicRef.current.notePool;
    return notePool[Math.floor(Math.random() * notePool.length)];
  }, []);

  // Generate an evolving pattern of notes
  const generateEnoSequence = useCallback(() => {
    if (!elevatorMusicRef.current.isPlaying) return;

    const { generativePlayers, timeoutIds } = elevatorMusicRef.current;

    // Play a sustained pad chord occasionally
    if (Math.random() < 0.3 && generativePlayers[0]?.synth) {
      const padSynth = generativePlayers[0].synth;
      const chordNotes = [
        getRandomNote(),
        elevatorMusicRef.current.notePool[
          Math.floor(Math.random() * elevatorMusicRef.current.notePool.length)
        ],
      ];

      try {
        padSynth.triggerAttackRelease(chordNotes[0], "8n");
        if (chordNotes.length > 1) {
          // Trigger remaining notes individually
          for (let i = 1; i < chordNotes.length; i++) {
            padSynth.triggerAttackRelease(chordNotes[i], "8n");
          }
        }
      } catch (error) {
        console.debug("Error playing pad sound:", error);
      }
    }

    // Play occasional bell-like tones with longer intervals
    if (Math.random() < 0.15 && generativePlayers[2]?.synth) {
      const bellSynth = generativePlayers[2].synth;
      const note = getRandomNote();

      try {
        bellSynth.triggerAttackRelease(note, "4n");
      } catch (error) {
        console.debug("Error playing bell sound:", error);
      }
    }

    // Schedule next note generation with variable timing
    // This creates the sense of unpredictability and organic evolution
    const nextInterval = 800 + Math.random() * 2500; // Between 0.8 and 3.3 seconds (faster than before)
    const timeoutId = window.setTimeout(() => {
      generateEnoSequence();
    }, nextInterval);

    timeoutIds.push(timeoutId);
  }, [getRandomNote]);

  // Play occasional swelling pad chord
  const playSwellPad = useCallback(() => {
    if (!elevatorMusicRef.current.isPlaying) return;

    const { generativePlayers, timeoutIds } = elevatorMusicRef.current;

    if (generativePlayers[1]?.synth) {
      const padSynth = generativePlayers[1].synth;

      // Create a chord from notes in our pool
      const rootNote = getRandomNote();
      const chordNotes = [rootNote];

      // Add 1-2 more notes sometimes for a chord
      if (Math.random() < 0.7) {
        const secondNote =
          elevatorMusicRef.current.notePool[
            Math.floor(Math.random() * elevatorMusicRef.current.notePool.length)
          ];
        chordNotes.push(secondNote);

        if (Math.random() < 0.4) {
          const thirdNote =
            elevatorMusicRef.current.notePool[
              Math.floor(
                Math.random() * elevatorMusicRef.current.notePool.length
              )
            ];
          chordNotes.push(thirdNote);
        }
      }

      try {
        // Long sustain for ambient pad swells
        padSynth.triggerAttackRelease(chordNotes[0], "2n");
        if (chordNotes.length > 1) {
          // Trigger remaining notes individually
          for (let i = 1; i < chordNotes.length; i++) {
            padSynth.triggerAttackRelease(chordNotes[i], "2n");
          }
        }
      } catch (error) {
        console.debug("Error playing swell pad:", error);
      }
    }

    // Schedule next pad swell with long, variable timing
    const nextInterval = 4000 + Math.random() * 8000; // Between 4 and 12 seconds (faster than before)
    const timeoutId = window.setTimeout(() => {
      playSwellPad();
    }, nextInterval);

    timeoutIds.push(timeoutId);
  }, [getRandomNote]);

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

    return () => {
      // Dispose synths on unmount
      Object.values(synthsRef.current).forEach((synth) => {
        if (synth) synth.dispose();
      });

      if (dingSynthRef.current) {
        dingSynthRef.current.dispose();
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

  // Add visibility change and focus handlers to resume audio context
  useEffect(() => {
    const resumeAudioContext = async () => {
      if (Tone.context.state === "suspended") {
        try {
          await Tone.context.resume();
          console.debug("Audio context resumed");
        } catch (error) {
          console.error("Failed to resume audio context:", error);
        }
      }
    };

    // Handle page visibility change (when app is switched to/from background)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        await resumeAudioContext();
      }
    };

    // Handle window focus (when app regains focus)
    const handleFocus = async () => {
      await resumeAudioContext();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const playSound = useCallback(
    async (type: SoundType) => {
      if (isMuted) return;

      // Initialize Tone.js if not already initialized
      if (!isInitialized || Tone.context.state !== "running") {
        try {
          await Tone.start();
          setIsInitialized(true);
          
          // For iOS, explicitly resume the audio context
          if (Tone.context.state === "suspended") {
            await Tone.context.resume();
          }
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

  // Generate a melodic sequence from the note pool
  const generateMelodySequence = useCallback(() => {
    const { notePool } = elevatorMusicRef.current;
    const length = 4 + Math.floor(Math.random() * 4); // Melodies of 4-7 notes
    const melody: string[] = [];

    // Start with the root note sometimes
    if (Math.random() < 0.4) {
      melody.push("Db4");
    } else {
      melody.push(notePool[Math.floor(Math.random() * notePool.length)]);
    }

    // Generate the rest of the melody with some musical logic
    for (let i = 1; i < length; i++) {
      // 60% chance to move stepwise in the scale
      if (Math.random() < 0.6) {
        const lastIndex = notePool.indexOf(melody[i - 1]);
        const stepUp = Math.random() < 0.5;

        if (stepUp && lastIndex < notePool.length - 1) {
          melody.push(notePool[lastIndex + 1]);
        } else if (!stepUp && lastIndex > 0) {
          melody.push(notePool[lastIndex - 1]);
        } else {
          // Fallback if we can't move in the desired direction
          melody.push(notePool[Math.floor(Math.random() * notePool.length)]);
        }
      }
      // 20% chance to repeat the last note
      else if (Math.random() < 0.25) {
        melody.push(melody[i - 1]);
      }
      // Otherwise, random note from the scale
      else {
        melody.push(notePool[Math.floor(Math.random() * notePool.length)]);
      }
    }

    return melody;
  }, []);

  // Play the next note in the current melody
  const playNextMelodyNote = useCallback(() => {
    if (!elevatorMusicRef.current.isPlaying) return;

    const { melodySequencer, timeoutIds } = elevatorMusicRef.current;
    const { synth, currentMelody, currentIndex } = melodySequencer;

    if (!synth || currentMelody.length === 0) return;

    // Play the current note
    try {
      const note = currentMelody[currentIndex];
      synth.triggerAttackRelease(note, "16n");

      // Move to next note or get new melody
      const nextIndex = (currentIndex + 1) % currentMelody.length;
      elevatorMusicRef.current.melodySequencer.currentIndex = nextIndex;

      // Generate new melody if we've completed the current one and randomly decide to change
      if (nextIndex === 0 && Math.random() < 0.7) {
        elevatorMusicRef.current.melodySequencer.currentMelody =
          generateMelodySequence();
      }

      // Schedule next note with slight rhythm variations
      const nextInterval = 200 + Math.random() * 150; // 200-350ms between notes
      const timeoutId = window.setTimeout(() => {
        playNextMelodyNote();
      }, nextInterval);

      // Only start playing melodies occasionally
      if (melodySequencer.timeout !== null) {
        melodySequencer.timeout = timeoutId;
      }
      timeoutIds.push(timeoutId);
    } catch (error) {
      console.debug("Error playing melody note:", error);
    }
  }, [generateMelodySequence]);

  // Occasionally start a melody
  const scheduleNextMelody = useCallback(() => {
    if (!elevatorMusicRef.current.isPlaying) return;

    const { timeoutIds } = elevatorMusicRef.current;

    // Sometimes start a new melody
    if (Math.random() < 0.4) {
      // Generate a new melody
      elevatorMusicRef.current.melodySequencer.currentMelody =
        generateMelodySequence();
      elevatorMusicRef.current.melodySequencer.currentIndex = 0;

      // Start playing the melody
      playNextMelodyNote();
    }

    // Schedule next melody check (with gaps between melodies)
    const nextMelodyInterval = 2000 + Math.random() * 5000; // 2-7 seconds between melody attempts
    const timeoutId = window.setTimeout(() => {
      scheduleNextMelody();
    }, nextMelodyInterval);

    timeoutIds.push(timeoutId);
    elevatorMusicRef.current.melodySequencer.timeout = timeoutId;
  }, [generateMelodySequence, playNextMelodyNote]);

  // Play elevator music (atmospheric background sound)
  const playElevatorMusic = useCallback(async () => {
    if (isMuted) return;

    // Initialize Tone.js if not already initialized
    if (!isInitialized || Tone.context.state !== "running") {
      try {
        await Tone.start();
        setIsInitialized(true);
        
        // For iOS, we need to explicitly resume the audio context
        if (Tone.context.state === "suspended") {
          await Tone.context.resume();
        }
      } catch (error) {
        console.debug("Could not initialize Tone.js:", error);
        return;
      }
    }

    // Start playing elevator music if not already playing
    if (!elevatorMusicRef.current.isPlaying) {
      elevatorMusicRef.current.isPlaying = true;

      // Setup the ambient environment
      setupAmbientEnvironment();

      // Ensure context is running before starting sounds
      if (Tone.context.state !== "running") {
        try {
          await Tone.context.resume();
        } catch (error) {
          console.debug("Could not resume audio context:", error);
          return;
        }
      }

      // Start the generative processes
      generateEnoSequence();
      playSwellPad();
      scheduleNextMelody();

      // Start the transport if it's not already started
      if (Tone.Transport.state !== "started") {
        Tone.Transport.start();
      }
    }
  }, [
    isMuted,
    isInitialized,
    setupAmbientEnvironment,
    generateEnoSequence,
    playSwellPad,
    scheduleNextMelody,
  ]);

  // Stop elevator music
  const stopElevatorMusic = useCallback(() => {
    elevatorMusicRef.current.isPlaying = false;

    // Clear all timeout ids
    elevatorMusicRef.current.timeoutIds.forEach((id) =>
      window.clearTimeout(id)
    );
    elevatorMusicRef.current.timeoutIds = [];

    // Stop all synths
    elevatorMusicRef.current.generativePlayers.forEach(({ synth }) => {
      if (synth) {
        try {
          if ("releaseAll" in synth) {
            (synth as Tone.PolySynth).releaseAll();
          } else {
            // For MonoSynth, trigger release
            (synth as Tone.MonoSynth).triggerRelease();
          }
        } catch (error) {
          console.debug("Error releasing synth:", error);
        }
      }
    });

    // Stop melody synth
    if (elevatorMusicRef.current.melodySequencer.synth) {
      try {
        elevatorMusicRef.current.melodySequencer.synth.triggerRelease();
      } catch (error) {
        console.debug("Error releasing melody synth:", error);
      }
    }

    // Cancel melody timeout
    if (elevatorMusicRef.current.melodySequencer.timeout) {
      window.clearTimeout(elevatorMusicRef.current.melodySequencer.timeout);
      elevatorMusicRef.current.melodySequencer.timeout = null;
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
        
        // For iOS, explicitly resume the audio context
        if (Tone.context.state === "suspended") {
          await Tone.context.resume();
        }
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
