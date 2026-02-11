/**
 * AI Model Configuration
 * Central source of truth for all AI models used in the application.
 * Defines explicit model IDs for OpenRouter to avoid hardcoding strings.
 */

export const AI_MODELS = {
  // Gemini models (Google) via OpenRouter
  // Used for: Consistency checks, large context analysis
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
  consistency: AI_MODELS.gemini.flash,
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
  | typeof AI_MODELS.claude.haiku;
