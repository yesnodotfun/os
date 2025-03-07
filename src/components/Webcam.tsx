import { useEffect, useRef, useState } from "react";

interface WebcamProps {
  onPhoto?: (photoDataUrl: string) => void;
  className?: string;
  isPreview?: boolean;
  filter?: string;
  onStreamReady?: (stream: MediaStream) => void;
  sharedStream?: MediaStream | null;
}

export function Webcam({ 
  onPhoto, 
  className = "", 
  isPreview = false,
  filter = "none",
  onStreamReady,
  sharedStream
}: WebcamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Start camera when component mounts or shared stream changes
  useEffect(() => {
    if (!isPreview) {
      startCamera();
      return () => stopCamera();
    } else if (sharedStream) {
      setStream(sharedStream);
      if (videoRef.current) {
        videoRef.current.srcObject = sharedStream;
        videoRef.current.play().catch(console.error);
      }
    }
  }, [isPreview, sharedStream]);

  // Handle stream ready callback
  useEffect(() => {
    if (stream && onStreamReady && !isPreview) {
      onStreamReady(stream);
    }
  }, [stream, onStreamReady, isPreview]);

  // Listen for webcam-capture events
  useEffect(() => {
    const handleCapture = () => {
      if (videoRef.current && stream) {
        const canvas = document.createElement("canvas");
        const video = videoRef.current;
        
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Draw the current video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to JPEG data URL
        const photoDataUrl = canvas.toDataURL("image/jpeg", 0.85);
        onPhoto?.(photoDataUrl);
      }
    };

    if (!isPreview) {
      window.addEventListener('webcam-capture', handleCapture);
      return () => window.removeEventListener('webcam-capture', handleCapture);
    }
  }, [stream, onPhoto, isPreview]);

  const startCamera = async () => {
    try {
      const constraints = {
        audio: false,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(console.error);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError(err instanceof Error ? err.message : "Failed to access camera");
    }
  };

  const stopCamera = () => {
    if (stream && !isPreview) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {error ? (
        <div className="text-red-500 p-4 text-center">
          {error}
          <button 
            onClick={startCamera}
            className="ml-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ filter }}
        />
      )}
    </div>
  );
} 