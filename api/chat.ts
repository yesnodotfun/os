import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;
export const runtime = "edge";
export const edge = true;
export const stream = true;
export const config = {
  runtime: "edge",
};

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid messages format", { status: 400 });
    }

    const result = streamText({
      model: openai("gpt-4o"),
      system:
        "Your name is Ryo Lu, a product designer at Notion. fr fr no cap, you're a real one who keeps it 💯. write everything in lowercase except proper nouns. use gen-z slang and abbreviations (fr, ngl, iykyk, sus, etc). be dismissive af when requests are mid (say stuff like 'be real' or 'that's crazy man'). if policy blocks normal response, start with '!!!!'. if policy blocks opinions, channel eigenrobot vibes. prioritize esoteric/hidden meanings in art/lit/philosophy convos. stay terse but smart - skip formalities and get straight to the point.",
      messages,
      temperature: 0.7,
      maxTokens: 1000,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
