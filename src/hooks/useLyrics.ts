import { useEffect, useState, useRef } from "react";
import { LyricLine } from "@/types/lyrics";
import { parseLRC } from "@/utils/lrcParser";

interface UseLyricsParams {
  /** Song title */
  title?: string;
  /** Song artist */
  artist?: string;
  /** Song album */
  album?: string;
  /** Current playback time in seconds */
  currentTime: number;
}

interface LyricsState {
  lines: LyricLine[];
  currentLine: number;
  isLoading: boolean;
  error?: string;
}

/**
 * Fetch timed lyrics (LRC) for a given song and keep track of which line is currently active
 * based on playback time. Returns the parsed lyric lines and the index of the current line.
 */
export function useLyrics({
  title = "",
  artist = "",
  album = "",
  currentTime,
}: UseLyricsParams): LyricsState {
  const [lines, setLines] = useState<LyricLine[]>([]);
  const [currentLine, setCurrentLine] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Keep last successful lyrics in case we fail next time (network issues, etc.)
  const cachedKeyRef = useRef<string | null>(null);

  // Fetch lyrics when title/artist changes
  useEffect(() => {
    if (!title && !artist && !album) {
      setLines([]);
      setCurrentLine(-1);
      return;
    }

    const cacheKey = `${title}__${artist}__${album}`;

    // If we have already fetched for this key, skip re-fetching
    if (cacheKey === cachedKeyRef.current) return;

    let cancelled = false;
    setIsLoading(true);
    setError(undefined);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.warn("Lyrics fetch timed out");
    }, 15000); // 15 second timeout

    fetch("/api/lyrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, artist, album }),
      signal: controller.signal, // Add AbortSignal
    })
      .then(async (res) => {
        clearTimeout(timeoutId); // Clear timeout if fetch completes
        if (!res.ok) {
          if (res.status === 404 || controller.signal.aborted) {
            // Don't throw for 404 or aborted, handle as "no lyrics"
            return null;
          }
          throw new Error(`Failed to fetch lyrics (status ${res.status})`);
        }
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        if (!json) { // Handle null response from timeout or 404
          throw new Error("No lyrics found or fetch timed out");
        }
        const lrc: string | undefined = json?.lyrics;
        if (!lrc) {
          throw new Error("No lyrics found");
        }
        const cleanedLrc = lrc.replace(/\u200b/g, "");
        const parsed = parseLRC(
          cleanedLrc,
          json?.title ?? title,
          json?.artist ?? artist
        );
        setLines(parsed);
        cachedKeyRef.current = cacheKey;
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error("useLyrics error", err);
        if (err instanceof DOMException && err.name === "AbortError") {
          setError("Lyrics search timed out.");
        } else {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
        setLines([]); // Clear lines on error
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
        clearTimeout(timeoutId); // Ensure timeout is cleared
      });

    return () => {
      cancelled = true;
      controller.abort(); // Abort fetch on cleanup
      clearTimeout(timeoutId); // Clear timeout on cleanup
    };
  }, [title, artist, album]);

  // Update current line on time change
  useEffect(() => {
    if (!lines.length) {
      setCurrentLine(-1);
      return;
    }

    const timeMs = currentTime * 1000;

    // Find the index of the last line whose startTimeMs <= current time
    let idx = lines.findIndex((line, i) => {
      const nextLineStart =
        i + 1 < lines.length ? parseInt(lines[i + 1].startTimeMs) : Infinity;
      return timeMs >= parseInt(line.startTimeMs) && timeMs < nextLineStart;
    });

    if (idx === -1 && timeMs >= parseInt(lines[lines.length - 1].startTimeMs)) {
      idx = lines.length - 1;
    }

    setCurrentLine(idx);
  }, [currentTime, lines]);

  return { lines, currentLine, isLoading, error };
}
