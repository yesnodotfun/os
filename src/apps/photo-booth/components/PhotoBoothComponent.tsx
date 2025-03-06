import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { helpItems, appMetadata } from "..";
import { PhotoBoothMenuBar } from "./PhotoBoothMenuBar";
import { APP_STORAGE_KEYS } from "@/utils/storage";
import { AppProps } from "../../base/types";
import { Camera, Images, Timer } from "lucide-react";
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
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
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
  const [newPhotoIndex, setNewPhotoIndex] = useState<number | null>(null);

  // Add a small delay before showing photo strip to prevent flickering
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  useEffect(() => {
    if (showPhotoStrip && isInitialLoad) {
      // Let the component fully mount before showing photostrip
      const timer = setTimeout(() => {
        setIsInitialLoad(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showPhotoStrip, isInitialLoad]);

  useEffect(() => {
    if (isWindowOpen && isForeground) {
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
  }, [isWindowOpen, isForeground]);

  // Add event listener for the video element to handle Safari initialization
  useEffect(() => {
    const videoElement = videoRef.current;

    // Safari on iOS requires this initialization sequence
    const handleCanPlay = () => {
      if (videoElement) {
        console.log("Video can play now, attempting to play...");
        // Force repaint on iOS to prevent gray screen
        videoElement.style.display = "none";
        // This forces a repaint - void operator to avoid unused variable warning
        void videoElement.offsetHeight;
        videoElement.style.display = "block";

        // Force play - critical for iOS Safari
        videoElement.play().catch((e) => {
          console.error("Error playing video:", e);
        });
      }
    };

    if (videoElement) {
      videoElement.addEventListener("canplay", handleCanPlay);
    }

    return () => {
      if (videoElement) {
        videoElement.removeEventListener("canplay", handleCanPlay);
      }
    };
  }, [stream]); // Re-run when stream changes

  // Save photos to localStorage whenever they change
  useEffect(() => {
    if (photos.length > 0) {
      try {
        localStorage.setItem(
          APP_STORAGE_KEYS["photo-booth"].PHOTOS,
          JSON.stringify(photos)
        );
      } catch (error) {
        console.error("Failed to save photos to localStorage:", error);
        // Continue without saving to localStorage
      }
    }
  }, [photos]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      setIsLoadingCamera(true);

      // Safari-specific constraints - using more lenient constraints for iOS
      const constraints = {
        video: {
          facingMode: "user",
          // Avoid specific resolution constraints on iOS which can cause issues
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(
        constraints
      );

      // For Safari, we need to ensure the video element is properly configured
      if (videoRef.current) {
        // Safari on iOS: Need to set attributes before assigning srcObject
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.setAttribute("autoplay", "true");
        videoRef.current.setAttribute("muted", "true");
        videoRef.current.muted = true; // Redundant but sometimes needed

        // Delay setting srcObject slightly for iOS Safari
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            // Try to force play
            videoRef.current.play().catch((e) => {
              console.error("Error playing video after setting srcObject:", e);
            });
          }
        }, 100);
      }

      setStream(mediaStream);
    } catch (error) {
      console.error("Error accessing camera:", error);
      let errorMessage = "Could not access camera";

      if (error instanceof DOMException) {
        switch (error.name) {
          case "NotAllowedError":
            errorMessage =
              "Camera permission denied. Please enable camera access in your browser settings.";
            break;
          case "NotFoundError":
            errorMessage =
              "No camera found. Please connect a camera and try again.";
            break;
          case "NotReadableError":
            errorMessage =
              "Camera is in use by another application. Please close other apps using the camera.";
            break;
          case "OverconstrainedError":
            errorMessage =
              "Camera does not support the requested configuration.";
            break;
          default:
            errorMessage = `Camera error: ${error.message}`;
        }
      }

      setCameraError(errorMessage);
    } finally {
      setIsLoadingCamera(false);
    }
  };

  const takePhoto = () => {
    if (!videoRef.current || !stream) return;

    // Trigger flash effect
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 800);

    // Play shutter sound
    playShutter();

    try {
      // Create a canvas element to capture the photo
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      // Setup horizontal flip for selfie camera (mirror effect)
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);

      // Apply the selected effect if any - Safari compatible approach
      try {
        if (selectedEffect && selectedEffect.name !== "Normal") {
          ctx.filter = selectedEffect.filter;
        }
      } catch (filterError) {
        console.error("Error applying filter:", filterError);
        // Continue without filter if there's an error
      }

      // Draw the current video frame on the canvas
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      // Restore canvas context
      ctx.restore();

      // Convert the canvas to a data URL that can be displayed as an image
      // Use explicit MIME type and quality for better Safari compatibility
      let photoDataUrl;
      try {
        photoDataUrl = canvas.toDataURL("image/jpeg", 0.92);
      } catch (dataUrlError) {
        console.error("Error creating data URL:", dataUrlError);
        // Fallback to PNG if JPEG fails
        photoDataUrl = canvas.toDataURL("image/png");
      }

      // Add the new photo to the photos array
      setPhotos((prevPhotos) => {
        const newPhotos = [...prevPhotos, photoDataUrl];
        // Save to localStorage with explicit try/catch for Safari private browsing
        try {
          localStorage.setItem(
            APP_STORAGE_KEYS["photo-booth"].PHOTOS,
            JSON.stringify(newPhotos)
          );
        } catch (storageError) {
          console.error("Error saving to localStorage:", storageError);
          // Continue without saving to localStorage
        }
        return newPhotos;
      });
      setLastPhoto(photoDataUrl);

      // Mark the new photo for animation
      setNewPhotoIndex(photos.length);

      // Show the thumbnail
      setShowThumbnail(true);

      // Hide the thumbnail after 2 seconds
      setTimeout(() => {
        setShowThumbnail(false);
        // Reset the new photo index after animation is likely done
        setTimeout(() => {
          setNewPhotoIndex(null);
        }, 500);
      }, 2000);
    } catch (error) {
      console.error("Error taking photo:", error);
    }
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

    // Clear photos from localStorage with Safari compatibility
    try {
      localStorage.setItem(
        APP_STORAGE_KEYS["photo-booth"].PHOTOS,
        JSON.stringify([])
      );
    } catch (storageError) {
      console.error("Error clearing photos from localStorage:", storageError);
      // Continue without saving to localStorage
    }
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
        <div className="flex flex-col w-full h-full bg-neutral-500 max-h-full overflow-hidden">
          {/* Camera view area - takes available space but doesn't overflow */}
          <div
            className={`flex-1 min-h-0 relative ${
              !stream || isLoadingCamera || cameraError
                ? "pointer-events-none opacity-50"
                : ""
            }`}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              {stream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover transform scale-x-[-1]"
                  style={{
                    filter: selectedEffect.filter,
                  }}
                />
              ) : isLoadingCamera ? (
                <div className="flex flex-col items-center justify-center text-white h-full w-full"></div>
              ) : cameraError ? (
                <div className="flex flex-col items-center justify-center text-white h-full w-full">
                  <p className="font-geneva-12">{cameraError}</p>
                  <Button
                    onClick={startCamera}
                    className="mt-4 bg-black hover:bg-black/80 rounded-full text-sm px-4 py-1.5"
                  >
                    Try Again
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-white h-full w-full p-8">
                  <Button
                    onClick={startCamera}
                    className="bg-blue-600 hover:bg-blue-700 text-sm px-4 py-1.5"
                  >
                    Start Camera
                  </Button>
                </div>
              )}

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
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.div
                      className="grid grid-cols-3 gap-4 p-4 w-full max-w-4xl max-h-full overflow-auto"
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
                              ? "border-white"
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
                          {videoRef.current && stream && (
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
                          <div className="absolute bottom-0 left-0 right-0 text-center py-2 bg-black/50 text-white text-[16px]">
                            {effect.name}
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Photo strip preview - positioned in camera view area, but above bottom controls */}
              <AnimatePresence mode="wait">
                {showPhotoStrip && photos.length > 0 && !isInitialLoad && (
                  <motion.div
                    className="absolute bottom-0 inset-x-0 w-full bg-white/40 backdrop-blur-sm p-1 overflow-x-auto"
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 50, opacity: 0 }}
                    transition={{
                      type: "tween",
                      ease: "easeOut",
                      duration: 0.2,
                    }}
                  >
                    <div className="flex flex-row space-x-1 h-20 w-max">
                      {[...photos].reverse().map((photo, index) => {
                        // Calculate the original index (before reversing)
                        const originalIndex = photos.length - 1 - index;
                        // Check if this is the new photo that was just added
                        const isNewPhoto = originalIndex === newPhotoIndex;

                        return (
                          <motion.div
                            key={`photo-${originalIndex}`}
                            className="h-full flex-shrink-0"
                            initial={
                              isNewPhoto
                                ? { scale: 0.5, opacity: 0 }
                                : { opacity: 1, scale: 1 }
                            }
                            animate={{ scale: 1, opacity: 1 }}
                            layout
                            transition={{
                              type: "spring",
                              damping: 25,
                              stiffness: 400,
                              duration: isNewPhoto ? 0.4 : 0,
                            }}
                          >
                            <img
                              src={photo}
                              alt={`Photo ${originalIndex}`}
                              className="h-full w-auto object-contain cursor-pointer transition-opacity hover:opacity-80"
                              onClick={() => {
                                // Create an anchor element to download the image
                                const link = document.createElement("a");
                                link.href = photo;
                                link.download = `photo-booth-image-${Date.now()}-${originalIndex}.jpg`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                            />
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Fixed bottom control bar that always takes full width without overflowing */}
          <div className="flex-shrink-0 w-full bg-black/70 backdrop-blur-md px-6 py-4 flex justify-between items-center z-10">
            <div className="flex space-x-3 relative">
              {/* Thumbnail animation */}
              <AnimatePresence>
                {showThumbnail && lastPhoto && !showPhotoStrip && (
                  <motion.div
                    className="absolute -top-24 left-0 pointer-events-none"
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
                className="h-10 w-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white relative overflow-hidden"
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
                <Images size={18} />
              </button>
              <button
                className="h-10 w-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
                onClick={startMultiPhotoSequence}
                disabled={isMultiPhotoMode || !stream || !!cameraError}
              >
                <Timer size={18} />
              </button>
            </div>

            <Button
              onClick={isMultiPhotoMode ? () => {} : takePhoto}
              className={`rounded-full h-14 w-14 [&_svg]:size-5 ${
                isMultiPhotoMode || !stream || !!cameraError
                  ? `bg-gray-500 cursor-not-allowed`
                  : `bg-red-500 hover:bg-red-600`
              }`}
              disabled={isMultiPhotoMode || !stream || !!cameraError}
            >
              <Camera stroke="white" />
            </Button>

            <Button
              onClick={toggleEffects}
              className="h-10 px-5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-[16px]"
              disabled={!stream || !!cameraError}
            >
              Effects
            </Button>
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
