import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { streamText, smoothStream, LanguageModelV1 } from "ai";

// --- Types & Constants ----------------------------------------------------

type SupportedModel =
  | "gpt-4o"
  | "gpt-4.1"
  | "gpt-4.1-mini"
  | "claude-3.5"
  | "claude-3.7"
  | "o3-mini"
  | "gemini-2.5-pro-exp-03-25"
  | null;

const DEFAULT_MODEL: SupportedModel = "claude-3.7";

// Allowed origins for API requests (reuse list from chat.ts)
const ALLOWED_ORIGINS = new Set([
  "https://os.ryo.lu",
  "http://localhost:3000",
]);

// --- Utility Functions ----------------------------------------------------

const isValidOrigin = (origin: string | null): boolean => {
  if (!origin) return false;
  return ALLOWED_ORIGINS.has(origin);
};

const getModelInstance = (model: SupportedModel): LanguageModelV1 => {
  const modelToUse = model || DEFAULT_MODEL;

  switch (modelToUse) {
    case "gpt-4o":
      return openai("gpt-4o");
    case "gpt-4.1":
      return openai("gpt-4.1");
    case "gpt-4.1-mini":
      return openai("gpt-4.1-mini");
    case "o3-mini":
      return openai("o3-mini");
    case "gemini-2.5-pro-exp-03-25":
      return google("gemini-2.5-pro-exp-03-25");
    case "claude-3.7":
      return anthropic("claude-3-7-sonnet-20250219");
    case "claude-3.5":
      return anthropic("claude-3-5-sonnet-20241022");
    default:
      return openai("gpt-4.1");
  }
};

// --- Edge Runtime Config --------------------------------------------------

export const maxDuration = 80;
export const runtime = "edge";
export const edge = true;
export const stream = true;
export const config = { runtime: "edge" };

// --- Handler --------------------------------------------------------------

export default async function handler(req: Request) {
  // CORS / Origin validation
  const origin = req.headers.get("origin");
  if (!isValidOrigin(origin)) {
    return new Response("Unauthorized", { status: 403 });
  }

  const validOrigin = origin as string;

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": validOrigin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const queryModel = url.searchParams.get("model") as SupportedModel | null;

    const { messages, model: bodyModel = DEFAULT_MODEL } = await req.json();

    const model = queryModel || bodyModel;

    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid messages format", { status: 400 });
    }

    if (
      model !== null &&
      ![
        "gpt-4o",
        "gpt-4.1",
        "gpt-4.1-mini",
        "claude-3.5",
        "claude-3.7",
        "o3-mini",
        "gemini-2.5-pro-exp-03-25",
      ].includes(model)
    ) {
      return new Response(`Unsupported model: ${model}`, { status: 400 });
    }

    const selectedModel = getModelInstance(model as SupportedModel);

    const result = streamText({
      model: selectedModel,
      messages,
      // We assume prompt/messages already include necessary system/user details
      temperature: 0.7,
      maxTokens: 4000,
      experimental_transform: smoothStream(),
    });

    const response = result.toDataStreamResponse();

    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", validOrigin);

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error("IE Generate API error:", error);

    if (error instanceof SyntaxError) {
      return new Response(`Bad Request: Invalid JSON - ${error.message}`, {
        status: 400,
      });
    }

    return new Response("Internal Server Error", { status: 500 });
  }
} 