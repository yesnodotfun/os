import { useRef, useEffect, useCallback } from "react";

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

  const ensureContext = () => {
    if (!ctxRef.current) {
      const WebKitAudioCtx = (
        window as unknown as {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;

      ctxRef.current = new ((window.AudioContext ||
        WebKitAudioCtx) as typeof AudioContext)();
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
    (text: string) => {
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
          const ctx = ensureContext();
          const audioBuf = await ctx.decodeAudioData(arrayBuf);

          const now = ctx.currentTime;
          const start = Math.max(now, nextStartRef.current);

          const src = ctx.createBufferSource();
          src.buffer = audioBuf;
          src.connect(ctx.destination);
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
    if (ctxRef.current) {
      nextStartRef.current = ctxRef.current.currentTime;
    }
  }, []);

  // Clean up when the component using the hook unmounts
  useEffect(() => {
    return () => {
      stop();
      ctxRef.current?.close();
    };
  }, [stop]);

  return { speak, stop };
}
