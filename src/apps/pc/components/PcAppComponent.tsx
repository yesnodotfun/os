import { useState, useEffect, useRef } from "react";
import { AppProps } from "@/apps/base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { PcMenuBar } from "./PcMenuBar";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { helpItems, appMetadata } from "..";

// Type declarations for js-dos v8
declare global {
  interface Window {
    Dos: (container: HTMLElement, options: DosOptions) => DosProps;
  }
}

type DosEvent =
  | "emu-ready"
  | "ci-ready"
  | "bnd-play"
  | "open-key"
  | "fullscreen-change"
  | "exit";

interface DosOptions {
  url: string;
  onload?: () => void;
  onerror?: (error: Error) => void;
  theme?: string;
  renderAspect?: string;
  renderBackend?: string;
  imageRendering?: string;
  mouseCapture?: boolean;
  workerThread?: boolean;
  autoStart?: boolean;
  kiosk?: boolean;
  onEvent?: (event: DosEvent, arg?: unknown) => void;
}

interface DosProps {
  stop: () => Promise<void>;
}

export function PCAppComponent({
  isWindowOpen,
  onClose,
  isForeground,
}: AppProps) {
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dosPropsRef = useRef<DosProps | null>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    // Only load script if it hasn't been loaded yet
    if (!scriptRef.current && !window.Dos) {
      console.log("Loading js-dos script...");
      const script = document.createElement("script");
      script.src = "https://v8.js-dos.com/latest/js-dos.js";
      script.async = true;
      script.onload = () => {
        console.log("js-dos script loaded successfully");
        // Wait a bit to ensure the script is fully initialized
        setTimeout(() => {
          console.log("Checking if Dos function is available:", !!window.Dos);
          setIsScriptLoaded(true);
        }, 1000);
      };
      script.onerror = (error) => {
        console.error("Failed to load js-dos script:", error);
      };
      scriptRef.current = script;
      document.body.appendChild(script);
    }

    return () => {
      // Cleanup dosbox instance if it exists
      if (dosPropsRef.current) {
        dosPropsRef.current.stop();
        dosPropsRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Cleanup dosbox instance when window is closed
    if (!isWindowOpen && dosPropsRef.current) {
      dosPropsRef.current.stop();
      dosPropsRef.current = null;
    }
  }, [isWindowOpen]);

  const handleLoadGame = () => {
    if (!containerRef.current) {
      console.error("Container ref is null");
      return;
    }
    if (!window.Dos) {
      console.error("Dos function is not available");
      return;
    }
    if (!isScriptLoaded) {
      console.error("Script is not fully loaded yet");
      return;
    }

    try {
      console.log("Starting game load...");
      console.log("Container dimensions:", {
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      });
      setIsLoading(true);

      // Stop existing instance if any
      if (dosPropsRef.current) {
        console.log("Stopping existing instance...");
        dosPropsRef.current.stop();
        dosPropsRef.current = null;
      }

      // Clear container
      containerRef.current.innerHTML = "";

      // Start new instance
      console.log("Creating new Dos instance...");
      const options: DosOptions = {
        url: "/games/doom.jsdos",
        theme: "dark",
        renderAspect: "4/3",
        renderBackend: "webgl",
        imageRendering: "pixelated",
        mouseCapture: true,
        workerThread: true,
        autoStart: true,
        kiosk: true,
        onEvent: (event: DosEvent, arg?: unknown) => {
          console.log("js-dos event:", event, arg);
          if (event === "emu-ready") {
            console.log("Emulator is ready");
          } else if (event === "ci-ready") {
            console.log("Command interface is ready");
            // Hide loading screen when game is actually ready to play
            setIsLoading(false);
          } else if (event === "bnd-play") {
            console.log("Play button clicked");
          } else if (event === "exit") {
            console.log("Program terminated:", arg);
            // Reset the emulator state
            if (containerRef.current) {
              containerRef.current.innerHTML = "";
              handleLoadGame();
            }
          }
        },
        onload: () => {
          console.log("Game bundle loaded successfully");
        },
        onerror: (error: Error) => {
          console.error("Failed to load game:", error);
          setIsLoading(false);
        },
      };
      console.log("Dos options:", options);

      dosPropsRef.current = window.Dos(containerRef.current, options);
      console.log("Dos instance created:", !!dosPropsRef.current);
    } catch (error) {
      console.error("Failed to start DOSBox:", error);
      setIsLoading(false);
    }
  };

  const handleSaveState = () => {
    // Save state functionality is not directly available in v8
    console.log("Save state not available in v8");
  };

  const handleLoadState = () => {
    // Load state functionality is not directly available in v8
    console.log("Load state not available in v8");
  };

  const handleReset = () => {
    if (containerRef.current) {
      if (dosPropsRef.current) {
        dosPropsRef.current.stop();
        dosPropsRef.current = null;
      }
      containerRef.current.innerHTML = "";
      handleLoadGame();
    }
    setIsResetDialogOpen(false);
  };

  if (!isWindowOpen) return null;

  return (
    <>
      <PcMenuBar
        onClose={onClose}
        onShowHelp={() => setIsHelpDialogOpen(true)}
        onShowAbout={() => setIsAboutDialogOpen(true)}
        onSaveState={handleSaveState}
        onLoadState={handleLoadState}
        onReset={() => setIsResetDialogOpen(true)}
        onLoadGame={handleLoadGame}
      />
      <WindowFrame
        title="Virtual PC"
        onClose={onClose}
        isForeground={isForeground}
        appId="pc"
      >
        <div className="flex flex-col h-full w-full bg-black">
          <div className="flex-1 relative h-full">
            <div
              id="dosbox"
              ref={containerRef}
              className="w-full h-full"
              style={{ minHeight: "400px", position: "relative" }}
            />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="text-white">Loading game...</div>
              </div>
            )}
          </div>
        </div>
        <HelpDialog
          isOpen={isHelpDialogOpen}
          onOpenChange={setIsHelpDialogOpen}
          helpItems={helpItems}
          appName="Virtual PC"
        />
        <AboutDialog
          isOpen={isAboutDialogOpen}
          onOpenChange={setIsAboutDialogOpen}
          metadata={appMetadata}
        />
        <ConfirmDialog
          isOpen={isResetDialogOpen}
          onOpenChange={setIsResetDialogOpen}
          onConfirm={handleReset}
          title="Reset Virtual PC"
          description="Are you sure you want to reset the PC? This will clear all current state."
        />
      </WindowFrame>
    </>
  );
}
