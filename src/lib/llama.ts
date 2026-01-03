import { SupabaseClient } from "@supabase/supabase-js";
import { checkUsageLimit, logUsageEvent } from "./ai-usage";
import {
  openRouterChat,
  openRouterChatStream,
  isOpenRouterConfigured,
  getMockResponse,
  OPENROUTER_MODELS,
  OpenRouterError,
} from "./openrouter";

// Types
export interface LlamaSuggestion {
  suggestion: string;
  rationale?: string;
  confidence: number; // 0.0 to 1.0
}

export interface LlamaRequest {
  selectionText: string;
  instruction?: string;
  manuscriptId: string;
}

export interface LlamaResponse {
  suggestion: LlamaSuggestion;
  requestHash: string;
  tokensEstimated: number;
  tokensActual: number;
  cached: boolean;
}

// Session-level cache with 5-minute TTL
interface CachedResponse {
  response: LlamaSuggestion;
  timestamp: number;
  tokensActual: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const sessionCache = new Map<string, CachedResponse>();

// Maximum context window (tokens)
const MAX_CONTEXT_TOKENS = 1000;

/**
 * Estimate token count for text (rough approximation: 1 token ≈ 4 characters)
 * This is a simple heuristic; for production, use a proper tokenizer
 */
export function estimateTokens(text: string): number {
  // Rough approximation: average English token is ~4 characters
  // Add some overhead for prompt structure
  const baseTokens = Math.ceil(text.length / 4);
  const promptOverhead = 50; // Fixed overhead for prompt structure
  return baseTokens + promptOverhead;
}

/**
 * Compute SHA-256 hash of request for caching
 */
export async function computeRequestHash(
  selectionText: string,
  instruction?: string
): Promise<string> {
  const input = `${selectionText}|${instruction || ""}`;
  
  // Use Web Crypto API for secure hashing
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Fallback for server-side (Node.js)
  if (typeof process !== "undefined" && process.versions?.node) {
    const crypto = await import("crypto");
    return crypto.createHash("sha256").update(input).digest("hex");
  }

  // Last resort: simple hash (should not happen in modern environments)
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

/**
 * Check session cache for existing response
 */
function getCachedResponse(requestHash: string): LlamaSuggestion | null {
  const cached = sessionCache.get(requestHash);
  if (!cached) {
    return null;
  }

  // Check TTL
  const age = Date.now() - cached.timestamp;
  if (age > CACHE_TTL_MS) {
    sessionCache.delete(requestHash);
    return null;
  }

  return cached.response;
}

/**
 * Store response in session cache
 */
function setCachedResponse(
  requestHash: string,
  response: LlamaSuggestion,
  tokensActual: number
): void {
  sessionCache.set(requestHash, {
    response,
    timestamp: Date.now(),
    tokensActual,
  });
}

/**
 * Validate context window limits
 */
export function validateContextWindow(selectionText: string, instruction?: string): {
  valid: boolean;
  tokens: number;
  error?: string;
} {
  const fullText = `${selectionText}${instruction ? ` ${instruction}` : ""}`;
  const tokens = estimateTokens(fullText);

  if (tokens > MAX_CONTEXT_TOKENS) {
    return {
      valid: false,
      tokens,
      error: `Selection too large (${tokens} tokens). Maximum is ${MAX_CONTEXT_TOKENS} tokens.`,
    };
  }

  return { valid: true, tokens };
}

/**
 * Call Modal.com Llama endpoint with streaming support
 * Returns an async generator that yields suggestion chunks
 */
async function* callLlamaAPIStream(
  selectionText: string,
  instruction?: string
): AsyncGenerator<string, LlamaSuggestion> {
  // Check if OpenRouter is configured
  if (!isOpenRouterConfigured()) {
    if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
      console.warn("OPENROUTER_API_KEY not configured, using mock streaming response");
      const mockSuggestion = getMockResponse(selectionText, "suggestion");
      // Simulate streaming by yielding chunks
      const words = mockSuggestion.split(" ");
      for (let i = 0; i < words.length; i++) {
        yield (i === 0 ? words[i] : " " + words[i]);
        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return {
        suggestion: mockSuggestion,
        rationale: "This is a mock suggestion for development",
        confidence: 0.75,
      };
    }
    throw new Error("OpenRouter API key not configured");
  }

  try {
    const systemPrompt = "You are a professional writing assistant. Improve the given text for clarity, flow, and readability while preserving the author's unique voice and style. Provide only the improved text without explanations.";
    const userPrompt = instruction
      ? `${instruction}\n\nText to improve:\n${selectionText}`
      : `Improve this text for clarity and flow. Preserve the author's voice.\n\nText to improve:\n${selectionText}`;

    const generator = openRouterChatStream(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      "llama-3.1-8b",
      { temperature: 0.7, max_tokens: 2048 }
    );

    let fullSuggestion = "";
    for await (const chunk of generator) {
      if (typeof chunk === "string") {
        fullSuggestion += chunk;
        yield chunk;
      }
    }

    return {
      suggestion: fullSuggestion,
      rationale: "",
      confidence: 0.8,
    };
  } catch (error) {
    if (error instanceof OpenRouterError) {
      console.error("OpenRouter API error:", error.getUserFriendlyMessage());
      throw new Error(error.getUserFriendlyMessage());
    }
    console.error("Error calling OpenRouter API:", error);
    throw error;
  }
}

/**
 * Call Modal.com Llama endpoint (non-streaming fallback)
 */
async function callLlamaAPI(
  selectionText: string,
  instruction?: string
): Promise<LlamaSuggestion> {
  // Check if OpenRouter is configured
  if (!isOpenRouterConfigured()) {
    if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
      console.warn("OPENROUTER_API_KEY not configured, using mock response");
      return {
        suggestion: getMockResponse(selectionText, "suggestion"),
        rationale: "This is a mock suggestion for development",
        confidence: 0.75,
      };
    }
    throw new Error("OpenRouter API key not configured");
  }

  try {
    const systemPrompt = "You are a professional writing assistant. Improve the given text for clarity, flow, and readability while preserving the author's unique voice and style. Provide only the improved text without explanations.";
    const userPrompt = instruction
      ? `${instruction}\n\nText to improve:\n${selectionText}`
      : `Improve this text for clarity and flow. Preserve the author's voice.\n\nText to improve:\n${selectionText}`;

    const response = await openRouterChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      "llama-3.1-8b",
      { temperature: 0.7, max_tokens: 2048 }
    );

    const suggestion = response.choices?.[0]?.message?.content || "";

    return {
      suggestion,
      rationale: "",
      confidence: 0.8,
    };
  } catch (error) {
    if (error instanceof OpenRouterError) {
      console.error("OpenRouter API error:", error.getUserFriendlyMessage());
      throw new Error(error.getUserFriendlyMessage());
    }
    console.error("Error calling OpenRouter API:", error);
    throw error;
  }
}

/**
 * Main function to get Llama suggestion (streaming version)
 * Handles caching, token validation, and cap enforcement
 * Returns an async generator for streaming responses
 */
export async function* getLlamaSuggestionStream(
  supabase: SupabaseClient,
  request: LlamaRequest,
  userId: string
): AsyncGenerator<string, LlamaResponse> {
  const { selectionText, instruction, manuscriptId } = request;

  // 1. Compute request hash
  const requestHash = await computeRequestHash(selectionText, instruction);

  // 2. Check session cache first
  const cached = getCachedResponse(requestHash);
  if (cached) {
    // Return cached response immediately (no streaming needed)
    const tokensEstimated = estimateTokens(selectionText);
    const cachedEntry = sessionCache.get(requestHash);
    // Yield complete suggestion at once for cached responses
    yield cached.suggestion;
    return {
      suggestion: cached,
      requestHash,
      tokensEstimated,
      tokensActual: cachedEntry?.tokensActual || tokensEstimated,
      cached: true,
    };
  }

  // 3. Validate context window
  const validation = validateContextWindow(selectionText, instruction);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 4. Estimate tokens
  const tokensEstimated = validation.tokens;

  // 5. Check token cap
  const { data: manuscript, error: manuscriptError } = await supabase
    .from("manuscripts")
    .select("account_id")
    .eq("id", manuscriptId)
    .single();

  if (manuscriptError || !manuscript) {
     throw new Error("Manuscript not found");
  }

  try {
    await checkUsageLimit(supabase, manuscript.account_id, tokensEstimated);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Token cap exceeded");
  }

  // 6. Call Llama API with streaming
  let fullSuggestion = "";
  let finalResponse: LlamaSuggestion | null = null;
  const suggestionGenerator = callLlamaAPIStream(selectionText, instruction);
  
  for await (const chunk of suggestionGenerator) {
    if (typeof chunk === "string") {
      fullSuggestion += chunk;
      yield chunk;
    } else {
      // Final response received
      finalResponse = chunk;
      break;
    }
  }

  // Ensure we have the final response
  if (!finalResponse) {
    // Try to get return value from generator
    const result = await suggestionGenerator.next();
    if (result.done && result.value) {
      finalResponse = result.value;
    } else {
      throw new Error("Streaming response incomplete - no final response received");
    }
  }

  // Use fullSuggestion if finalResponse.suggestion is not set
  const suggestionText = finalResponse.suggestion || fullSuggestion;

  // 7. Calculate actual tokens (input + output)
  const outputTokens = estimateTokens(suggestionText);
  const tokensActual = tokensEstimated + outputTokens;

  // 8. Store in session cache
  setCachedResponse(requestHash, finalResponse, tokensActual);

  // 9. Log to database
  await supabase.from("suggestions").insert({
    manuscript_id: manuscriptId,
    request_hash: requestHash,
    original_text: selectionText,
    suggested_text: suggestionText,
    instruction: instruction || null,
    confidence: finalResponse.confidence,
    model: OPENROUTER_MODELS["llama-3.1-8b"], // Using OpenRouter model ID
    tokens_estimated: tokensEstimated,
    tokens_actual: tokensActual,
    created_by: userId,
  });

  await logUsageEvent(
    supabase,
    manuscript.account_id,
    userId,
    "suggestion",
    "llama8b",
    tokensEstimated,
    tokensActual
  );

  return {
    suggestion: finalResponse,
    requestHash,
    tokensEstimated,
    tokensActual,
    cached: false,
  };
}

/**
 * Main function to get Llama suggestion (non-streaming version)
 * Handles caching, token validation, and cap enforcement
 */
export async function getLlamaSuggestion(
  supabase: SupabaseClient,
  request: LlamaRequest,
  userId: string
): Promise<LlamaResponse> {
  const { selectionText, instruction, manuscriptId } = request;

  // 1. Compute request hash
  const requestHash = await computeRequestHash(selectionText, instruction);

  // 2. Check session cache first
  const cached = getCachedResponse(requestHash);
  if (cached) {
    // Get tokens from cache or estimate
    const tokensEstimated = estimateTokens(selectionText);
    const cachedEntry = sessionCache.get(requestHash);
    return {
      suggestion: cached,
      requestHash,
      tokensEstimated,
      tokensActual: cachedEntry?.tokensActual || tokensEstimated,
      cached: true,
      };
  }

  // 3. Validate context window
  const validation = validateContextWindow(selectionText, instruction);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 4. Estimate tokens
  const tokensEstimated = validation.tokens;

  // 5. Check token cap
  const { data: manuscript, error: manuscriptError } = await supabase
    .from("manuscripts")
    .select("account_id")
    .eq("id", manuscriptId)
    .single();

  if (manuscriptError || !manuscript) {
     throw new Error("Manuscript not found");
  }

  try {
    await checkUsageLimit(supabase, manuscript.account_id, tokensEstimated);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Token cap exceeded");
  }

  // 6. Call Llama API
  const suggestion = await callLlamaAPI(selectionText, instruction);

  // 7. Calculate actual tokens (input + output)
  const outputTokens = estimateTokens(suggestion.suggestion);
  const tokensActual = tokensEstimated + outputTokens;

  // 8. Store in session cache
  setCachedResponse(requestHash, suggestion, tokensActual);

  // 9. Log to database
  await supabase.from("suggestions").insert({
    manuscript_id: manuscriptId,
    request_hash: requestHash,
    original_text: selectionText,
    suggested_text: suggestion.suggestion,
    instruction: instruction || null,
    confidence: suggestion.confidence,
    model: OPENROUTER_MODELS["llama-3.1-8b"], // Using OpenRouter model ID
    tokens_estimated: tokensEstimated,
    tokens_actual: tokensActual,
    created_by: userId,
  });

  await logUsageEvent(
    supabase,
    manuscript.account_id,
    userId,
    "suggestion",
    "llama8b",
    tokensEstimated,
    tokensActual
  );

  return {
    suggestion,
    requestHash,
    tokensEstimated,
    tokensActual,
    cached: false,
  };
}
