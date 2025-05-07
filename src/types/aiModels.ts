// Shared AI model types and constants
export type AIModel =
  | "gpt-4o"
  | "gpt-4.1"
  | "gpt-4.1-mini"
  | "claude-3.5"
  | "claude-3.7"
  | "gemini-2.5-pro-preview-05-06"
  | "chatgpt-4o-latest"
  | null;

// Same type but without null for API server use
export type SupportedModel = NonNullable<AIModel>;

// Array of all valid models (excluding null)
export const SUPPORTED_AI_MODELS: SupportedModel[] = [
  "gpt-4o",
  "gpt-4.1",
  "gpt-4.1-mini",
  "claude-3.5",
  "claude-3.7",
  "gemini-2.5-pro-preview-05-06",
  "chatgpt-4o-latest"
];

// Model metadata for UI display
export interface AIModelInfo {
  id: AIModel;
  name: string;
  provider: string;
}

export const AI_MODEL_METADATA: AIModelInfo[] = [
  { id: "gemini-2.5-pro-preview-05-06", name: "gemini-2.5-pro", provider: "Google" },
  { id: "claude-3.7", name: "claude-3.7", provider: "Anthropic" },
  { id: "claude-3.5", name: "claude-3.5", provider: "Anthropic" },
  { id: "gpt-4o", name: "gpt-4o", provider: "OpenAI" },
  { id: "gpt-4.1", name: "gpt-4.1", provider: "OpenAI" },
  { id: "gpt-4.1-mini", name: "gpt-4.1-mini", provider: "OpenAI" },
  { id: "chatgpt-4o-latest", name: "chatgpt-4o-latest", provider: "OpenAI" }
];

// Default model
export const DEFAULT_AI_MODEL: SupportedModel = "claude-3.7"; 