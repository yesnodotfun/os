import { useEffect, useRef, useState, useCallback } from "react";
import * as Tone from "tone";

// Initialize effects and synth outside hook to keep them persistent across renders
const filter = new Tone.Filter({
  frequency: 2000,
  type: "lowpass",
  rolloff: -12,
}).toDestination();

const tremolo = new Tone.Tremolo({
  frequency: 0.8,
  depth: 0.3,
})
  .connect(filter)
  .start();

const reverb = new Tone.Reverb({
  decay: 1.5,
  wet: 0.3,
}).connect(tremolo);

const synth = new Tone.PolySynth(Tone.Synth, {
  oscillator: {
    type: "triangle8", // richer harmonic content
  },
  envelope: {
    attack: 0.01,
    decay: 0.2,
    sustain: 0.2,
    release: 0.3,
  },
}).connect(reverb);

synth.volume.value = -12;

// Pentatonic scale for an exotic jungle feel
const notes = ["C4", "D4", "F4", "G4", "A4", "C5", "D5"];
const minTimeBetweenNotes = 0.12; // Slightly longer for more organic feel

export function useChatSynth() {
  const [isInitialized, setIsInitialized] = useState(false);
  const lastNoteTimeRef = useRef(0);

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

  const playNote = useCallback(() => {
    if (!isInitialized || Tone.context.state !== "running") return;

    const now = Tone.now();
    if (now - lastNoteTimeRef.current >= minTimeBetweenNotes) {
      const noteToPlay = notes[Math.floor(Math.random() * notes.length)];
      try {
        synth.triggerAttackRelease(noteToPlay, "32n", now);
        lastNoteTimeRef.current = now;
      } catch (error) {
        console.debug("Skipping note due to timing", error);
      }
    }
  }, [isInitialized]);

  return { playNote };
}
