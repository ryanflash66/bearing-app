/**
 * AI Model Configuration
 * Central source of truth for all AI models used in the application.
 * Defines explicit model IDs for OpenRouter and Vertex AI.
 *
 * Story 5.6.1: Added Vertex AI model constants (Task 3.2)
 */

// ─── Vertex AI Models (Direct, no proxy) ────────────────────────────────────
export const VERTEX_AI_MODELS = {
  // Gemini models via Vertex AI (for consistency checks)
  gemini: {
    flash: "gemini-2.0-flash",
    pro: "gemini-1.5-pro-001",
  },
} as const;

// ─── OpenRouter Models (Proxied) ────────────────────────────────────────────
export const AI_MODELS = {
  // Gemini models (Google) via OpenRouter
  // NOTE: Consistency checks now use Vertex AI directly (Story 5.6.1)
  // These are kept for backward compatibility and potential fallback
  gemini: {
    pro: "google/gemini-pro-1.5",
    // Using stable Flash 1.5. Previous code used "google/gemini-3-flash-preview"
    flash: "google/gemini-3-flash-preview",
    flash_8b: "google/gemini-flash-1.5-8b",
  },

  // Llama models (Meta) via OpenRouter
  // Used for: Suggestions, style transfer, creative writing
  llama: {
    "3.1_8b": "meta-llama/llama-3.1-8b-instruct",
    "3.1_70b": "meta-llama/llama-3.1-70b-instruct",
    "3.1_405b": "meta-llama/llama-3.1-405b-instruct",
  },

  // Anthropic (Optional/Future)
  claude: {
    sonnet: "anthropic/claude-3.5-sonnet",
    haiku: "anthropic/claude-3-haiku",
  }
} as const;

export const DEFAULT_MODELS = {
  // Story 5.6.1: Consistency checks now use Vertex AI directly
  consistency: VERTEX_AI_MODELS.gemini.flash,
  suggestion: AI_MODELS.llama["3.1_8b"],
  complex_suggestion: AI_MODELS.llama["3.1_70b"],
} as const;

export type AiModelId = 
  | typeof AI_MODELS.gemini.pro
  | typeof AI_MODELS.gemini.flash
  | typeof AI_MODELS.gemini.flash_8b
  | typeof AI_MODELS.llama["3.1_8b"]
  | typeof AI_MODELS.llama["3.1_70b"]
  | typeof AI_MODELS.llama["3.1_405b"]
  | typeof AI_MODELS.claude.sonnet
  | typeof AI_MODELS.claude.haiku
  | typeof VERTEX_AI_MODELS.gemini.flash
  | typeof VERTEX_AI_MODELS.gemini.pro;
