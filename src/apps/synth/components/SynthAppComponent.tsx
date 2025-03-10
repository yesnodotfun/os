import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Tone from "tone";
import * as THREE from "three";
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
import { Dial } from "@/components/ui/dial";

// Define oscillator type
type OscillatorType = "sine" | "square" | "triangle" | "sawtooth";

// Component to display status messages
const StatusDisplay: React.FC<{ message: string | null }> = ({ message }) => {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-4 w-full text-center left-1/2 transform -translate-x-1/2 px-4 py-2 bg-black/80 backdrop-blur-sm text-[#ff00ff] text-[12px] font-geneva-12 z-50"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Piano key component
const PianoKey: React.FC<{
  note: string;
  isBlack?: boolean;
  isPressed?: boolean;
  onPress: (note: string) => void;
  onRelease: (note: string) => void;
}> = ({ note, isBlack = false, isPressed = false, onPress, onRelease }) => {
  const handleMouseDown = () => {
    onPress(note);
  };

  const handleMouseUp = () => {
    onRelease(note);
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    // Only trigger note if mouse button is pressed (dragging)
    if (e.buttons === 1) {
      onPress(note);
    }
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    // Only release if we were dragging
    if (e.buttons === 1) {
      onRelease(note);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    onPress(note);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    onRelease(note);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    // This is handled by the parent component's touch events
  };

  return (
    <button
      type="button"
      className={cn(
        "relative touch-none select-none outline-none transition-colors duration-100",
        isBlack
          ? cn(
              "absolute top-0 left-[45%] w-[74%] h-[70%] rounded-b-md z-10 translate-x-[37%]",
              isPressed ? "bg-[#ff33ff]" : "bg-black hover:bg-[#333333]"
            )
          : cn(
              "h-full w-full border border-[#333333] rounded-b-md",
              isPressed ? "bg-[#ff33ff]" : "bg-white hover:bg-[#f5f5f5]"
            )
      )}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      <span
        className={cn(
          "absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs pointer-events-none font-semibold",
          isBlack ? "text-white" : "text-black"
        )}
      >
        {note.replace(/[0-9]/g, "")}
      </span>
    </button>
  );
};

// 3D Waveform component
const Waveform3D: React.FC<{ analyzer: Tone.Analyser | null }> = ({
  analyzer,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const animationFrameRef = useRef<number>();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || isMobile) return;

    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Create camera with better angle
    const camera = new THREE.PerspectiveCamera(
      30, // Keep narrow field of view
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.5, 2); // Move back slightly and up a bit
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Create renderer with better quality
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create geometry for waveform with more segments
    const geometry = new THREE.PlaneGeometry(6, 2, 96, 32); // Wider geometry with more segments
    const material = new THREE.MeshPhongMaterial({
      color: 0xff00ff,
      wireframe: true,
      transparent: true,
      opacity: 0.8,
      emissive: 0xff00ff,
      emissiveIntensity: 0.5,
      shininess: 100,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 6; // Less steep angle
    scene.add(mesh);
    meshRef.current = mesh;

    // Add more lights for better glow effect
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xff00ff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Add point lights for additional glow
    const pointLight1 = new THREE.PointLight(0xff00ff, 1, 10);
    pointLight1.position.set(-2, 1, 2);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff00ff, 1, 10);
    pointLight2.position.set(2, 1, 2);
    scene.add(pointLight2);

    // Animation loop
    const animate = () => {
      if (
        !meshRef.current ||
        !rendererRef.current ||
        !sceneRef.current ||
        !cameraRef.current
      )
        return;

      // Get waveform data from analyzer
      if (analyzer) {
        const waveform = analyzer.getValue() as Float32Array;
        const vertices = meshRef.current.geometry.attributes.position
          .array as Float32Array;

        // Map waveform data to vertices
        for (let i = 0; i < vertices.length; i += 3) {
          const x = vertices[i];
          // Map x position to waveform index
          const waveformIndex = Math.floor(((x + 3) / 6) * waveform.length); // Adjusted for wider geometry
          if (waveformIndex >= 0 && waveformIndex < waveform.length) {
            // Use waveform value for height, scaled appropriately and clipped
            const value = waveform[waveformIndex];
            // Only show significant changes (clip out near-zero values)
            vertices[i + 1] = Math.abs(value) > 0.1 ? value * 2.5 : 0;
          }
        }
        meshRef.current.geometry.attributes.position.needsUpdate = true;
      }

      rendererRef.current.render(sceneRef.current, cameraRef.current);
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current)
        return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
      rendererRef.current.setPixelRatio(window.devicePixelRatio);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (containerRef.current) {
        containerRef.current.removeChild(rendererRef.current!.domElement);
      }
    };
  }, [analyzer]);

  return (
    <div
      ref={containerRef}
      className="w-full h-12 md:h-26 overflow-hidden bg-black/50 hidden md:block"
    />
  );
};

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
  const analyzerRef = useRef<Tone.Analyser | null>(null);

  // UI state
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false);
  const [isSavingNewPreset, setIsSavingNewPreset] = useState(true);
  const [presetName, setPresetName] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  // Default presets
  const defaultPresets: SynthPreset[] = [
    {
      id: "default",
      name: "Synth",
      oscillator: {
        type: "sine" as OscillatorType,
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
    },
    {
      id: "analog-pad",
      name: "Pad",
      oscillator: {
        type: "triangle" as OscillatorType,
      },
      envelope: {
        attack: 0.5,
        decay: 0.3,
        sustain: 0.7,
        release: 2,
      },
      effects: {
        reverb: 0.6,
        delay: 0.3,
        distortion: 0.1,
      },
    },
    {
      id: "digital-lead",
      name: "Lead",
      oscillator: {
        type: "sawtooth" as OscillatorType,
      },
      envelope: {
        attack: 0.02,
        decay: 0.15,
        sustain: 0.4,
        release: 0.2,
      },
      effects: {
        reverb: 0.15,
        delay: 0.25,
        distortion: 0.4,
      },
    },
  ];

  const [presets, setPresets] = useState<SynthPreset[]>([]);
  const [currentPreset, setCurrentPreset] = useState<SynthPreset>(
    defaultPresets[0]
  );

  const [pressedNotes, setPressedNotes] = useState<Record<string, boolean>>({});
  // Use UI sound for interface feedback
  const { play } = useSound("/sounds/click.mp3");

  // Define keyboard layout with extended range
  const allWhiteKeys = [
    "C3",
    "D3",
    "E3",
    "F3",
    "G3",
    "A3",
    "B3",
    "C4",
    "D4",
    "E4",
    "F4",
    "G4",
    "A4",
    "B4",
    "C5",
    "D5",
    "E5",
    "F5",
  ];
  const allBlackKeys = [
    "C#3",
    "D#3",
    null,
    "F#3",
    "G#3",
    "A#3",
    null,
    "C#4",
    "D#4",
    null,
    "F#4",
    "G#4",
    "A#4",
    null,
    "C#5",
    "D#5",
    null,
    "F#5",
  ];

  // State for responsive keyboard
  const [visibleKeyCount, setVisibleKeyCount] = useState(8);
  const [isControlsVisible, setIsControlsVisible] = useState(false);

  // Reference to the app container
  const appContainerRef = useRef<HTMLDivElement>(null);

  // Update visible keys based on WindowFrame's width
  useEffect(() => {
    if (!isWindowOpen) return;

    const handleResize = () => {
      if (!appContainerRef.current) return;

      const width = appContainerRef.current.clientWidth;
      // Calculate how many additional keys to show based on width
      // Base is 8 keys at minimum width (e.g. 400px)
      // Add 1 key per 80px of additional width
      const additionalKeys = Math.floor((width - 400) / 80);
      setVisibleKeyCount(Math.max(0, Math.min(10, additionalKeys)));
    };

    // Initial calculation
    handleResize();

    // Create ResizeObserver to watch for container size changes
    const resizeObserver = new ResizeObserver(handleResize);

    if (appContainerRef.current) {
      resizeObserver.observe(appContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [isWindowOpen, appContainerRef.current]);

  // Get visible keys based on container width
  // Start with a base of 8 keys (C4-C5) and add more keys on both sides as container gets wider
  const baseIndex = 7; // Index of C4 in allWhiteKeys
  const keysToAddLeft = Math.floor(visibleKeyCount / 2);
  const keysToAddRight = Math.ceil(visibleKeyCount / 2);

  const startIndex = Math.max(0, baseIndex - keysToAddLeft);
  const endIndex = Math.min(
    allWhiteKeys.length,
    baseIndex + 8 + keysToAddRight
  );

  const whiteKeys = allWhiteKeys.slice(startIndex, endIndex);
  const blackKeys = allBlackKeys.slice(startIndex, endIndex);

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

    // Create analyzer for volume meter
    const analyzer = new Tone.Analyser({
      type: "waveform",
      size: 1024,
    }).toDestination();

    // Connect effects chain
    synth.connect(reverb);
    reverb.connect(delay);
    delay.connect(distortion);
    distortion.connect(analyzer);
    analyzer.toDestination();

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
    analyzerRef.current = analyzer;

    // Load saved presets
    const savedPresets = loadSynthPresets();
    if (savedPresets.length > 0) {
      setPresets(savedPresets);
    } else {
      // Use default presets if no saved presets
      setPresets(defaultPresets);
    }

    const savedCurrentPreset = loadSynthCurrentPreset();
    if (savedCurrentPreset) {
      setCurrentPreset(savedCurrentPreset);
      updateSynthParams(savedCurrentPreset);
    }

    // Add keyboard event handlers
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      synth.dispose();
      reverb.dispose();
      delay.dispose();
      distortion.dispose();
      analyzer.dispose();
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

  // Keyboard event handlers - extended mapping
  const keyToNoteMap: Record<string, string> = {
    // Middle octave (C4-B4)
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

    // Upper octave (C5-F5)
    k: "C5",
    o: "C#5",
    l: "D5",
    p: "D#5",
    ";": "E5",
    "'": "F5",
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
    setIsSavingNewPreset(true);
    setPresetName("");
    setIsPresetDialogOpen(true);
    play();
  };

  const updateCurrentPreset = () => {
    setIsSavingNewPreset(false);
    setPresetName(currentPreset.name);
    setIsPresetDialogOpen(true);
    play();
  };

  const savePreset = (name: string) => {
    if (isSavingNewPreset) {
      // Create a new preset
      const newPreset: SynthPreset = {
        ...currentPreset,
        id: Date.now().toString(),
        name,
      };

      setPresets((prev) => [...prev, newPreset]);
      setCurrentPreset(newPreset);
      showStatus(`Preset "${name}" saved`);
    } else {
      // Update existing preset
      const updatedPreset: SynthPreset = {
        ...currentPreset,
        name: name,
      };

      setPresets((prev) =>
        prev.map((preset) =>
          preset.id === currentPreset.id ? updatedPreset : preset
        )
      );
      setCurrentPreset(updatedPreset);
      showStatus(`Preset "${name}" updated`);
    }
    setIsPresetDialogOpen(false);
  };

  const loadPreset = (preset: SynthPreset) => {
    setCurrentPreset(preset);
    updateSynthParams(preset);
    showStatus(`Preset "${preset.name}" loaded`);
    play();
  };

  const resetSynth = () => {
    // Set the presets and current preset
    setPresets(defaultPresets);
    setCurrentPreset(defaultPresets[0]);
    updateSynthParams(defaultPresets[0]);
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

  // Keyboard event handlers
  const handleKeyDown = (e: KeyboardEvent) => {
    if (
      !isForeground ||
      e.repeat ||
      isPresetDialogOpen ||
      isHelpOpen ||
      isAboutOpen ||
      isControlsVisible
    )
      return;

    // Handle number keys for preset switching
    const numKey = parseInt(e.key);
    if (!isNaN(numKey) && numKey >= 1 && numKey <= 9) {
      e.preventDefault();
      const presetIndex = numKey - 1;
      if (presetIndex < presets.length) {
        loadPreset(presets[presetIndex]);
      }
    }

    // Handle 0 key for the 10th preset
    if (e.key === "0") {
      e.preventDefault();
      const presetIndex = 9;
      if (presetIndex < presets.length) {
        loadPreset(presets[presetIndex]);
      }
    }

    const note = keyToNoteMap[e.key.toLowerCase()];
    if (note) {
      e.preventDefault();
      pressNote(note);
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (
      !isForeground ||
      isPresetDialogOpen ||
      isHelpOpen ||
      isAboutOpen ||
      isControlsVisible
    )
      return;

    const note = keyToNoteMap[e.key.toLowerCase()];
    if (note) {
      e.preventDefault();
      releaseNote(note);
    }
  };

  return (
    <>
      <SynthMenuBar
        onAddPreset={addPreset}
        onSavePreset={updateCurrentPreset}
        onShowHelp={() => setIsHelpOpen(true)}
        onShowAbout={() => setIsAboutOpen(true)}
        onReset={resetSynth}
        onClose={onClose}
        presets={presets}
        currentPresetId={currentPreset.id}
        onLoadPresetById={(id) => {
          const preset = presets.find((p) => p.id === id);
          if (preset) loadPreset(preset);
        }}
      />

      <WindowFrame
        title="Synth"
        appId="synth"
        onClose={onClose}
        isForeground={isForeground}
      >
        <div
          ref={appContainerRef}
          className="flex flex-col h-full w-full bg-[#1a1a1a] text-white overflow-hidden"
        >
          {/* Main content area */}
          <div className="flex flex-col flex-1 min-h-0 w-full overflow-hidden">
            {/* Presets section */}
            <div className="p-4 py-4 pb-3 bg-[#2a2a2a] w-full border-b border-[#3a3a3a] z-[50] relative">
              <div className="flex justify-between items-center">
                <div className="flex gap-0 overflow-x-auto">
                  {/* Mobile preset selector */}
                  <div className="md:hidden w-48">
                    <Select
                      value={currentPreset.id}
                      onValueChange={(value) => {
                        const preset = presets.find((p) => p.id === value);
                        if (preset) loadPreset(preset);
                      }}
                    >
                      <SelectTrigger className="w-full bg-black border-[#3a3a3a] text-white font-geneva-12 text-[12px] p-2">
                        <SelectValue placeholder="Select Preset" />
                      </SelectTrigger>
                      <SelectContent className="bg-black border-[#3a3a3a] text-white">
                        {presets.map((preset) => (
                          <SelectItem
                            key={preset.id}
                            value={preset.id}
                            className="font-geneva-12 text-[12px]"
                          >
                            {preset.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Desktop preset buttons */}
                  <div className="hidden md:flex gap-0 overflow-x-auto">
                    {presets.length > 0 ? (
                      presets.map((preset) => (
                        <Button
                          key={preset.id}
                          variant="player"
                          data-state={
                            currentPreset.id === preset.id ? "on" : "off"
                          }
                          onClick={() => loadPreset(preset)}
                          className="h-[22px] px-2 whitespace-nowrap uppercase"
                        >
                          {preset.name}
                        </Button>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 font-geneva-12">
                        No presets yet. Create one with the NEW button.
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="player"
                    onClick={addPreset}
                    className="h-[22px] px-2"
                  >
                    ADD
                  </Button>
                  <Button
                    variant="player"
                    onClick={() => setIsControlsVisible(!isControlsVisible)}
                    className="h-[22px] px-2"
                  >
                    CONTROLS
                  </Button>
                </div>
              </div>
            </div>

            {/* Controls panel */}
            <div className="relative w-full">
              <AnimatePresence>
                {isControlsVisible && (
                  <motion.div
                    initial={{ y: -40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -40, opacity: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 25,
                      mass: 0.8,
                    }}
                    className="absolute top-0 inset-x-0 w-full bg-neutral-900/90 backdrop-blur-xl p-4 z-[40]"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <h3 className="font-semibold mb-2 text-[#ff00ff] font-geneva-12 text-[10px]">
                          Oscillator
                        </h3>
                        <Select
                          value={currentPreset.oscillator.type}
                          onValueChange={(value: OscillatorType) =>
                            handleOscillatorChange(value)
                          }
                        >
                          <SelectTrigger className="w-full bg-black border-[#3a3a3a] text-white font-geneva-12 text-[12px] p-2">
                            <SelectValue placeholder="Waveform" />
                          </SelectTrigger>
                          <SelectContent className="bg-black border-[#3a3a3a] text-white">
                            <SelectItem
                              value="sine"
                              className="font-geneva-12 text-[12px]"
                            >
                              Sine
                            </SelectItem>
                            <SelectItem
                              value="square"
                              className="font-geneva-12 text-[12px]"
                            >
                              Square
                            </SelectItem>
                            <SelectItem
                              value="triangle"
                              className="font-geneva-12 text-[12px]"
                            >
                              Triangle
                            </SelectItem>
                            <SelectItem
                              value="sawtooth"
                              className="font-geneva-12 text-[12px]"
                            >
                              Sawtooth
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <AnimatePresence>
                          {isControlsVisible && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="hidden md:block"
                            >
                              <Waveform3D analyzer={analyzerRef.current} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2 text-[#ff00ff] font-geneva-12 text-[10px]">
                          Envelope
                        </h3>
                        <div className="flex flex-wrap gap-1">
                          <div className="w-16">
                            <Dial
                              value={currentPreset.envelope.attack}
                              min={0.01}
                              max={2}
                              step={0.01}
                              onChange={(value) =>
                                handleEnvelopeChange("attack", value)
                              }
                              label="Attack"
                              color="#ff00ff"
                              size="sm"
                            />
                          </div>
                          <div className="w-16">
                            <Dial
                              value={currentPreset.envelope.decay}
                              min={0.01}
                              max={2}
                              step={0.01}
                              onChange={(value) =>
                                handleEnvelopeChange("decay", value)
                              }
                              label="Decay"
                              color="#ff00ff"
                              size="sm"
                            />
                          </div>
                          <div className="w-16">
                            <Dial
                              value={currentPreset.envelope.sustain}
                              min={0}
                              max={1}
                              step={0.01}
                              onChange={(value) =>
                                handleEnvelopeChange("sustain", value)
                              }
                              label="Sustain"
                              color="#ff00ff"
                              size="sm"
                            />
                          </div>
                          <div className="w-16">
                            <Dial
                              value={currentPreset.envelope.release}
                              min={0.1}
                              max={4}
                              step={0.1}
                              onChange={(value) =>
                                handleEnvelopeChange("release", value)
                              }
                              label="Release"
                              color="#ff00ff"
                              size="sm"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2 text-[#ff00ff] font-geneva-12 text-[10px]">
                          Effects
                        </h3>
                        <div className="flex flex-wrap gap-1">
                          <div className="w-16">
                            <Dial
                              value={currentPreset.effects.reverb}
                              min={0}
                              max={1}
                              step={0.01}
                              onChange={(value) =>
                                handleEffectChange("reverb", value)
                              }
                              label="Reverb"
                              color="#ff00ff"
                              size="sm"
                            />
                          </div>
                          <div className="w-16">
                            <Dial
                              value={currentPreset.effects.delay}
                              min={0}
                              max={1}
                              step={0.01}
                              onChange={(value) =>
                                handleEffectChange("delay", value)
                              }
                              label="Delay"
                              color="#ff00ff"
                              size="sm"
                            />
                          </div>
                          <div className="w-16">
                            <Dial
                              value={currentPreset.effects.distortion}
                              min={0}
                              max={1}
                              step={0.01}
                              onChange={(value) =>
                                handleEffectChange("distortion", value)
                              }
                              label="Distortion"
                              color="#ff00ff"
                              size="sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Keyboard - fixed at bottom */}
            <div className="flex-grow flex flex-col justify-end min-h-[160px] bg-black p-4 w-full">
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
                  {blackKeys.map((note, index) => {
                    // Only hide black keys at the end of the visible range
                    if (visibleKeyCount > 0 && index === blackKeys.length - 1) {
                      return (
                        <div
                          key={`empty-${index}`}
                          className="flex-1 relative"
                        />
                      );
                    }

                    return (
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
                    );
                  })}
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
        title={isSavingNewPreset ? "Save New Preset" : "Update Preset"}
        description={
          isSavingNewPreset
            ? "Enter a name for your preset"
            : "Update the name of your preset"
        }
        value={presetName}
        onChange={setPresetName}
      />
    </>
  );
}
