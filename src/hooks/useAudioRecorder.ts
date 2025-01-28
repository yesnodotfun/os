import { useState, useRef, useCallback } from "react";
import { getSupportedMimeType, base64FromBlob } from "../utils/audio";

interface UseAudioRecorderProps {
  onRecordingComplete: (base64Data: string) => void;
  selectedDeviceId: string;
}

export const useAudioRecorder = ({
  onRecordingComplete,
  selectedDeviceId,
}: UseAudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
        },
      });

      setMicPermissionGranted(true);
      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorder.ondataavailable = (e: BlobEvent) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const base64Data = await base64FromBlob(blob);
        onRecordingComplete(base64Data);
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        chunksRef.current = [];
      };

      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      mediaRecorder.start(200);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  }, [selectedDeviceId, onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  return {
    isRecording,
    micPermissionGranted,
    startRecording,
    stopRecording,
  };
};
