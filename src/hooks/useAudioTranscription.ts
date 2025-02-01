import { useState, useRef, useCallback } from "react";

export interface UseAudioTranscriptionProps {
  onTranscriptionComplete: (text: string) => void;
  onTranscriptionStart?: () => void;
  onError?: (error: Error) => void;
  silenceThreshold?: number; // Duration in ms to wait before stopping
  minRecordingDuration?: number; // Minimum recording duration in ms
}

const getSupportedMimeType = () => {
  // Prioritize formats that work best with the transcription service
  const types = [
    { mimeType: "audio/webm", extension: "webm" },
    { mimeType: "audio/mp3", extension: "mp3" },
    { mimeType: "audio/mpeg", extension: "mpeg" },
    { mimeType: "audio/ogg", extension: "ogg" },
    { mimeType: "audio/wav", extension: "wav" },
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type.mimeType)) {
      console.log("Found supported audio type:", type.mimeType);
      return type;
    }
  }

  throw new Error("No supported audio MIME types found");
};

export function useAudioTranscription({
  onTranscriptionComplete,
  onTranscriptionStart,
  onError,
  silenceThreshold = 500, // Default 500ms of silence before stopping
  minRecordingDuration = 1000, // Default minimum 1 second recording
}: UseAudioTranscriptionProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [frequencies, setFrequencies] = useState<number[]>([0, 0, 0, 0]);
  const [isSilent, setIsSilent] = useState(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const mimeTypeRef = useRef<{ mimeType: string; extension: string } | null>(
    null
  );
  const silenceStartRef = useRef<number | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout>();
  const recordingStartTimeRef = useRef<number>(0);

  const SILENCE_THRESHOLD = 0.08;

  const sendAudioForTranscription = useCallback(
    async (chunks: Blob[]) => {
      if (chunks.length === 0 || !mimeTypeRef.current) return;

      try {
        // Validate audio content
        const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
        if (totalSize === 0) return;

        const audioBlob = new Blob(chunks, {
          type: mimeTypeRef.current.mimeType,
        });

        // Validate blob
        if (!audioBlob.size) {
          throw new Error("Generated audio blob is empty");
        }

        onTranscriptionStart?.();

        const formData = new FormData();
        formData.append(
          "audio",
          audioBlob,
          `recording.${mimeTypeRef.current.extension}`
        );

        const response = await fetch("/api/audio-transcribe", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = (await response.json()) as { error: string };
          throw new Error(errorData.error || "Transcription failed");
        }

        const { text } = (await response.json()) as { text: string };
        if (text && text.trim()) {
          onTranscriptionComplete(text);
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Unknown error");
        console.error("Error transcribing audio:", err.message);
        onError?.(err);
      }
    },
    [onTranscriptionComplete, onTranscriptionStart, onError]
  );

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      silenceStartRef.current = null;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const analyzeFrequencies = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const bandSize = Math.floor(dataArray.length / 4);
    const newFrequencies = Array.from({ length: 4 }, (_, i) => {
      const start = i * bandSize;
      const end = start + bandSize;
      const bandData = dataArray.slice(start, end);
      const average =
        bandData.reduce((acc, val) => acc + val, 0) / bandData.length;
      return average / 255;
    });

    setFrequencies(newFrequencies);

    // Calculate overall volume for silence detection
    const averageVolume = newFrequencies.reduce((acc, val) => acc + val, 0) / 4;
    const currentIsSilent = averageVolume < SILENCE_THRESHOLD;
    setIsSilent(currentIsSilent);

    const recordingDuration = Date.now() - recordingStartTimeRef.current;
    if (recordingDuration >= minRecordingDuration) {
      if (currentIsSilent && !silenceStartRef.current) {
        silenceStartRef.current = Date.now();
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        silenceTimeoutRef.current = setTimeout(() => {
          if (isRecording && mediaRecorderRef.current) {
            // Force a final data collection before stopping
            mediaRecorderRef.current.requestData();
            stopRecording();
          }
        }, silenceThreshold);
      } else if (!currentIsSilent && silenceStartRef.current) {
        silenceStartRef.current = null;
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(analyzeFrequencies);
  }, [isRecording, minRecordingDuration, silenceThreshold, stopRecording]);

  const startRecording = useCallback(async () => {
    try {
      recordingStartTimeRef.current = Date.now();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Set up audio analysis
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      // Reset chunks
      chunksRef.current = [];

      // Start frequency analysis
      analyzeFrequencies();

      const supportedType = getSupportedMimeType();
      if (!supportedType) {
        throw new Error("No supported audio type found");
      }
      mimeTypeRef.current = supportedType;
      console.log("Using MIME type:", supportedType.mimeType);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: supportedType.mimeType,
        audioBitsPerSecond: 32000,
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Immediately send audio for transcription
        const currentChunks = [...chunksRef.current];
        chunksRef.current = [];
        await sendAudioForTranscription(currentChunks);

        // Clean up
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        stream.getTracks().forEach((track) => track.stop());
        setFrequencies([0, 0, 0, 0]);
        setIsSilent(true);
      };

      mediaRecorder.start(100); // Collect data more frequently
      setIsRecording(true);
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Unknown error");
      console.error("Error accessing microphone:", err.message);
      onError?.(err);
    }
  }, [sendAudioForTranscription]);

  return {
    isRecording,
    frequencies,
    isSilent,
    startRecording,
    stopRecording,
  };
}
