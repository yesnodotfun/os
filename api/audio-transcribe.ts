import OpenAI from "openai";
import * as RateLimit from "./utils/rate-limit";

interface OpenAIError {
  status: number;
  message: string;
  error?: {
    message: string;
  };
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const config = {
  runtime: "edge",
};

// Allowed origins for CORS
const ALLOWED_ORIGINS = new Set(["https://os.ryo.lu", "http://localhost:3000"]);

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB limit imposed by OpenAI

export default async function handler(req: Request) {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    if (origin && ALLOWED_ORIGINS.has(origin)) {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }
    return new Response("Unauthorized", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return new Response("Unauthorized", { status: 403 });
  }

  try {
    // Rate limiting (burst + daily) before reading form data
    try {
      const ip = RateLimit.getClientIp(req);
      const BURST_WINDOW = 60; // 1 minute
      const BURST_LIMIT = 10;
      const DAILY_WINDOW = 60 * 60 * 24; // 1 day
      const DAILY_LIMIT = 50;

      const burstKey = RateLimit.makeKey(["rl", "transcribe", "burst", "ip", ip]);
      const dailyKey = RateLimit.makeKey(["rl", "transcribe", "daily", "ip", ip]);

      const burst = await RateLimit.checkCounterLimit({
        key: burstKey,
        windowSeconds: BURST_WINDOW,
        limit: BURST_LIMIT,
      });
      if (!burst.allowed) {
        return new Response(
          JSON.stringify({
            error: "rate_limit_exceeded",
            scope: "burst",
            limit: burst.limit,
            windowSeconds: burst.windowSeconds,
            resetSeconds: burst.resetSeconds,
            identifier: `ip:${ip}`,
          }),
          {
            status: 429,
            headers: {
              "Retry-After": String(burst.resetSeconds ?? BURST_WINDOW),
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": origin,
            },
          }
        );
      }

      const daily = await RateLimit.checkCounterLimit({
        key: dailyKey,
        windowSeconds: DAILY_WINDOW,
        limit: DAILY_LIMIT,
      });
      if (!daily.allowed) {
        return new Response(
          JSON.stringify({
            error: "rate_limit_exceeded",
            scope: "daily",
            limit: daily.limit,
            windowSeconds: daily.windowSeconds,
            resetSeconds: daily.resetSeconds,
            identifier: `ip:${ip}`,
          }),
          {
            status: 429,
            headers: {
              "Retry-After": String(daily.resetSeconds ?? DAILY_WINDOW),
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": origin,
            },
          }
        );
      }
    } catch (rlErr) {
      console.error("Rate limit check failed (transcribe)", rlErr);
      // Fail open: let it continue
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return new Response(JSON.stringify({ error: "No audio file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify file type
    if (!audioFile.type.startsWith("audio/")) {
      return new Response(
        JSON.stringify({ error: "Invalid file type. Must be an audio file." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Verify file size
    if (audioFile.size > MAX_FILE_SIZE_BYTES) {
      return new Response(
        JSON.stringify({
          error: `File exceeds maximum size of ${
            MAX_FILE_SIZE_BYTES / (1024 * 1024)
          }MB`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en",
    });

    return new Response(JSON.stringify({ text: transcription.text }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin },
    });
  } catch (error: unknown) {
    console.error("Error processing audio:", error);
    const openAIError = error as OpenAIError;
    return new Response(
      JSON.stringify({
        error: openAIError.message || "Error processing audio",
        details: openAIError.error?.message,
      }),
      {
        status: openAIError.status || 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin ?? "*" },
      }
    );
  }
}
