import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from 'zod';

export const config = {
  runtime: "edge",
};

const LyricLineSchema = z.object({
  words: z.string(),
  startTimeMs: z.string(),
});

const TranslateLyricsRequestSchema = z.object({
  lines: z.array(LyricLineSchema),
  targetLanguage: z.string(),
});

// New simplified schema for the AI response object
const AiTranslatedTextsSchema = z.object({
  translatedTexts: z.array(z.string()),
});

type TranslateLyricsRequest = z.infer<typeof TranslateLyricsRequestSchema>;

function msToLrcTime(msStr: string): string {
  const ms = parseInt(msStr, 10);
  if (isNaN(ms)) return "[00:00.00]";

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);

  return `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}]`;
}

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = (await req.json()) as TranslateLyricsRequest;
    const validation = TranslateLyricsRequestSchema.safeParse(body);

    if (!validation.success) {
      return new Response(JSON.stringify({ error: "Invalid request body", details: validation.error.format() }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { lines, targetLanguage } = validation.data;

    if (!lines || lines.length === 0) {
      return new Response("", { // Return empty string for empty LRC
        headers: { "Content-Type": "text/plain" },
      });
    }

    // Simplified system prompt for the AI
    const systemPrompt = `You are an expert lyrics translator. You will be given a JSON array of lyric line objects, where each object has a "words" field (the text to translate) and a "startTimeMs" field (a timestamp).
Your task is to translate the "words" for each line into ${targetLanguage}.
Respond ONLY with a valid JSON object containing a single key "translatedTexts". The value of "translatedTexts" MUST be an array of strings.
This array should contain only the translated versions of the "words" from the input, in the exact same order as they appeared in the input array.
If a line is purely instrumental or cannot be translated (e.g., "---"), return its original "words" text.
Do not include timestamps or any other formatting in your output strings; just the raw translated text for each line.`;
    
    const { object: aiResponse } = await generateObject({
      model: openai("gpt-4.1-mini"),
      schema: AiTranslatedTextsSchema, // Use the new simplified schema for AI output
      prompt: JSON.stringify(lines.map(line => ({ words: line.words }))), // Send only words to AI for translation context
      system: systemPrompt,
      temperature: 0.3,
    });

    // Combine AI translations with original timestamps and format as LRC
    const lrcOutputLines = lines.map((originalLine, index) => {
      const translatedText = aiResponse.translatedTexts[index] || originalLine.words; // Fallback to original if AI misses one
      const lrcTimestamp = msToLrcTime(originalLine.startTimeMs);
      return `${lrcTimestamp}${translatedText}`;
    });

    return new Response(lrcOutputLines.join("\n"), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });

  } catch (error: unknown) {
    console.error("Error translating lyrics:", error);
    let errorMessage = "Error translating lyrics";
    if (error instanceof Error) {
      errorMessage = error.message;
      // Add more details if it's an AI SDK error
      if ('cause' in error && error.cause) {
        errorMessage += ` - Cause: ${JSON.stringify(error.cause)}`;
      }
    }
    // Return error as plain text if API is expected to be text/plain
    return new Response(`Error: ${errorMessage}`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
} 