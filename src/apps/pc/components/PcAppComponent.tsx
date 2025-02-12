import { useState, useEffect, useRef } from "react";
import { AppProps } from "@/apps/base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { PcMenuBar } from "./PcMenuBar";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { helpItems, appMetadata } from "..";
import { Game, loadGames } from "@/utils/storage";

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

export function PcAppComponent({
  isWindowOpen,
  onClose,
  isForeground,
}: AppProps) {
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game>(() => {
    const games = loadGames();
    return games[0];
  });
  const [pendingGame, setPendingGame] = useState<Game | null>(null);
  const [isGameRunning, setIsGameRunning] = useState(false);
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
          // If there was a pending game load, try loading it now
          if (pendingGame) {
            handleLoadGame(pendingGame);
            setPendingGame(null);
          }
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
  }, [pendingGame]);

  useEffect(() => {
    // Cleanup dosbox instance when window is closed
    if (!isWindowOpen && dosPropsRef.current) {
      dosPropsRef.current.stop();
      dosPropsRef.current = null;
    }
  }, [isWindowOpen]);

  const handleLoadGame = async (game: Game) => {
    setSelectedGame(game);
    setIsGameRunning(true);
    if (!containerRef.current) {
      console.error("Container ref is null");
      return;
    }
    if (!window.Dos) {
      console.error("Dos function is not available");
      if (!isScriptLoaded) {
        console.log("Script not loaded yet, queuing game load...");
        setPendingGame(game);
        return;
      }
      return;
    }
    if (!isScriptLoaded) {
      console.log("Script not fully loaded yet, queuing game load...");
      setPendingGame(game);
      return;
    }

    try {
      console.log("Starting game load...");
      console.log("Selected game:", game);
      console.log("Container dimensions:", {
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      });
      setIsLoading(true);

      // Stop existing instance if any
      if (dosPropsRef.current) {
        console.log("Stopping existing instance...");
        await dosPropsRef.current.stop();
        dosPropsRef.current = null;
      }

      // Clear container and wait for next tick
      containerRef.current.innerHTML = "";
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Start new instance
      console.log("Creating new Dos instance...");
      const options: DosOptions = {
        url: game.path,
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
              handleLoadGame(selectedGame);
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
      setIsGameRunning(false);
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
        selectedGame={selectedGame}
      />
      <WindowFrame
        title="Virtual PC"
        onClose={onClose}
        isForeground={isForeground}
        appId="pc"
      >
        <div className="flex flex-col h-full w-full bg-black">
          <div className="flex-1 relative h-full">
            {/* Always keep the DOSBox container in DOM but hide when not in use */}
            <div
              id="dosbox"
              ref={containerRef}
              className={`w-[640px] h-[480px] ${
                isGameRunning ? "block" : "hidden"
              }`}
              style={{ minHeight: "400px", position: "relative" }}
            />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="text-white">Loading {selectedGame.name}...</div>
              </div>
            )}
            {!isGameRunning && (
              <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto">
                {loadGames().map((game) => (
                  <button
                    key={game.id}
                    onClick={() => handleLoadGame(game)}
                    className="group relative aspect-video rounded-lg overflow-hidden bg-gray-800 hover:bg-gray-700 transition-colors"
                  >
                    <img
                      src={game.image}
                      alt={game.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-lg font-medium">
                        {game.name}
                      </span>
                    </div>
                  </button>
                ))}
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
