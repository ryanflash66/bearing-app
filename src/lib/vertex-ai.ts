/**
 * Vertex AI Client for Gemini Consistency Checks
 *
 * Story 5.6.1: Replace OpenRouter-proxied Gemini calls with direct Vertex AI
 * integration and enable Context Caching for cost savings.
 *
 * AC 5.6.1.1: Direct Vertex AI SDK integration
 * AC 5.6.1.2: Context Caching for manuscript content
 * AC 5.6.1.3: Cache ID tracking in Supabase
 * AC 5.6.1.4: Hash-based invalidation (strict SHA-256)
 * AC 5.6.1.7: Availability & Fallback (no OpenRouter fallback)
 * AC 5.6.1.8: Secure environment config (no JSON file paths)
 */

import {
  VertexAI,
  GenerativeModel,
  Content,
  GenerateContentResult,
} from "@google-cloud/vertexai";
import { SupabaseClient } from "@supabase/supabase-js";
import { GoogleAuth } from "google-auth-library";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Vertex AI model for consistency checks (AC 5.6.1.10) */
export const VERTEX_GEMINI_MODEL = "gemini-2.0-flash";

/** Minimum token count to justify context caching (AC 5.6.1.2, Task 2.1) */
export const MIN_CACHE_TOKENS = 33_000;

/** Default TTL for cached content in seconds (30 minutes) */
export const DEFAULT_CACHE_TTL_SECONDS = 1800;

/** Minimum interval between cache recreations for the same manuscript (5 min) */
const CACHE_THRASHING_GUARD_MS = 5 * 60 * 1000;

/** Default region for Vertex AI (Task 1.4) */
const DEFAULT_REGION = "us-central1";

// ─── Timeout & Retry Configuration ──────────────────────────────────────────

/** Timeout for Vertex AI API calls in milliseconds (20 seconds) */
const VERTEX_API_TIMEOUT_MS = 20_000;

/** Maximum retry attempts (total attempts = 1 initial + 2 retries = 3) */
const MAX_RETRIES = 2;

/** Base delay for exponential backoff in milliseconds */
const RETRY_BASE_DELAY_MS = 500;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VertexAICacheEntry {
  id: string;
  cache_id: string;
  manuscript_id: string;
  account_id: string;
  input_hash: string;
  created_at: string;
  expires_at: string;
  token_count: number;
}

export interface VertexCacheResult {
  cacheHit: boolean;
  cacheId: string | null;
  cacheCreationTokens: number;
  cacheHitTokens: number;
}

/** Error class for Vertex AI specific errors (AC 5.6.1.7) */
export class VertexAIServiceError extends Error {
  public statusCode: number;
  public isRetryable: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = "VertexAIServiceError";
    this.statusCode = statusCode;
    this.isRetryable = statusCode >= 500 || statusCode === 429;
  }

  public getUserFriendlyMessage(): string {
    if (this.statusCode === 429) {
      return "AI service is currently busy. Please try again in a few minutes.";
    }
    // AC 5.6.1.7: Specific user message for unavailability
    return "AI Service Temporarily Unavailable - Please try again in a few minutes.";
  }
}

// ─── Timeout & Retry Helpers ────────────────────────────────────────────────

/**
 * Wrap a fetch call with timeout using AbortController.
 * Returns a promise that rejects with VertexAIServiceError on timeout.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = VERTEX_API_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error: any) {
    if (error.name === "AbortError") {
      // Timeout error - classify as retryable
      throw new VertexAIServiceError(
        `Vertex AI request timed out after ${timeoutMs}ms`,
        504 // Gateway Timeout
      );
    }
    // Network error or other fetch failure - classify as retryable
    throw new VertexAIServiceError(
      `Vertex AI request failed: ${error.message}`,
      503 // Service Unavailable
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Calculate delay with exponential backoff and jitter.
 * Formula: base * (2 ^ attempt) + random jitter
 */
function calculateBackoffDelay(attempt: number): number {
  const exponentialDelay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * RETRY_BASE_DELAY_MS;
  return exponentialDelay + jitter;
}

/**
 * Sleep for specified milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff and jitter.
 * Only retries when error.isRetryable === true.
 * Max 2 retries (total attempts = 3).
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  operationName: string = "Vertex AI operation"
): Promise<T> {
  let lastError: VertexAIServiceError | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      // Convert to VertexAIServiceError if not already
      const vertexError =
        error instanceof VertexAIServiceError
          ? error
          : new VertexAIServiceError(
              error.message || "Unknown error",
              error.statusCode || 500
            );

      lastError = vertexError;

      // Don't retry if error is not retryable
      if (!vertexError.isRetryable) {
        console.error(
          `[Vertex] ${operationName} failed with non-retryable error:`,
          vertexError.message
        );
        throw vertexError;
      }

      // Don't retry if we've exhausted attempts
      if (attempt === MAX_RETRIES) {
        console.error(
          `[Vertex] ${operationName} failed after ${MAX_RETRIES + 1} attempts:`,
          vertexError.message
        );
        throw vertexError;
      }

      // Calculate backoff delay
      const delayMs = calculateBackoffDelay(attempt);
      console.warn(
        `[Vertex] ${operationName} failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}), ` +
          `retrying in ${Math.round(delayMs)}ms: ${vertexError.message}`
      );

      // Wait before retrying
      await sleep(delayMs);
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError || new VertexAIServiceError("Retry logic failed");
}

// ─── Client Initialization ──────────────────────────────────────────────────

/** Singleton instance (per-process) */
let vertexAiInstance: VertexAI | null = null;

/**
 * Get Vertex AI configuration from environment variables.
 * AC 5.6.1.8: Only env var support, no local JSON file paths.
 */
export function getVertexConfig(): {
  projectId: string;
  location: string;
  clientEmail: string;
  privateKey: string;
} {
  const projectId = process.env.GOOGLE_PROJECT_ID;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const location = process.env.GOOGLE_CLOUD_REGION || DEFAULT_REGION;

  if (!projectId) {
    throw new VertexAIServiceError(
      "GOOGLE_PROJECT_ID environment variable is not set",
      500
    );
  }
  if (!clientEmail) {
    throw new VertexAIServiceError(
      "GOOGLE_CLIENT_EMAIL environment variable is not set",
      500
    );
  }
  if (!privateKey) {
    throw new VertexAIServiceError(
      "GOOGLE_PRIVATE_KEY environment variable is not set",
      500
    );
  }

  return {
    projectId,
    location,
    clientEmail,
    // Handle escaped newlines in env vars (common in Vercel/Docker)
    privateKey: privateKey.replace(/\\n/g, "\n"),
  };
}

/**
 * Initialize or return existing Vertex AI client.
 * Task 1.2: Uses env vars for auth, never file paths.
 */
export function getVertexAIClient(): VertexAI {
  if (vertexAiInstance) return vertexAiInstance;

  const config = getVertexConfig();

  vertexAiInstance = new VertexAI({
    project: config.projectId,
    location: config.location,
    googleAuthOptions: {
      credentials: {
        client_email: config.clientEmail,
        private_key: config.privateKey,
      },
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    },
  });

  return vertexAiInstance;
}

/**
 * Get a Generative Model instance for consistency checks.
 */
export function getConsistencyModel(): GenerativeModel {
  const client = getVertexAIClient();
  return client.getGenerativeModel({
    model: VERTEX_GEMINI_MODEL,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
  });
}

/**
 * Check if Vertex AI is properly configured.
 */
export function isVertexAIConfigured(): boolean {
  try {
    getVertexConfig();
    return true;
  } catch {
    return false;
  }
}

/**
 * Reset singleton for testing purposes.
 */
export function resetVertexAIClient(): void {
  vertexAiInstance = null;
}

/**
 * Accurately count tokens in a string using Vertex AI.
 * AC 5.6.1.2: Used for precise caching threshold check.
 */
export async function countTokens(content: string): Promise<number> {
  try {
    const model = getConsistencyModel();
    const result = await model.countTokens({
      contents: [{ role: "user", parts: [{ text: content }] }],
    });
    return result.totalTokens;
  } catch (error) {
    console.error("[Vertex] Failed to count tokens:", error);
    // Fallback to rough estimate if API fails
    return Math.ceil(content.length / 4);
  }
}

// ─── Shared Auth Helper ─────────────────────────────────────────────────────

/**
 * Get an authenticated access token for Vertex AI REST API calls.
 * Shared helper to avoid duplicating GoogleAuth initialization.
 */
export async function getVertexAuthToken(): Promise<string> {
  const config = getVertexConfig();
  const auth = new GoogleAuth({
    credentials: {
      client_email: config.clientEmail,
      private_key: config.privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  return accessToken.token!;
}

// ─── Context Caching ────────────────────────────────────────────────────────

/**
 * Create a cached content resource on Vertex AI.
 * Task 2.1: Minimum token check, thrashing guard, concurrency lock.
 *
 * @returns The Vertex AI cache resource name (e.g., projects/.../cachedContents/...)
 */
export async function createCachedContent(
  supabase: SupabaseClient,
  manuscriptId: string,
  accountId: string,
  content: string,
  inputHash: string,
  tokenCount: number
): Promise<{ cacheName: string; tokensUsed: number } | null> {
  // Minimum token check (Task 2.1)
  if (tokenCount < MIN_CACHE_TOKENS) {
    console.log(
      `[Vertex] Manuscript ${manuscriptId}: ${tokenCount} tokens < ${MIN_CACHE_TOKENS} minimum, skipping cache creation`
    );
    return null;
  }

  // Thrashing guard: check if we recently created a cache for this manuscript (Task 2.1)
  const { data: recentCache } = await supabase
    .from("vertex_ai_caches")
    .select("created_at")
    .eq("manuscript_id", manuscriptId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentCache) {
    const timeSinceLastCreate =
      Date.now() - new Date(recentCache.created_at).getTime();
    if (timeSinceLastCreate < CACHE_THRASHING_GUARD_MS) {
      console.log(
        `[Vertex] Thrashing guard: cache for ${manuscriptId} was created ${Math.round(timeSinceLastCreate / 1000)}s ago, skipping`
      );
      return null;
    }
  }

  // Concurrency: Use advisory lock via Supabase (Task 2.1)
  // We use a SELECT FOR UPDATE SKIP LOCKED pattern via a simple flag check
  const lockKey = `cache_create_${manuscriptId}`;
  const { data: lockAcquired, error: lockError } = await supabase.rpc(
    "try_advisory_lock",
    { lock_key: lockKey }
  );

  // If we can't get the lock (another process is creating), skip
  if (lockError || !lockAcquired) {
    console.log(
      `[Vertex] Concurrency: another process is creating cache for ${manuscriptId}, skipping`
    );
    return null;
  }

  try {
    const config = getVertexConfig();
    const token = await getVertexAuthToken();

    const ttlSeconds = DEFAULT_CACHE_TTL_SECONDS;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    // Prepare system instruction for caching
    const systemInstruction: Content = {
      role: "user",
      parts: [
        {
          text: `You are a professional manuscript editor. You will analyze the following manuscript content for consistency and quality issues. Retain the full text in context for repeated analysis queries.`,
        },
      ],
    };

    // The manuscript content to cache
    const cachedContents: Content[] = [
      {
        role: "user",
        parts: [{ text: content }],
      },
    ];

    // Create cached content via REST API
    const cacheRequestBody = {
      model: `projects/${config.projectId}/locations/${config.location}/publishers/google/models/${VERTEX_GEMINI_MODEL}`,
      displayName: `bearing-manuscript-${manuscriptId}`,
      contents: cachedContents,
      systemInstruction: systemInstruction,
      ttl: `${ttlSeconds}s`,
    };

    const endpoint = `https://${config.location}-aiplatform.googleapis.com/v1/projects/${config.projectId}/locations/${config.location}/cachedContents`;

    // Create cache with timeout and retry logic
    const { cacheName, cacheTokens } = await retryWithBackoff(async () => {
      const response = await fetchWithTimeout(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cacheRequestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[Vertex] Cache creation failed (${response.status}):`,
          errorText
        );

        if (response.status === 429) {
          throw new VertexAIServiceError("Rate limited by Vertex AI", 429);
        }

        throw new VertexAIServiceError(
          `Cache creation failed: ${response.status} - ${errorText}`,
          response.status
        );
      }

      const cacheResource = (await response.json()) as {
        name: string;
        usageMetadata?: { totalTokenCount?: number };
      };

      return {
        cacheName: cacheResource.name,
        cacheTokens: cacheResource.usageMetadata?.totalTokenCount || tokenCount,
      };
    }, "Cache creation");

    // Store cache entry in Supabase (Task 2.4, AC 5.6.1.3)
    const { error: insertError } = await supabase
      .from("vertex_ai_caches")
      .insert({
        cache_id: cacheName,
        manuscript_id: manuscriptId,
        account_id: accountId,
        input_hash: inputHash,
        expires_at: expiresAt,
        token_count: cacheTokens,
      });

    if (insertError) {
      console.error("[Vertex] Failed to store cache entry:", insertError);
      // Cache was created on Vertex, but we failed to track it
      // Best effort: still return it for this request
    }

    console.log(
      `[Vertex] Cache created: ${cacheName} (${cacheTokens} tokens, TTL ${ttlSeconds}s)`
    );

    return { cacheName, tokensUsed: cacheTokens };
  } finally {
    // Release advisory lock
    await supabase.rpc("release_advisory_lock", { lock_key: lockKey }).then(() => {}, () => {});
  }
}

/**
 * Get an existing cached content entry for a manuscript.
 * Task 2.2: Query by manuscript_id + account_id, validate expiry.
 */
export async function getCachedContent(
  supabase: SupabaseClient,
  manuscriptId: string,
  accountId: string,
  inputHash: string
): Promise<VertexAICacheEntry | null> {
  // Query by manuscript_id AND account_id for RLS safety (Task 2.2)
  const { data, error } = await supabase
    .from("vertex_ai_caches")
    .select("*")
    .eq("manuscript_id", manuscriptId)
    .eq("account_id", accountId)
    .eq("input_hash", inputHash)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[Vertex] Error fetching cache entry:", error);
    return null;
  }

  if (!data) return null;

  // Validate the cache still exists on Vertex AI (Task 2.2)
  try {
    const config = getVertexConfig();
    const token = await getVertexAuthToken();

    const getEndpoint = `https://${config.location}-aiplatform.googleapis.com/v1/${data.cache_id}`;
    const validateResponse = await fetchWithTimeout(getEndpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!validateResponse.ok) {
      if (validateResponse.status === 404) {
        // Cache was evicted from Vertex, clean up DB (Task 2.2)
        console.log(
          `[Vertex] Cache ${data.cache_id} evicted from Vertex, cleaning up DB entry`
        );
        await supabase
          .from("vertex_ai_caches")
          .delete()
          .eq("id", data.id);
        return null;
      }
      console.error(
        `[Vertex] Cache validation failed (${validateResponse.status})`
      );
      return null;
    }

    // Optionally refresh TTL (Task 2.2)
    const newExpiresAt = new Date(
      Date.now() + DEFAULT_CACHE_TTL_SECONDS * 1000
    ).toISOString();

    // Update TTL on Vertex AI
    const patchEndpoint = `https://${config.location}-aiplatform.googleapis.com/v1/${data.cache_id}`;
    await fetchWithTimeout(patchEndpoint, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ttl: `${DEFAULT_CACHE_TTL_SECONDS}s`,
      }),
    }).catch((err) =>
      console.warn("[Vertex] TTL refresh failed (non-critical):", err)
    );

    // Update local DB
    await supabase
      .from("vertex_ai_caches")
      .update({ expires_at: newExpiresAt })
      .eq("id", data.id);

    return data as VertexAICacheEntry;
  } catch (err) {
    console.error("[Vertex] Cache validation error (treating as miss):", err);
    // H2: Return null on validation error to ensure safe fallback to standard inference
    return null;
  }
}

/**
 * Invalidate (delete) a cached content resource.
 * Task 2.3: Delete from Vertex AI and DB. Handle non-existent gracefully.
 */
export async function invalidateCache(
  supabase: SupabaseClient,
  manuscriptId: string,
  accountId: string
): Promise<void> {
  // Find all cache entries for this manuscript
  const { data: cacheEntries, error } = await supabase
    .from("vertex_ai_caches")
    .select("id, cache_id")
    .eq("manuscript_id", manuscriptId)
    .eq("account_id", accountId);

  if (error || !cacheEntries || cacheEntries.length === 0) {
    return; // Nothing to invalidate
  }

  const config = getVertexConfig();
  const token = await getVertexAuthToken();

  for (const entry of cacheEntries) {
    try {
      // Delete from Vertex AI
      const deleteEndpoint = `https://${config.location}-aiplatform.googleapis.com/v1/${entry.cache_id}`;
      const deleteResponse = await fetchWithTimeout(deleteEndpoint, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!deleteResponse.ok && deleteResponse.status !== 404) {
        console.warn(
          `[Vertex] Failed to delete cache ${entry.cache_id} from Vertex (${deleteResponse.status})`
        );
      }
    } catch (err) {
      // Handle non-existent resource gracefully (Task 2.3)
      console.warn(
        `[Vertex] Error deleting cache ${entry.cache_id} from Vertex:`,
        err
      );
    }

    // Always delete from DB regardless of Vertex status
    await supabase.from("vertex_ai_caches").delete().eq("id", entry.id);
  }

  console.log(
    `[Vertex] Invalidated ${cacheEntries.length} cache(s) for manuscript ${manuscriptId}`
  );
}

// ─── Consistency Check with Vertex AI ───────────────────────────────────────

/** The consistency check prompt (shared between cached and non-cached paths) */
export const CONSISTENCY_CHECK_PROMPT = `Analyze this manuscript for consistency and quality issues.
Look for:
- Grammar & Spelling: grammatical errors, typos, punctuation issues, spelling mistakes
- Writing Style: passive voice, "telling" instead of "showing", repetitive phrasing, weak verbs
- Tone Drift: sudden shifts in narrative voice, inconsistent formality, mood changes
- Character Consistency: name changes, personality shifts, appearance contradictions
- Plot Consistency: plot gaps, contradictions, logical inconsistencies

For each issue, provide:
- type: one of "grammar", "style", "tone", "character", or "plot"
- severity: "high" for critical, "medium" for important, "low" for minor
- location.quote: exact problematic text
- location.offset: character position from document start (or null)
- explanation: clear explanation of the issue
- suggestion: optional corrected text or improvement suggestion
- documentPosition: character offset from document start for sorting

Return ONLY a valid JSON object with this exact structure:
{
  "issues": [
    {
      "type": "grammar|style|tone|character|plot",
      "severity": "low|medium|high",
      "location": {
        "chapter": null,
        "quote": "<exact text excerpt>",
        "offset": null
      },
      "explanation": "<detailed explanation>",
      "suggestion": "<optional suggestion>",
      "documentPosition": null
    }
  ],
  "summary": "<optional overall summary>"
}`;

/**
 * Run a consistency check using Vertex AI, with optional context caching.
 *
 * AC 5.6.1.1: Direct Vertex AI SDK
 * AC 5.6.1.2: Context Caching
 * AC 5.6.1.6: Output matches ConsistencyReport schema
 * AC 5.6.1.7: Specific error message on unavailability
 */
export async function analyzeConsistencyWithVertexAI(
  content: string,
  cacheId?: string | null,
  chunkIndex?: number,
  totalChunks?: number
): Promise<{
  report: { issues: any[]; summary?: string };
  cacheInfo: {
    cacheHit: boolean;
    cacheCreationTokens: number;
    cacheHitTokens: number;
  };
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
  };
}> {
  try {
    const config = getVertexConfig();
    const chunkInfo =
      chunkIndex !== undefined ? `(chunk ${chunkIndex + 1} of ${totalChunks})` : "";

    // Generate content with retry logic
    const result: GenerateContentResult = await retryWithBackoff(async () => {
      const model = getConsistencyModel();

      try {
        if (cacheId) {
          // Use cached content for inference
          return await model.generateContent({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `Now analyze the manuscript content ${chunkInfo} using the prompt:\n\n${CONSISTENCY_CHECK_PROMPT}`,
                  },
                ],
              },
            ],
            cachedContent: cacheId,
          });
        } else {
          // Standard non-cached inference
          return await model.generateContent({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `${CONSISTENCY_CHECK_PROMPT}\n\nManuscript content ${chunkInfo}:\n\n${content}`,
                  },
                ],
              },
            ],
          });
        }
      } catch (error: any) {
        // Convert SDK errors to VertexAIServiceError
        // Check for specific error conditions
        const errorMessage = error.message || String(error);

        // Rate limit errors
        if (errorMessage.includes("429") || errorMessage.toLowerCase().includes("quota") || errorMessage.toLowerCase().includes("rate limit")) {
          throw new VertexAIServiceError("Rate limited by Vertex AI", 429);
        }

        // Permission/auth errors (non-retryable)
        if (errorMessage.includes("403") || errorMessage.toLowerCase().includes("permission") || errorMessage.toLowerCase().includes("forbidden")) {
          throw new VertexAIServiceError("Permission denied", 403);
        }

        // Invalid request errors (non-retryable)
        if (errorMessage.includes("400") || errorMessage.toLowerCase().includes("invalid")) {
          throw new VertexAIServiceError("Invalid request", 400);
        }

        // Default to retryable 5xx error
        throw new VertexAIServiceError(
          `Vertex AI generation failed: ${errorMessage}`,
          500
        );
      }
    }, `Consistency analysis ${chunkInfo}`);

    // Parse response (AC 5.6.1.6)
    const responseText =
      result.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new VertexAIServiceError(
        "Empty response from Vertex AI",
        500
      );
    }

    // Clean up response text (remove markdown code blocks if present)
    let jsonText = responseText.trim();
    if (jsonText.startsWith("```json")) jsonText = jsonText.slice(7);
    if (jsonText.startsWith("```")) jsonText = jsonText.slice(3);
    if (jsonText.endsWith("```")) jsonText = jsonText.slice(0, -3);
    jsonText = jsonText.trim();

    const parsed = JSON.parse(jsonText);

    // Extract usage metadata (H5: actual token counts from Vertex AI)
    const usageMetadata = result.response?.usageMetadata;
    const promptTokens = usageMetadata?.promptTokenCount || 0;
    const completionTokens = usageMetadata?.candidatesTokenCount || 0;
    const cachedTokens = usageMetadata?.cachedContentTokenCount || 0;

    return {
      report: {
        issues: parsed.issues || [],
        summary: parsed.summary,
      },
      cacheInfo: {
        cacheHit: !!cacheId,
        cacheCreationTokens: cacheId ? 0 : promptTokens,
        cacheHitTokens: cacheId ? cachedTokens : 0,
      },
      tokenUsage: {
        promptTokens,
        completionTokens,
      },
    };
  } catch (error) {
    // AC 5.6.1.7: Handle Vertex AI unavailability
    if (error instanceof VertexAIServiceError) {
      throw error;
    }

    const err = error as any;
    const statusCode = err.status || err.statusCode || err.code || 500;
    const numericStatus = typeof statusCode === "number" ? statusCode : 500;

    console.error("[Vertex] Consistency check error:", error);

    if (numericStatus >= 500 || numericStatus === 429) {
      throw new VertexAIServiceError(
        `Vertex AI error: ${err.message || "Unknown error"}`,
        numericStatus
      );
    }

    throw new VertexAIServiceError(
      `Vertex AI error: ${err.message || "Unknown error"}`,
      numericStatus
    );
  }
}
