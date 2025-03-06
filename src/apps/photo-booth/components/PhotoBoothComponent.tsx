import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { helpItems, appMetadata } from "..";
import { PhotoBoothMenuBar } from "./PhotoBoothMenuBar";
import { APP_STORAGE_KEYS } from "@/utils/storage";
import { AppProps } from "../../base/types";
import { Circle, Camera, X, Images } from "lucide-react";

interface Effect {
  name: string;
  filter: string;
}

const effects: Effect[] = [
  { name: "Normal", filter: "none" },
  { name: "Space Alien", filter: "hue-rotate(90deg) saturate(200%)" },
  { name: "Nose Twirl", filter: "contrast(150%) brightness(120%)" },
  { name: "Chipmunk", filter: "saturate(200%) sepia(50%)" },
  { name: "Lovestruck", filter: "sepia(50%) hue-rotate(-30deg)" },
  { name: "Dizzy", filter: "blur(2px) brightness(120%)" },
  { name: "Blockhead", filter: "grayscale(100%) brightness(120%)" },
  { name: "Bug Out", filter: "contrast(200%) hue-rotate(180deg)" },
  { name: "Frog", filter: "hue-rotate(120deg) saturate(150%)" },
];

export function PhotoBoothComponent({
  isWindowOpen,
  onClose,
  isForeground,
}: AppProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [showPhotoStrip, setShowPhotoStrip] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [selectedEffect, setSelectedEffect] = useState<Effect>(effects[0]);
  const [photos, setPhotos] = useState<string[]>(() => {
    const saved = localStorage.getItem(APP_STORAGE_KEYS["photo-booth"].PHOTOS);
    return saved ? JSON.parse(saved) : [];
  });
  const [isMultiPhotoMode, setIsMultiPhotoMode] = useState(false);
  const [multiPhotoCount, setMultiPhotoCount] = useState(0);
  const [multiPhotoTimer, setMultiPhotoTimer] = useState<NodeJS.Timeout | null>(
    null
  );
  const [currentPhotoBatch, setCurrentPhotoBatch] = useState<string[]>([]);

  useEffect(() => {
    if (isWindowOpen) {
      startCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (multiPhotoTimer) {
        clearInterval(multiPhotoTimer);
      }
    };
  }, [isWindowOpen]);

  useEffect(() => {
    localStorage.setItem(
      APP_STORAGE_KEYS["photo-booth"].PHOTOS,
      JSON.stringify(photos)
    );
  }, [photos]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  const takePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Apply current filter
    context.filter = selectedEffect.filter;
    context.drawImage(videoRef.current, 0, 0);

    const photoUrl = canvas.toDataURL("image/jpeg");

    if (isMultiPhotoMode) {
      setCurrentPhotoBatch((prev) => [...prev, photoUrl]);
    } else {
      setPhotos((prev) => [...prev, photoUrl]);
    }

    return photoUrl;
  };

  const startMultiPhotoSequence = () => {
    setIsMultiPhotoMode(true);
    setMultiPhotoCount(0);
    setCurrentPhotoBatch([]);

    // Take 4 photos with a 1-second interval
    const timer = setInterval(() => {
      setMultiPhotoCount((count) => {
        const newCount = count + 1;

        if (newCount <= 4) {
          takePhoto();
        }

        if (newCount === 4) {
          clearInterval(timer);
          setIsMultiPhotoMode(false);

          // After the sequence completes, update photos state
          setPhotos((prev) => [...prev, ...currentPhotoBatch]);
        }

        return newCount;
      });
    }, 1000);

    setMultiPhotoTimer(timer);

    // Take the first photo immediately
    takePhoto();
  };

  const handleClearPhotos = () => {
    setPhotos([]);
    setCurrentPhotoBatch([]);
  };

  const handleExportPhotos = () => {
    // TODO: Implement photo export functionality
    console.log("Export photos");
  };

  const toggleEffects = () => {
    setShowEffects(!showEffects);
  };

  const togglePhotoStrip = () => {
    setShowPhotoStrip(!showPhotoStrip);
  };

  if (!isWindowOpen) return null;

  return (
    <>
      <PhotoBoothMenuBar
        onClose={onClose}
        onShowHelp={() => setShowHelp(true)}
        onShowAbout={() => setShowAbout(true)}
        onClearPhotos={handleClearPhotos}
        onExportPhotos={handleExportPhotos}
      />
      <WindowFrame
        title="Photo Booth"
        onClose={onClose}
        isForeground={isForeground}
        appId="photo-booth"
      >
        <div className="flex flex-col h-full bg-white">
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <div className="relative w-full h-full">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                style={{
                  filter: selectedEffect.filter,
                }}
              />

              {/* Bottom control bar */}
              <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between items-center">
                <div className="flex space-x-2">
                  <button
                    className="w-8 h-8 bg-white/80 backdrop-blur-sm rounded-md flex items-center justify-center"
                    onClick={togglePhotoStrip}
                    disabled={photos.length === 0}
                  >
                    <Images size={20} />
                  </button>
                  <button
                    className="w-8 h-8 bg-white/80 backdrop-blur-sm rounded-md flex items-center justify-center"
                    onClick={startMultiPhotoSequence}
                    disabled={isMultiPhotoMode}
                  >
                    <Camera size={20} />
                  </button>
                </div>

                <Button
                  onClick={isMultiPhotoMode ? () => {} : takePhoto}
                  className={`rounded-full h-16 w-16 ${
                    isMultiPhotoMode
                      ? `bg-gray-400 cursor-not-allowed`
                      : `bg-red-500 hover:bg-red-600`
                  }`}
                  disabled={isMultiPhotoMode}
                >
                  <Circle size={32} fill="white" stroke="white" />
                </Button>

                <Button
                  onClick={toggleEffects}
                  className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300"
                >
                  Effects
                </Button>
              </div>

              {/* Photo strip preview */}
              {showPhotoStrip && photos.length > 0 && (
                <div className="absolute bottom-24 right-4 bg-white/90 p-2 rounded-md shadow-md">
                  <div className="flex flex-row space-x-1 h-20">
                    {photos.slice(-4).map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Photo ${index}`}
                        className="h-full w-auto object-cover"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Multi-photo countdown overlay */}
              {isMultiPhotoMode && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-8xl font-bold text-white drop-shadow-lg">
                    {multiPhotoCount < 4 ? 4 - multiPhotoCount : ""}
                  </div>
                </div>
              )}

              {/* Effects overlay */}
              {showEffects && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center">
                  <div className="grid grid-cols-3 gap-4 p-4 w-full max-w-4xl">
                    {effects.map((effect) => (
                      <div
                        key={effect.name}
                        className={`relative aspect-video overflow-hidden rounded-lg cursor-pointer border-2 ${
                          selectedEffect.name === effect.name
                            ? "border-blue-500"
                            : "border-transparent"
                        }`}
                        onClick={() => {
                          setSelectedEffect(effect);
                          setShowEffects(false);
                        }}
                      >
                        <div
                          className="w-full h-full"
                          style={{
                            backgroundImage: `url(${
                              photos.length > 0 ? photos[photos.length - 1] : ""
                            })`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            filter: effect.filter,
                          }}
                        >
                          {!photos.length && (
                            <video
                              className="w-full h-full object-cover"
                              style={{
                                filter: effect.filter,
                              }}
                            >
                              <source
                                src={
                                  videoRef.current?.srcObject
                                    ? URL.createObjectURL(
                                        videoRef.current
                                          .srcObject as MediaSource
                                      )
                                    : ""
                                }
                              />
                            </video>
                          )}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 text-center py-2 bg-black/50 text-white">
                          {effect.name}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    className="absolute top-4 right-4 text-white hover:text-gray-300"
                    onClick={() => setShowEffects(false)}
                  >
                    <X size={24} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <HelpDialog
            isOpen={showHelp}
            onOpenChange={setShowHelp}
            helpItems={helpItems}
            appName="Photo Booth"
          />
          <AboutDialog
            isOpen={showAbout}
            onOpenChange={setShowAbout}
            metadata={appMetadata}
          />
        </div>
      </WindowFrame>
    </>
  );
}
