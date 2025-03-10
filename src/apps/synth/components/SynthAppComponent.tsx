import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Tone from "tone";
import { cn } from "@/lib/utils";
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { SynthMenuBar } from "./SynthMenuBar";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { InputDialog } from "@/components/dialogs/InputDialog";
import { helpItems, appMetadata } from "..";
import {
  loadSynthPresets,
  saveSynthPresets,
  loadSynthCurrentPreset,
  saveSynthCurrentPreset,
  SynthPreset,
} from "@/utils/storage";
import { Button } from "@/components/ui/button";
import { useSound } from "@/hooks/useSound";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

// Define oscillator type
type OscillatorType = "sine" | "square" | "triangle" | "sawtooth";

// Component to display status messages
function StatusDisplay({ message }: { message: string }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-black/80 text-white rounded-md text-sm z-50"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Piano key component
function PianoKey({
  note,
  isBlack = false,
  isPressed = false,
  onPress,
  onRelease,
}: {
  note: string;
  isBlack?: boolean;
  isPressed?: boolean;
  onPress: (note: string) => void;
  onRelease: (note: string) => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "relative touch-none select-none outline-none transition-colors duration-100",
        isBlack
          ? cn(
              "absolute top-0 left-[55%] w-[60%] h-2/3 bg-gray-900 rounded-b-md z-10 hover:bg-gray-800",
              // Add custom offsets for F#, G#, and A# keys
              note === "D#4" && "-translate-x-[20%]",
              note === "F#4" && "-translate-x-[60%]",
              note === "G#4" && "-translate-x-[80%]",
              note === "A#4" && "-translate-x-[100%]"
            )
          : "h-full w-full bg-white border border-gray-300 rounded-b-md hover:bg-gray-50",
        isPressed ? (isBlack ? "bg-gray-600" : "bg-gray-200") : ""
      )}
      onMouseDown={() => onPress(note)}
      onMouseUp={() => onRelease(note)}
      onMouseLeave={() => onRelease(note)}
      onTouchStart={(e) => {
        e.preventDefault();
        onPress(note);
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        onRelease(note);
      }}
    >
      <span
        className={cn(
          "absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs pointer-events-none",
          isBlack ? "text-white" : "text-gray-800"
        )}
      >
        {note.replace(/[0-9]/g, "")}
      </span>
    </button>
  );
}

// Main synth app component
export function SynthAppComponent({
  isWindowOpen,
  onClose,
  isForeground,
}: AppProps) {
  // References and synth state
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const reverbRef = useRef<Tone.Reverb | null>(null);
  const delayRef = useRef<Tone.FeedbackDelay | null>(null);
  const distortionRef = useRef<Tone.Distortion | null>(null);

  // UI state
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [presets, setPresets] = useState<SynthPreset[]>([]);
  const [currentPreset, setCurrentPreset] = useState<SynthPreset>({
    id: "default",
    name: "Default",
    oscillator: {
      type: "sine",
    },
    envelope: {
      attack: 0.1,
      decay: 0.2,
      sustain: 0.5,
      release: 1,
    },
    effects: {
      reverb: 0.2,
      delay: 0.2,
      distortion: 0,
    },
  });

  const [pressedNotes, setPressedNotes] = useState<Record<string, boolean>>({});
  // Use UI sound for interface feedback
  const { play } = useSound("/sounds/click.mp3");

  // Define keyboard layout
  const whiteKeys = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"];
  const blackKeys = ["C#4", "D#4", null, "F#4", "G#4", "A#4", null];

  const [isControlsVisible, setIsControlsVisible] = useState(true);

  // Initialize synth and effects
  useEffect(() => {
    if (!isWindowOpen) return;

    // Create synth and effects chain
    const synth = new Tone.PolySynth(Tone.Synth).toDestination();
    const reverb = new Tone.Reverb({
      decay: 2,
      wet: currentPreset.effects.reverb,
    }).toDestination();
    const delay = new Tone.FeedbackDelay({
      delayTime: 0.25,
      feedback: currentPreset.effects.delay,
    }).toDestination();
    const distortion = new Tone.Distortion({
      distortion: currentPreset.effects.distortion,
    }).toDestination();

    // Connect effects chain
    synth.connect(reverb);
    reverb.connect(delay);
    delay.connect(distortion);
    distortion.toDestination();

    // Set initial synth parameters
    synth.set({
      oscillator: {
        type: currentPreset.oscillator.type,
      },
      envelope: {
        attack: currentPreset.envelope.attack,
        decay: currentPreset.envelope.decay,
        sustain: currentPreset.envelope.sustain,
        release: currentPreset.envelope.release,
      },
    });

    synthRef.current = synth;
    reverbRef.current = reverb;
    delayRef.current = delay;
    distortionRef.current = distortion;

    // Load saved presets
    const savedPresets = loadSynthPresets();
    if (savedPresets.length > 0) {
      setPresets(savedPresets);
    }

    const savedCurrentPreset = loadSynthCurrentPreset();
    if (savedCurrentPreset) {
      setCurrentPreset(savedCurrentPreset);
      updateSynthParams(savedCurrentPreset);
    }

    // Add keyboard event listeners
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      synth.dispose();
      reverb.dispose();
      delay.dispose();
      distortion.dispose();
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [isWindowOpen]);

  // Save presets when they change
  useEffect(() => {
    if (presets.length > 0) {
      saveSynthPresets(presets);
    }
  }, [presets]);

  // Save current preset when it changes
  useEffect(() => {
    saveSynthCurrentPreset(currentPreset);
  }, [currentPreset]);

  // Update synth parameters when current preset changes
  const updateSynthParams = (preset: SynthPreset) => {
    if (
      !synthRef.current ||
      !reverbRef.current ||
      !delayRef.current ||
      !distortionRef.current
    )
      return;

    synthRef.current.set({
      oscillator: {
        type: preset.oscillator.type,
      },
      envelope: {
        attack: preset.envelope.attack,
        decay: preset.envelope.decay,
        sustain: preset.envelope.sustain,
        release: preset.envelope.release,
      },
    });

    reverbRef.current.wet.value = preset.effects.reverb;
    delayRef.current.feedback.value = preset.effects.delay;
    distortionRef.current.distortion = preset.effects.distortion;
  };

  // Keyboard event handlers
  const keyToNoteMap: Record<string, string> = {
    a: "C4",
    w: "C#4",
    s: "D4",
    e: "D#4",
    d: "E4",
    f: "F4",
    t: "F#4",
    g: "G4",
    y: "G#4",
    h: "A4",
    u: "A#4",
    j: "B4",
    k: "C5",
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isForeground || e.repeat) return;

    const note = keyToNoteMap[e.key.toLowerCase()];
    if (note) {
      e.preventDefault();
      pressNote(note);
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (!isForeground) return;

    const note = keyToNoteMap[e.key.toLowerCase()];
    if (note) {
      e.preventDefault();
      releaseNote(note);
    }
  };

  // Note press/release handlers
  const pressNote = (note: string) => {
    if (!synthRef.current) return;

    synthRef.current.triggerAttack(note);
    setPressedNotes((prev) => ({ ...prev, [note]: true }));
  };

  const releaseNote = (note: string) => {
    if (!synthRef.current) return;

    synthRef.current.triggerRelease(note);
    setPressedNotes((prev) => ({ ...prev, [note]: false }));
  };

  // Status message display
  const showStatus = (message: string) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(""), 3000);
  };

  // Preset handlers
  const addPreset = () => {
    setIsPresetDialogOpen(true);
    play();
  };

  const savePreset = (name: string) => {
    const newPreset: SynthPreset = {
      ...currentPreset,
      id: Date.now().toString(),
      name,
    };

    setPresets((prev) => [...prev, newPreset]);
    setCurrentPreset(newPreset);
    showStatus(`Preset "${name}" saved`);
  };

  const loadPreset = (preset: SynthPreset) => {
    setCurrentPreset(preset);
    updateSynthParams(preset);
    showStatus(`Preset "${preset.name}" loaded`);
    play();
  };

  const resetSynth = () => {
    const defaultPreset: SynthPreset = {
      id: "default",
      name: "Default",
      oscillator: {
        type: "sine",
      },
      envelope: {
        attack: 0.1,
        decay: 0.2,
        sustain: 0.5,
        release: 1,
      },
      effects: {
        reverb: 0.2,
        delay: 0.2,
        distortion: 0,
      },
    };

    setCurrentPreset(defaultPreset);
    updateSynthParams(defaultPreset);
    showStatus("Synth reset to defaults");
    play();
  };

  // Parameter change handlers
  const handleOscillatorChange = (type: OscillatorType) => {
    setCurrentPreset((prev) => ({
      ...prev,
      oscillator: { type },
    }));

    if (synthRef.current) {
      synthRef.current.set({
        oscillator: { type },
      });
    }
  };

  const handleEnvelopeChange = (
    param: "attack" | "decay" | "sustain" | "release",
    value: number
  ) => {
    setCurrentPreset((prev) => ({
      ...prev,
      envelope: {
        ...prev.envelope,
        [param]: value,
      },
    }));

    if (synthRef.current) {
      synthRef.current.set({
        envelope: {
          [param]: value,
        },
      });
    }
  };

  const handleEffectChange = (
    effect: "reverb" | "delay" | "distortion",
    value: number
  ) => {
    setCurrentPreset((prev) => ({
      ...prev,
      effects: {
        ...prev.effects,
        [effect]: value,
      },
    }));

    if (effect === "reverb" && reverbRef.current) {
      reverbRef.current.wet.value = value;
    } else if (effect === "delay" && delayRef.current) {
      delayRef.current.feedback.value = value;
    } else if (effect === "distortion" && distortionRef.current) {
      distortionRef.current.distortion = value;
    }
  };

  return (
    <>
      <SynthMenuBar
        onAddPreset={addPreset}
        onLoadPreset={() => {}}
        onSavePreset={() => {}}
        onShowHelp={() => setIsHelpOpen(true)}
        onShowAbout={() => setIsAboutOpen(true)}
        onReset={resetSynth}
      />

      <WindowFrame
        title="Synth"
        appId="synth"
        onClose={onClose}
        isForeground={isForeground}
      >
        <div className="flex flex-col h-full w-full bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 overflow-hidden">
          {/* Main content area */}
          <div className="flex flex-col flex-1 min-h-0 w-full overflow-hidden">
            {/* Controls panel */}
            <div className="relative w-full">
              <button
                onClick={() => setIsControlsVisible(!isControlsVisible)}
                className="absolute right-2 top-2 z-10 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-2 py-1 rounded-md text-xs transition-colors"
              >
                {isControlsVisible ? "Hide Controls" : "Show Controls"}
              </button>
              <AnimatePresence>
                {isControlsVisible && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden w-full"
                  >
                    <div className="p-4 bg-gray-200 dark:bg-gray-700 w-full border-b border-gray-300 dark:border-gray-600">
                      <div className="flex flex-col gap-4">
                        {/* Oscillator and envelope controls */}
                        <div>
                          <h3 className="text-sm font-semibold mb-2">
                            Oscillator
                          </h3>
                          <Select
                            value={currentPreset.oscillator.type}
                            onValueChange={(value) =>
                              handleOscillatorChange(value as OscillatorType)
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Waveform" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sine">Sine</SelectItem>
                              <SelectItem value="square">Square</SelectItem>
                              <SelectItem value="triangle">Triangle</SelectItem>
                              <SelectItem value="sawtooth">Sawtooth</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <h3 className="text-sm font-semibold mb-2">
                            Envelope
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs mb-1">
                                Attack:{" "}
                                {currentPreset.envelope.attack.toFixed(2)}
                              </p>
                              <Slider
                                value={[currentPreset.envelope.attack]}
                                min={0.01}
                                max={2}
                                step={0.01}
                                onValueChange={([value]) =>
                                  handleEnvelopeChange("attack", value)
                                }
                              />
                            </div>
                            <div>
                              <p className="text-xs mb-1">
                                Decay: {currentPreset.envelope.decay.toFixed(2)}
                              </p>
                              <Slider
                                value={[currentPreset.envelope.decay]}
                                min={0.01}
                                max={2}
                                step={0.01}
                                onValueChange={([value]) =>
                                  handleEnvelopeChange("decay", value)
                                }
                              />
                            </div>
                            <div>
                              <p className="text-xs mb-1">
                                Sustain:{" "}
                                {currentPreset.envelope.sustain.toFixed(2)}
                              </p>
                              <Slider
                                value={[currentPreset.envelope.sustain]}
                                min={0}
                                max={1}
                                step={0.01}
                                onValueChange={([value]) =>
                                  handleEnvelopeChange("sustain", value)
                                }
                              />
                            </div>
                            <div>
                              <p className="text-xs mb-1">
                                Release:{" "}
                                {currentPreset.envelope.release.toFixed(2)}
                              </p>
                              <Slider
                                value={[currentPreset.envelope.release]}
                                min={0.1}
                                max={4}
                                step={0.1}
                                onValueChange={([value]) =>
                                  handleEnvelopeChange("release", value)
                                }
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-semibold mb-2">
                            Effects
                          </h3>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs mb-1">
                                Reverb:{" "}
                                {currentPreset.effects.reverb.toFixed(2)}
                              </p>
                              <Slider
                                value={[currentPreset.effects.reverb]}
                                min={0}
                                max={1}
                                step={0.01}
                                onValueChange={([value]) =>
                                  handleEffectChange("reverb", value)
                                }
                              />
                            </div>
                            <div>
                              <p className="text-xs mb-1">
                                Delay: {currentPreset.effects.delay.toFixed(2)}
                              </p>
                              <Slider
                                value={[currentPreset.effects.delay]}
                                min={0}
                                max={0.9}
                                step={0.01}
                                onValueChange={([value]) =>
                                  handleEffectChange("delay", value)
                                }
                              />
                            </div>
                            <div>
                              <p className="text-xs mb-1">
                                Distortion:{" "}
                                {currentPreset.effects.distortion.toFixed(2)}
                              </p>
                              <Slider
                                value={[currentPreset.effects.distortion]}
                                min={0}
                                max={1}
                                step={0.01}
                                onValueChange={([value]) =>
                                  handleEffectChange("distortion", value)
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Presets section */}
            <div className="p-4 bg-gray-200 dark:bg-gray-700 w-full border-b border-gray-300 dark:border-gray-600">
              <h3 className="text-sm font-semibold mb-2">Presets</h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {presets.length > 0 ? (
                  presets.map((preset) => (
                    <Button
                      key={preset.id}
                      variant={
                        currentPreset.id === preset.id ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => loadPreset(preset)}
                      className="whitespace-nowrap"
                    >
                      {preset.name}
                    </Button>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    No presets yet. Create one with File → New Preset.
                  </p>
                )}
              </div>
            </div>

            {/* Keyboard - fixed at bottom */}
            <div className="flex-grow flex flex-col justify-end min-h-[160px] bg-gray-300 dark:bg-gray-600 p-4 w-full">
              <div className="relative h-full w-full">
                {/* White keys container */}
                <div className="absolute inset-0 h-full flex w-full">
                  {whiteKeys.map((note) => (
                    <div key={note} className="flex-1 relative">
                      <PianoKey
                        note={note}
                        isPressed={pressedNotes[note]}
                        onPress={pressNote}
                        onRelease={releaseNote}
                      />
                    </div>
                  ))}
                </div>

                {/* Black keys container */}
                <div className="absolute inset-0 h-full w-full flex pointer-events-none">
                  {blackKeys.map((note, index) => (
                    <div
                      key={note || `empty-${index}`}
                      className="flex-1 relative"
                    >
                      {note && (
                        <div className="pointer-events-auto w-full">
                          <PianoKey
                            note={note}
                            isBlack
                            isPressed={pressedNotes[note]}
                            onPress={pressNote}
                            onRelease={releaseNote}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Status message */}
          <StatusDisplay message={statusMessage} />
        </div>
      </WindowFrame>

      {/* Dialogs */}
      <HelpDialog
        isOpen={isHelpOpen}
        onOpenChange={setIsHelpOpen}
        helpItems={helpItems}
        appName="Synth"
      />

      <AboutDialog
        isOpen={isAboutOpen}
        onOpenChange={setIsAboutOpen}
        metadata={appMetadata}
      />

      <InputDialog
        isOpen={isPresetDialogOpen}
        onOpenChange={setIsPresetDialogOpen}
        onSubmit={savePreset}
        title="Save Preset"
        description="Enter a name for your preset"
        value=""
        onChange={() => {}}
      />
    </>
  );
}
