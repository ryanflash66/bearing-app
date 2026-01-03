/**
 * OpenRouter API Adapter
 *
 * Centralizes AI model calls through OpenRouter (https://openrouter.ai).
 * This provides unified billing, model selection, and reduces direct API key sprawl.
 *
 * Story 3.4: Migrate AI Service to OpenRouter
 */

// OpenRouter API endpoint
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// Model mapping: abstract names → OpenRouter model IDs
export const OPENROUTER_MODELS = {
  // Gemini models (for consistency checks)
  "gemini-pro": "google/gemini-pro-1.5",
  "gemini-flash": "google/gemini-flash-1.5-8b",
  "gemini-flash-8b": "google/gemini-flash-1.5-8b",
  // Llama models (for suggestions)
  "llama-8b": "meta-llama/llama-3.1-8b-instruct",
  "llama-70b": "meta-llama/llama-3.1-70b-instruct",
  "llama-3.1-8b": "meta-llama/llama-3.1-8b-instruct",
  // Default fallbacks
  default_consistency: "google/gemini-flash-1.5-8b",
  default_suggestion: "meta-llama/llama-3.1-8b-instruct",
} as const;

export type OpenRouterModelKey = keyof typeof OPENROUTER_MODELS;

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

export interface OpenRouterChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: OpenRouterChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterStreamChunk {
  id: string;
  choices: {
    delta: {
      content?: string;
    };
    finish_reason: string | null;
  }[];
}

export class OpenRouterError extends Error {
  public statusCode: number;
  public isRateLimited: boolean;
  public isInsufficientCredits: boolean;
  public isUpstreamError: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "OpenRouterError";
    this.statusCode = statusCode;
    this.isRateLimited = statusCode === 429;
    this.isInsufficientCredits = statusCode === 402;
    this.isUpstreamError = statusCode === 502;
  }

  public getUserFriendlyMessage(): string {
    if (this.isInsufficientCredits) {
      return "AI service temporarily unavailable. Please try again later.";
    }
    if (this.isRateLimited) {
      return "AI service is busy. Please wait a moment and try again.";
    }
    if (this.isUpstreamError) {
      return "AI service is experiencing issues. Please try again shortly.";
    }
    return "An error occurred with the AI service. Please try again.";
  }
}

/**
 * Get the OpenRouter API key from environment
 */
function getApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }
  return apiKey;
}

/**
 * Get site URL for HTTP-Referer header (helps with OpenRouter rankings)
 */
function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000"
  );
}

/**
 * Make a non-streaming request to OpenRouter
 */
export async function openRouterChat(
  messages: OpenRouterMessage[],
  modelKey: OpenRouterModelKey = "default_consistency",
  options: {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
  } = {}
): Promise<OpenRouterResponse> {
  const apiKey = getApiKey();
  const model = OPENROUTER_MODELS[modelKey];

  const requestBody: OpenRouterRequest = {
    model,
    messages,
    stream: false,
    ...options,
  };

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": getSiteUrl(),
      "X-Title": "Bearing - AI Writing Assistant",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      `OpenRouter API error: ${response.status} ${response.statusText}`,
      errorText
    );
    throw new OpenRouterError(
      `OpenRouter API error: ${response.status} - ${errorText}`,
      response.status
    );
  }

  const data: OpenRouterResponse = await response.json();
  return data;
}

/**
 * Make a streaming request to OpenRouter
 * Returns an async generator that yields content chunks
 */
export async function* openRouterChatStream(
  messages: OpenRouterMessage[],
  modelKey: OpenRouterModelKey = "default_suggestion",
  options: {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
  } = {}
): AsyncGenerator<string, { fullContent: string; usage?: OpenRouterResponse["usage"] }> {
  const apiKey = getApiKey();
  const model = OPENROUTER_MODELS[modelKey];

  const requestBody: OpenRouterRequest = {
    model,
    messages,
    stream: true,
    ...options,
  };

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": getSiteUrl(),
      "X-Title": "Bearing - AI Writing Assistant",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      `OpenRouter API error: ${response.status} ${response.statusText}`,
      errorText
    );
    throw new OpenRouterError(
      `OpenRouter API error: ${response.status} - ${errorText}`,
      response.status
    );
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";

  if (!reader) {
    throw new Error("Response body is not readable");
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "data: [DONE]") {
        continue;
      }

      if (trimmed.startsWith("data: ")) {
        const jsonStr = trimmed.slice(6);
        try {
          const chunk: OpenRouterStreamChunk = JSON.parse(jsonStr);
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            fullContent += content;
            yield content;
          }
        } catch (e) {
          // Skip invalid JSON (partial chunks)
        }
      }
    }
  }

  return { fullContent };
}

/**
 * Helper to check if OpenRouter is configured properly
 */
export function isOpenRouterConfigured(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

/**
 * Get a mock response for development/testing when API key is not configured
 */
export function getMockResponse(prompt: string, type: "consistency" | "suggestion"): string {
  if (type === "consistency") {
    return JSON.stringify({
      issues: [
        {
          type: "character",
          severity: "low",
          location: {
            quote: "Sample text",
            offset: 0,
          },
          explanation: "This is a mock consistency check (OpenRouter not configured)",
          suggestion: "Review character consistency",
        },
      ],
      summary: "Mock consistency check completed (dev mode)",
    });
  }

  return `[Mock] Improved version of your text. (OpenRouter not configured)`;
}
