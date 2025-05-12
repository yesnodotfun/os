import { useRef, useEffect, useCallback, useState } from "react";

/**
 * Hook that turns short text chunks into speech and queues them in the same
 * `AudioContext` so that playback starts almost immediately and remains
 * gap-free. It is purposely transport-agnostic – just point it at any endpoint
 * that accepts `{ text: string }` in a POST body and returns an audio payload
 * (`audio/mpeg`, `audio/wav`, etc.).
 */
export function useTtsQueue(endpoint: string = "/api/speech") {
  // Lazily instantiated AudioContext shared by this hook instance
  const ctxRef = useRef<AudioContext | null>(null);
  // Absolute start-time for the *next* clip in the queue (in AudioContext time)
  const nextStartRef = useRef(0);
  // Keep track of in-flight requests so we can cancel them if needed
  const controllersRef = useRef<Set<AbortController>>(new Set());
  // Expose whether any TTS audio is currently playing
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Track any sources currently playing so we can stop them
  const playingSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const ensureContext = () => {
    // Recreate if not exists or previously closed (e.g., due to HMR)
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      const WebKitAudioCtx = (
        window as unknown as {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;

      ctxRef.current = new ((window.AudioContext || WebKitAudioCtx) as typeof AudioContext)();
    }
    return ctxRef.current;
  };

  // Promise chain to guarantee ordering regardless of varied fetch latency
  const playChainRef = useRef<Promise<void>>(Promise.resolve());

  /**
   * Speak a chunk of text by fetching the TTS audio and scheduling it directly
   * after whatever is already queued.
   */
  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!text || !text.trim()) return;

      playChainRef.current = playChainRef.current.then(async () => {
        try {
          const controller = new AbortController();
          controllersRef.current.add(controller);
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
            signal: controller.signal,
          });
          controllersRef.current.delete(controller);
          if (!res.ok) {
            console.error("TTS request failed", await res.text());
            return;
          }

          const arrayBuf = await res.arrayBuffer();
          let ctx = ensureContext();
          // Resume if the context was suspended or Safari put it in the non-standard
          // "interrupted" state (happens when the user switches apps or similar).
          let state = ctx.state as AudioContextState | "interrupted";
          if (state === "suspended" || state === "interrupted") {
            await ctx.resume();
          }

          // If the context still isn't running (observed on some iOS Safari
          // versions after returning from background) recreate a fresh one so
          // playback can proceed.
          state = ctx.state as AudioContextState | "interrupted";
          if (state !== "running") {
            try {
              console.debug(
                `TTS AudioContext still in state "${state}" after resume – recreating`
              );
              await ctx.close();
            } catch (_) {
              /* ignore */
            }
            ctxRef.current = null;
            ctx = ensureContext();
          }
          const audioBuf = await ctx.decodeAudioData(arrayBuf);

          const now = ctx.currentTime;
          const start = Math.max(now, nextStartRef.current);

          const src = ctx.createBufferSource();
          src.buffer = audioBuf;
          src.connect(ctx.destination);

          // Keep track of active sources so we can stop them later
          playingSourcesRef.current.add(src);
          setIsSpeaking(true);

          src.onended = () => {
            playingSourcesRef.current.delete(src);
            if (playingSourcesRef.current.size === 0) {
              setIsSpeaking(false);
            }
            if (onEnd) onEnd();
          };

          src.start(start);

          nextStartRef.current = start + audioBuf.duration;
        } catch (err) {
          if ((err as DOMException)?.name !== "AbortError") {
            console.error("Error during speak()", err);
          }
        }
      });
    },
    [endpoint]
  );

  /** Cancel all in-flight requests and reset the queue so the next call starts immediately. */
  const stop = useCallback(() => {
    controllersRef.current.forEach((c) => c.abort());
    controllersRef.current.clear();
    playChainRef.current = Promise.resolve();
    // Stop any sources that are currently playing
    playingSourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch (e) {
        /* ignore */
      }
    });
    playingSourcesRef.current.clear();
    setIsSpeaking(false);
    if (ctxRef.current) {
      nextStartRef.current = ctxRef.current.currentTime;
    }
  }, []);

  // Clean up when the component using the hook unmounts
  useEffect(() => {
    return () => {
      stop();
      // preserve AudioContext across hot reloads instead of closing
    };
  }, [stop]);

  // Effect to handle AudioContext resumption on window focus
  useEffect(() => {
    const handleFocus = async () => {
      if (ctxRef.current) {
        const state = ctxRef.current.state as AudioContextState | "interrupted";
        if (state === "suspended" || state === "interrupted") {
          try {
            await ctxRef.current.resume();
            console.debug("TTS AudioContext resumed on window focus");
          } catch (error) {
            console.error("Failed to resume TTS AudioContext on window focus:", error);
          }
        }
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return { speak, stop, isSpeaking };
}
