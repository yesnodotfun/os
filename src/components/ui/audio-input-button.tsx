import { Mic, Loader2 } from "lucide-react";
import { useAudioTranscription } from "@/hooks/useAudioTranscription";
import { AudioBars } from "./audio-bars";
import { useState } from "react";

interface AudioInputButtonProps {
  onTranscriptionComplete: (text: string) => void;
  onTranscriptionStart?: () => void;
  isLoading?: boolean;
  className?: string;
  silenceThreshold?: number;
}

export function AudioInputButton({
  onTranscriptionComplete,
  onTranscriptionStart,
  isLoading = false,
  className = "",
  silenceThreshold = 1000,
}: AudioInputButtonProps) {
  const [debugState, setDebugState] = useState<{
    isSilent: boolean;
    silenceDuration: number | null;
    recordingDuration: number;
    frequencies: number[];
  } | null>(null);

  const { isRecording, frequencies, isSilent, startRecording, stopRecording } =
    useAudioTranscription({
      onTranscriptionComplete: (text) => {
        onTranscriptionComplete(text);
      },
      onTranscriptionStart: () => {
        onTranscriptionStart?.();
      },
      silenceThreshold,
      onDebugState: setDebugState,
    });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={isRecording ? stopRecording : startRecording}
        className={className}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isRecording ? (
          <AudioBars
            frequencies={frequencies}
            color="black"
            isSilent={isSilent}
          />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </button>
      {isRecording && debugState && (
        <div className="absolute top-[-10px] left-[-220px] text-[10px] text-foreground flex flex-row gap-2 items-start bg-background/95 p-2 rounded-md border shadow-md min-w-[200px] z-[999]">
          <div>Silent: {debugState.isSilent ? "Yes" : "No"}</div>
          <div>
            Silence:{" "}
            {debugState.silenceDuration
              ? `${Math.round(debugState.silenceDuration)}ms`
              : "0ms"}
          </div>
          <div>Time: {Math.round(debugState.recordingDuration)}ms</div>
        </div>
      )}
    </div>
  );
}
