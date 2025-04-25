import { useEffect, useRef, useState, useCallback } from "react";
import * as Tone from "tone";

type SoundType = "command" | "error" | "aiResponse";
type TimeMode = "past" | "future" | "now";

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
    timeMode: TimeMode;
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
    timeMode: "now",
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

  // Function to generate a Brian Eno inspired ambient sound environment (for past and now)
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

  // Function to set up futuristic sound environment for time travel to the future
  const setupFuturisticEnvironment = useCallback(() => {
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

    // Simplified celestial effects chain with fewer elements - deeper space feeling
    // Massive reverb for cosmic vastness
    const reverb = new Tone.Reverb({
      decay: 8, // Increased from 8 to 12 for more expansive space feeling
      wet: 0.8,  // Increased from 0.6 to 0.8 for more ambient feeling
    }).toDestination();

    // Longer delay for cosmic echoes
    const delay = new Tone.FeedbackDelay({
      delayTime: 0.8,  // Doubled from 0.4 to 0.8 for more expansive space feeling
      feedback: 0.4,   // Increased from 0.3 to 0.4 for more sustained echoes
      wet: 0.3        // Increased slightly for more presence
    }).connect(reverb);

    // Filter for a more distant, spacey sound
    const filter = new Tone.Filter({
      type: "lowpass",
      frequency: 2200, // Lowered from 3000 to 2200 for a more muffled, distant sound
      Q: 0.5,         // Reduced from 1 to 0.5 for softer filtering
    }).connect(delay);

    // Create a note pool for celestial composition
    // Using a simplified F# major pentatonic scale - fewer notes for clarity
    const notePool = [
      "F#3", "G#3", "A#3", "C#4", "D#4",
      "F#4", "G#4", "A#4", "C#5", "D#5", 
    ];
    elevatorMusicRef.current.notePool = notePool;

    // Create one main celestial synth for melodies
    const leadSynth = new Tone.MonoSynth().connect(filter);
    leadSynth.set({
      volume: -15, // Reduced from -10 to -15 for less loudness
      oscillator: {
        type: "sine",
      },
      envelope: {
        attack: 0.4,    // Doubled from 0.2 to 0.4 for slower attack
        decay: 0.4,     // Doubled from 0.2 to 0.4 for more sustain
        sustain: 0.5,
        release: 3.0,   // Increased from 2.0 to 3.0 for longer fadeout
      },
      filterEnvelope: {
        attack: 0.4,    // Doubled from 0.2 to 0.4 for smoother sound
        decay: 0.2,
        sustain: 0.5,
        release: 3,     // Increased from 2 to 3 for longer tail
        baseFrequency: 600, // Lowered from 700 to 600 for warmer sound
        octaves: 1,
      },
    });

    // Initialize melody sequencer with main synth
    elevatorMusicRef.current.melodySequencer = {
      synth: leadSynth,
      currentMelody: [],
      currentIndex: 0,
      timeout: null,
    };

    // Create a simple pad synth for occasional chords
    const createSimplePadSynth = () => {
      const padSynth = new Tone.PolySynth(Tone.Synth).connect(filter);
      padSynth.set({
        volume: -18, // Reduced from -15 to -18 for less loudness
        oscillator: {
          type: "sine"
        },
        envelope: {
          attack: 2.5,    // Increased from 1.5 to 2.5 for much slower fade-in
          decay: 0.8,     // Increased from 0.5 to 0.8 for longer decay
          sustain: 0.6,
          release: 6,     // Increased from 4 to 6 for longer trailing sounds
        }
      });
      return padSynth;
    };

    // Single pad synth for simple chords
    const padSynth = createSimplePadSynth();

    // Store synths in ref - just two synths total
    elevatorMusicRef.current.generativePlayers = [
      { synth: padSynth, pattern: null },
      { synth: null, pattern: null }, // Not used
      { synth: null, pattern: null }, // Not used
    ];

    // Store effects chain - simpler chain
    elevatorMusicRef.current.effects = [filter, delay, reverb];
  }, []);

  // Function to randomly select notes from the pool
  const getRandomNote = useCallback(() => {
    const notePool = elevatorMusicRef.current.notePool;
    return notePool[Math.floor(Math.random() * notePool.length)];
  }, []);

  // Generate an evolving pattern of notes - simplified
  const generateEnoSequence = useCallback(() => {
    if (!elevatorMusicRef.current.isPlaying) return;

    const { generativePlayers, timeoutIds, timeMode } = elevatorMusicRef.current;

    // Only play pad chords in future mode, with lower probability
    if (timeMode === "future" && Math.random() < 0.1 && generativePlayers[0]?.synth) { // Reduced from 0.15 to 0.1
      const padSynth = generativePlayers[0].synth;
      
      // Just play simple two-note chords
      const rootNote = getRandomNote();
      let fifthNote = rootNote.replace(/([A-G]#?)(\d)/, (_, note, octave) => {
        // Basic logic to find a fifth up (approximate)
        let fifth;
        if (note === "C#") fifth = "G#";
        else if (note === "F#") fifth = "C#";
        else if (note === "G#") fifth = "D#";
        else if (note === "A#") fifth = "F#";
        else if (note === "D#") fifth = "A#";
        else fifth = "C#"; // fallback
        
        return `${fifth}${octave}`;
      });
      
      try {
        // Play chord with longer duration
        padSynth.triggerAttackRelease(rootNote, "4n"); // Shorter from 2n to 4n for more space between sounds
        padSynth.triggerAttackRelease(fifthNote, "4n"); // Shorter from 2n to 4n for more space between sounds
      } catch (error) {
        console.debug("Error playing pad sound:", error);
      }
    }

    // Schedule next note generation with variable timing - longer intervals
    const nextInterval = timeMode === "future" 
      ? 5000 + Math.random() * 6000  // Between 5 and 11 seconds for future - much slower than before
      : 800 + Math.random() * 2500;  // Keep original timing for past/now

    const timeoutId = window.setTimeout(() => {
      generateEnoSequence();
    }, nextInterval);

    timeoutIds.push(timeoutId);
  }, [getRandomNote]);

  // Play occasional swelling pad chord
  const playSwellPad = useCallback(() => {
    if (!elevatorMusicRef.current.isPlaying) return;

    const { generativePlayers, timeoutIds, timeMode } = elevatorMusicRef.current;

    if (generativePlayers[0]?.synth) { // First synth is pad in both modes
      const padSynth = generativePlayers[0].synth;

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
        // Shorter for future, longer for past
        const duration = timeMode === "future" ? "4n" : "2n";
        
        padSynth.triggerAttackRelease(chordNotes[0], duration);
        if (chordNotes.length > 1) {
          // Trigger remaining notes individually
          for (let i = 1; i < chordNotes.length; i++) {
            padSynth.triggerAttackRelease(chordNotes[i], duration);
          }
        }
      } catch (error) {
        console.debug("Error playing swell pad:", error);
      }
    }

    // Schedule next pad swell with long, variable timing
    // More frequent for future mode
    const nextInterval = timeMode === "future"
      ? 2000 + Math.random() * 4000 // Between 2 and 6 seconds for future
      : 4000 + Math.random() * 8000; // Between 4 and 12 seconds for past
      
    const timeoutId = window.setTimeout(() => {
      playSwellPad();
    }, nextInterval);

    timeoutIds.push(timeoutId);
  }, [getRandomNote]);

  // Generate a melodic sequence from the note pool - simplified
  const generateMelodySequence = useCallback(() => {
    const { notePool, timeMode } = elevatorMusicRef.current;
    
    // Shorter melodies for simplicity
    const length = timeMode === "future" 
      ? 3 + Math.floor(Math.random() * 2) // Melodies of 3-4 notes for future
      : 4 + Math.floor(Math.random() * 4); // Keep original for past
      
    const melody: string[] = [];

    // Different starting logic based on mode
    if (timeMode === "future") {
      // Start with root or fifth for stability
      const starters = notePool.filter(note => 
        note.includes("F#") || note.includes("C#")
      );
      melody.push(starters[Math.floor(Math.random() * starters.length)]);
    } else {
      // Original past mode logic
      if (Math.random() < 0.4) {
        melody.push("Db4");
      } else {
        melody.push(notePool[Math.floor(Math.random() * notePool.length)]);
      }
    }

    // Generate the rest of the melody with simplified logic
    for (let i = 1; i < length; i++) {
      if (timeMode === "future") {
        // Much simpler pattern - mostly stepwise motion
        if (Math.random() < 0.7) {
          // 70% chance to move stepwise in the scale
          const lastIndex = notePool.indexOf(melody[i - 1]);
          const stepUp = Math.random() < 0.6; // Bias toward rising
          
          if (stepUp && lastIndex < notePool.length - 1) {
            melody.push(notePool[lastIndex + 1]);
          } else if (!stepUp && lastIndex > 0) {
            melody.push(notePool[lastIndex - 1]);
          } else {
            melody.push(notePool[Math.floor(Math.random() * notePool.length)]);
          }
        } else {
          // 30% chance to return to tonic or fifth
          const tonicOrFifth = notePool.filter(note => 
            note.includes("F#4") || note.includes("C#4")
          );
          melody.push(tonicOrFifth[Math.floor(Math.random() * tonicOrFifth.length)]);
        }
      } else {
        // Original past mode logic
        if (Math.random() < 0.6) {
          const lastIndex = notePool.indexOf(melody[i - 1]);
          const stepUp = Math.random() < 0.5;

          if (stepUp && lastIndex < notePool.length - 1) {
            melody.push(notePool[lastIndex + 1]);
          } else if (!stepUp && lastIndex > 0) {
            melody.push(notePool[lastIndex - 1]);
          } else {
            melody.push(notePool[Math.floor(Math.random() * notePool.length)]);
          }
        } else if (Math.random() < 0.25) {
          melody.push(melody[i - 1]);
        } else {
          melody.push(notePool[Math.floor(Math.random() * notePool.length)]);
        }
      }
    }

    return melody;
  }, []);

  // Play the next note in the current melody - simplified
  const playNextMelodyNote = useCallback(() => {
    if (!elevatorMusicRef.current.isPlaying) return;

    const { melodySequencer, timeoutIds, timeMode } = elevatorMusicRef.current;
    const { synth, currentMelody, currentIndex } = melodySequencer;

    if (!synth || currentMelody.length === 0) return;

    // Play the current note
    try {
      const note = currentMelody[currentIndex];
      const noteDuration = timeMode === "future" ? "2n" : "16n"; // Even longer notes for future - 2n instead of 4n
      synth.triggerAttackRelease(note, noteDuration);

      // Move to next note or get new melody
      const nextIndex = (currentIndex + 1) % currentMelody.length;
      elevatorMusicRef.current.melodySequencer.currentIndex = nextIndex;

      // Generate new melody less frequently
      if (nextIndex === 0 && Math.random() < 0.3) {
        elevatorMusicRef.current.melodySequencer.currentMelody =
          generateMelodySequence();
      }

      // Schedule next note with longer gaps between notes
      const nextInterval = timeMode === "future"
        ? 700 + Math.random() * 500  // 700-1200ms between notes for future - much slower
        : 200 + Math.random() * 150; // Keep original for past
        
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

  // Occasionally start a melody - less frequently for future mode
  const scheduleNextMelody = useCallback(() => {
    if (!elevatorMusicRef.current.isPlaying) return;

    const { timeoutIds, timeMode } = elevatorMusicRef.current;

    // Future mode starts melodies less often
    const melodyThreshold = timeMode === "future" ? 0.2 : 0.4; // Reduced from 0.3 to 0.2
    
    // Sometimes start a new melody
    if (Math.random() < melodyThreshold) {
      // Generate a new melody
      elevatorMusicRef.current.melodySequencer.currentMelody =
        generateMelodySequence();
      elevatorMusicRef.current.melodySequencer.currentIndex = 0;

      // Start playing the melody
      playNextMelodyNote();
    }

    // Schedule next melody check with much longer gaps
    const nextMelodyInterval = timeMode === "future"
      ? 6000 + Math.random() * 8000 // 6-14 seconds between melody attempts for future - even longer
      : 2000 + Math.random() * 5000; // Keep original for past
      
    const timeoutId = window.setTimeout(() => {
      scheduleNextMelody();
    }, nextMelodyInterval);

    timeoutIds.push(timeoutId);
    elevatorMusicRef.current.melodySequencer.timeout = timeoutId;
  }, [generateMelodySequence, playNextMelodyNote]);

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

  // New shared function to initialize Tone.js once
  const initializeToneOnce = async () => {
    if (!isInitialized || Tone.context.state !== "running") {
      try {
        await Tone.start();
        setIsInitialized(true);
        
        // For iOS, explicitly resume the audio context
        if (Tone.context.state === "suspended") {
          await Tone.context.resume();
        }
        return true;
      } catch (error) {
        console.debug("Could not initialize Tone.js:", error);
        return false;
      }
    }
    return true;
  };

  // Add event listeners for visibility change and focus
  useEffect(() => {
    const handleFirstInteraction = () => {
      initializeToneOnce();
      window.removeEventListener("click", handleFirstInteraction);
    };
    window.addEventListener("click", handleFirstInteraction);
    
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
      window.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const playSound = useCallback(
    async (type: SoundType) => {
      if (isMuted) return;

      // Use shared initialization function
      if (!(await initializeToneOnce())) return;

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
  const playElevatorMusic = useCallback(async (timeMode: TimeMode = "now") => {
    if (isMuted) return;

    // Use shared initialization function
    if (!(await initializeToneOnce())) return;

    // Start playing elevator music if not already playing
    if (!elevatorMusicRef.current.isPlaying) {
      elevatorMusicRef.current.isPlaying = true;
      elevatorMusicRef.current.timeMode = timeMode;

      // Setup the appropriate environment based on time mode
      if (timeMode === "future") {
        setupFuturisticEnvironment();
      } else {
        setupAmbientEnvironment();
      }

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
    setupFuturisticEnvironment,
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

    // Use shared initialization function
    if (!(await initializeToneOnce())) return;

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
