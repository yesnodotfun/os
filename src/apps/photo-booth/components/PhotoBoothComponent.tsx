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
import { motion, AnimatePresence } from "framer-motion";
import { useSound, Sounds } from "@/hooks/useSound";

interface Effect {
  name: string;
  filter: string;
}

const effects: Effect[] = [
  { name: "Green Tint", filter: "hue-rotate(90deg) saturate(200%)" },
  { name: "High Contrast", filter: "contrast(150%) brightness(120%)" },
  { name: "Warm Vintage", filter: "saturate(200%) sepia(50%)" },
  { name: "Soft Sepia", filter: "sepia(50%) hue-rotate(-30deg)" },
  { name: "Normal", filter: "none" },
  { name: "Soft Focus", filter: "blur(2px) brightness(120%)" },
  { name: "Black & White", filter: "grayscale(100%) brightness(120%)" },
  { name: "Inverted", filter: "contrast(200%) hue-rotate(180deg)" },
  { name: "Green Boost", filter: "hue-rotate(120deg) saturate(150%)" },
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
  const [selectedEffect, setSelectedEffect] = useState<Effect>(
    effects.find((effect) => effect.name === "Normal") || effects[0]
  );
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
  const [isFlashing, setIsFlashing] = useState(false);
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);
  const [showThumbnail, setShowThumbnail] = useState(false);
  const thumbnailRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const { play: playShutter } = useSound(Sounds.PHOTO_SHUTTER, 0.4);

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

    // Trigger flash effect
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 800);

    // Play shutter sound
    playShutter();

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

      // Show thumbnail animation
      setLastPhoto(photoUrl);
      setShowThumbnail(true);
      setTimeout(() => setShowThumbnail(false), 3000);
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
          const photoBatch = [...currentPhotoBatch];
          setPhotos((prev) => [...prev, ...photoBatch]);

          // Show thumbnail animation for the last photo in the sequence
          if (photoBatch.length > 0) {
            setLastPhoto(photoBatch[photoBatch.length - 1]);
            setShowThumbnail(true);
            setTimeout(() => setShowThumbnail(false), 3000);
          }
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
                className="w-full h-full object-cover transform scale-x-[-1]"
                style={{
                  filter: selectedEffect.filter,
                }}
              />

              {/* Camera flash effect */}
              <AnimatePresence>
                {isFlashing && (
                  <motion.div
                    className="absolute inset-0 bg-white"
                    initial={{ opacity: 0.9 }}
                    animate={{ opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                  />
                )}
              </AnimatePresence>

              {/* Bottom control bar */}
              <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between items-center">
                <div className="flex space-x-2 relative">
                  {/* Thumbnail animation */}
                  <AnimatePresence>
                    {showThumbnail && lastPhoto && !showPhotoStrip && (
                      <motion.div
                        className="absolute bottom-14 left-0 pointer-events-none"
                        initial={{ opacity: 0, y: 10, scale: 0.3 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{
                          opacity: 0,
                          y: 60,
                          scale: 0.2,
                          x: -16,
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 15,
                        }}
                        style={{
                          originX: "0",
                          originY: "1",
                        }}
                      >
                        <motion.img
                          src={lastPhoto}
                          alt="Last photo thumbnail"
                          className="h-20 w-auto object-cover rounded-md shadow-md border-2 border-white"
                          initial={{ rotateZ: 0 }}
                          animate={{ rotateZ: 0 }}
                          exit={{ rotateZ: 5 }}
                          transition={{
                            type: "spring",
                            stiffness: 200,
                            damping: 10,
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    className="h-10 w-10 bg-black/40 backdrop-blur-sm rounded-[3px] flex items-center justify-center text-white relative overflow-hidden"
                    onClick={togglePhotoStrip}
                    disabled={photos.length === 0}
                    ref={(node) => {
                      if (node) {
                        const rect = node.getBoundingClientRect();
                        thumbnailRef.current = {
                          x: rect.left,
                          y: rect.top,
                          width: rect.width,
                          height: rect.height,
                        };
                      }
                    }}
                  >
                    <Images size={20} />
                  </button>
                  <button
                    className="h-10 w-10 bg-black/40 backdrop-blur-sm rounded-[3px] flex items-center justify-center text-white"
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
                  className="h-10 px-4 py-2 rounded-[3px] bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 font-geneva-12 text-[12px]"
                >
                  Effects
                </Button>
              </div>

              {/* Photo strip preview */}
              <AnimatePresence>
                {showPhotoStrip && photos.length > 0 && (
                  <motion.div
                    className="absolute bottom-24 left-4 bg-white/90 p-2 rounded-md shadow-md overflow-x-auto"
                    initial={{ x: -100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -100, opacity: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 30,
                      duration: 0.2,
                    }}
                  >
                    <div className="flex flex-row space-x-1 h-20">
                      {[...photos].reverse().map((photo, index) => (
                        <img
                          key={index}
                          src={photo}
                          alt={`Photo ${index}`}
                          className="h-full w-auto object-cover cursor-pointer transition-opacity hover:opacity-80"
                          onClick={() => {
                            // Create an anchor element to download the image
                            const link = document.createElement("a");
                            link.href = photo;
                            link.download = `photo-booth-image-${Date.now()}-${index}.jpg`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Multi-photo countdown overlay */}
              <AnimatePresence>
                {isMultiPhotoMode && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="text-8xl font-bold text-white drop-shadow-lg">
                      {multiPhotoCount < 4 ? 4 - multiPhotoCount : ""}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Effects overlay */}
              <AnimatePresence>
                {showEffects && (
                  <motion.div
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.div
                      className="grid grid-cols-3 gap-4 p-4 w-full max-w-4xl"
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.85, opacity: 0 }}
                      transition={{
                        duration: 0.2,
                        ease: "easeOut",
                      }}
                      style={{ originX: 0.5, originY: 0.5 }}
                    >
                      {effects.map((effect) => (
                        <motion.div
                          key={effect.name}
                          className={`relative aspect-video overflow-hidden rounded-lg cursor-pointer border-2 ${
                            selectedEffect.name === effect.name
                              ? "border-blue-500"
                              : "border-transparent"
                          }`}
                          whileHover={{
                            scale: 1.05,
                            transition: { duration: 0.15 },
                          }}
                          whileTap={{
                            scale: 0.95,
                            transition: { duration: 0.1 },
                          }}
                          onClick={() => {
                            setSelectedEffect(effect);
                            setShowEffects(false);
                          }}
                        >
                          {videoRef.current && (
                            <video
                              autoPlay
                              playsInline
                              muted
                              className="w-full h-full object-cover transform scale-x-[-1]"
                              style={{
                                filter: effect.filter,
                              }}
                              ref={(el) => {
                                if (el && videoRef.current?.srcObject) {
                                  el.srcObject = videoRef.current.srcObject;
                                }
                              }}
                            />
                          )}
                          <div className="absolute bottom-0 left-0 right-0 text-center py-2 bg-black/50 text-white">
                            {effect.name}
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>

                    <button
                      className="absolute top-4 right-4 text-white hover:text-gray-300"
                      onClick={() => setShowEffects(false)}
                    >
                      <X size={24} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
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
