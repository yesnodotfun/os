import { useEffect, useRef, useState, useCallback } from "react";
import * as Tone from "tone";

// Initialize synth outside hook to keep it persistent across renders
const synth = new Tone.PolySynth(Tone.Synth, {
  oscillator: {
    type: "triangle",
  },
  envelope: {
    attack: 0.005,
    decay: 0.1,
    sustain: 0.1,
    release: 0.1,
  },
}).toDestination();

synth.volume.value = -24;

const notes = ["C5", "E5", "G5"];
const minTimeBetweenNotes = 0.1;

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
