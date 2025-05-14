import { z } from "zod";

// Vercel Edge Function configuration
export const config = {
  runtime: "edge",
};

/**
 * Expected request body
 */
const LyricsRequestSchema = z.object({
  title: z.string().optional(),
  artist: z.string().optional(),
  album: z.string().optional(),
});

type LyricsRequest = z.infer<typeof LyricsRequestSchema>;

/**
 * Custom headers required by Kugou endpoints
 */
const kugouHeaders: HeadersInit = {
  "User-Agent":
    '{"percent": 21.4, "useragent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36", "system": "Chrome 116.0 Win10", "browser": "chrome", "version": 116.0, "os": "win10"}',
};

/**
 * Generate a random alphanumeric string of given length
 */
function randomString(length: number, chars: string) {
  let result = "";
  const charsLength = chars.length;
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * charsLength));
  }
  return result;
}

/**
 * Fetch cover image URL for the given song hash and album id
 */
async function getCover(
  hash: string,
  albumId: string | number
): Promise<string> {
  const url = new URL("https://wwwapi.kugou.com/yy/index.php");
  url.searchParams.set("r", "play/getdata");
  url.searchParams.set("hash", hash);
  url.searchParams.set(
    "dfid",
    randomString(
      23,
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    )
  );
  url.searchParams.set(
    "mid",
    randomString(23, "abcdefghijklmnopqrstuvwxyz0123456789")
  );
  url.searchParams.set("album_id", String(albumId));
  url.searchParams.set("_", String(Date.now()));

  const res = await fetch(url.toString(), { headers: kugouHeaders });
  if (!res.ok) return "";
  const json = (await res.json()) as { data?: { img?: string } };
  return json?.data?.img ?? "";
}

/**
 * Decode base64 to UTF-8 string in edge runtimes (Buffer is not available)
 */
function base64ToUtf8(base64: string): string {
  // atob returns a binary string where each charCode is a byte
  const binaryString = atob(base64);
  const bytes = Uint8Array.from(binaryString, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Main handler
 */
export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Parse and validate request body
  let body: LyricsRequest;
  try {
    body = LyricsRequestSchema.parse(await req.json());
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { title = "", artist = "", album = "" } = body;
  if (!title && !artist && !album) {
    return new Response(
      JSON.stringify({
        error: "At least one of title, artist or album is required",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Define minimal response types to avoid any
    type KugouSongInfo = {
      hash: string;
      album_id: string | number;
      songname: string;
      singername: string;
      album_name?: string;
    };

    type KugouSearchResponse = {
      data?: {
        info?: KugouSongInfo[];
      };
    };

    type LyricsCandidate = {
      id: number | string;
      accesskey: string;
    };

    type CandidateResponse = {
      candidates?: LyricsCandidate[];
    };

    type LyricsDownloadResponse = {
      content?: string;
    };

    // 1. Search song
    const keyword = encodeURIComponent(
      [title, artist, album].filter(Boolean).join(" ")
    );
    const searchUrl = `http://mobilecdn.kugou.com/api/v3/search/song?format=json&keyword=${keyword}&page=1&pagesize=2&showtype=1`;

    const searchRes = await fetch(searchUrl, { headers: kugouHeaders });
    if (!searchRes.ok) {
      throw new Error(
        `Kugou search request failed with status ${searchRes.status}`
      );
    }

    const searchJson =
      (await searchRes.json()) as unknown as KugouSearchResponse;
    const infoList: KugouSongInfo[] = searchJson?.data?.info ?? [];

    if (infoList.length === 0) {
      return new Response(
        JSON.stringify({ error: "No matching songs found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Iterate through results until we successfully fetch lyrics
    for (const song of infoList) {
      const songHash: string = song.hash;
      const albumId = song.album_id;

      // 2. Get lyrics candidate id & access key
      const candidateUrl = `https://krcs.kugou.com/search?ver=1&man=yes&client=mobi&keyword=&duration=&hash=${songHash}&album_audio_id=`;
      const candidateRes = await fetch(candidateUrl, { headers: kugouHeaders });
      if (!candidateRes.ok) continue;

      const candidateJson =
        (await candidateRes.json()) as unknown as CandidateResponse;
      const candidate = candidateJson?.candidates?.[0];
      if (!candidate) continue;

      // 3. Download LRC content
      const lyricsId = candidate.id;
      const lyricsKey = candidate.accesskey;
      const lyricsUrl = `http://lyrics.kugou.com/download?ver=1&client=pc&id=${lyricsId}&accesskey=${lyricsKey}&fmt=lrc&charset=utf8`;
      const lyricsRes = await fetch(lyricsUrl, { headers: kugouHeaders });
      if (!lyricsRes.ok) continue;

      const lyricsJson =
        (await lyricsRes.json()) as unknown as LyricsDownloadResponse;
      const encoded = lyricsJson?.content;
      if (!encoded) continue;

      const lyricsText = base64ToUtf8(encoded);

      // 4. Fetch cover image
      const cover = await getCover(songHash, albumId);

      // 5. Build response object
      const result = {
        title: song.songname,
        artist: song.singername,
        album: song.album_name ?? undefined,
        lyrics: lyricsText,
        cover,
      };

      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // If loop completes without returning, we failed to fetch lyrics
    return new Response(
      JSON.stringify({ error: "Lyrics not found for given query" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error fetching lyrics:", error);
    return new Response(JSON.stringify({ error: "Unexpected server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
