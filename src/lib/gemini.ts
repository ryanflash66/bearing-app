/**
 * Gemini Consistency Check Module
 *
 * Story 5.6.1: Refactored to use Vertex AI directly (replacing OpenRouter proxy).
 * AC 5.6.1.1: All consistency checks route through Vertex AI
 * AC 5.6.1.2: Context Caching for manuscript content
 * AC 5.6.1.5: Usage metadata with cache cost tracking
 * AC 5.6.1.6: Output format matches ConsistencyReport schema
 * AC 5.6.1.10: Model ID logged as Vertex AI model name
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  checkUsageLimit,
  logUsageEvent,
} from "./ai-usage";
import { createClient } from "@supabase/supabase-js";
import {
  analyzeConsistencyWithVertexAI,
  isVertexAIConfigured,
  createCachedContent,
  getCachedContent,
  invalidateCache,
  VERTEX_GEMINI_MODEL,
  VertexAIServiceError,
  countTokens,
} from "./vertex-ai";
import { VERTEX_AI_MODELS } from "./config/ai-models";

// Types - AC 8.7.2: Expanded types to include grammar and style
export interface ConsistencyIssue {
  type: "character" | "plot" | "timeline" | "tone" | "grammar" | "style";
  severity: "low" | "medium" | "high";
  location: {
    chapter?: number | null;
    quote: string;
    offset?: number | null;
  };
  explanation: string;
  suggestion?: string;
  documentPosition?: number; // AC 8.7.2: Character offset from document start for stable sorting
}

export interface ConsistencyReport {
  issues: ConsistencyIssue[];
  summary?: string;
}

export interface ConsistencyCheckJob {
  id: string;
  manuscript_id: string;
  status: "queued" | "running" | "completed" | "failed" | "canceled";
  model: string;
  input_hash: string;
  report_json: ConsistencyReport | null;
  tokens_estimated: number;
  tokens_actual: number;
  error_message: string | null;
  created_by: string;
  created_at: string;
  completed_at: string | null;
}

export interface CreateConsistencyCheckInput {
  manuscriptId: string;
  userId: string;
}

export interface ConsistencyCheckResult {
  jobId: string;
  status: "queued" | "running" | "completed" | "failed";
  estimatedTokens: number;
  cached?: boolean;
}

// Maximum tokens per chunk (500k as per AC 3.1.3)
const MAX_CHUNK_TOKENS = 500_000;

/**
 * Estimate token count for text (rough approximation: 1 token ≈ 4 characters)
 * This matches the pattern used in llama.ts
 */
export function estimateTokens(text: string): number {
  // Rough approximation: average English token is ~4 characters
  // Add some overhead for prompt structure
  const baseTokens = Math.ceil(text.length / 4);
  const promptOverhead = 200; // Higher overhead for Gemini consistency check prompt
  return baseTokens + promptOverhead;
}

/**
 * Compute SHA-256 hash of manuscript content for caching
 * AC 5.6.1.4: Strict SHA-256 hash matching for invalidation
 */
export async function computeInputHash(content: string): Promise<string> {
  // Normalize content before hashing (strip trailing whitespace, normalize line endings)
  const normalized = content.replace(/\r\n/g, "\n").trim();

  // Use Web Crypto API for secure hashing
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Fallback for server-side (Node.js)
  if (typeof process !== "undefined" && process.versions?.node) {
    const crypto = await import("crypto");
    return crypto.createHash("sha256").update(normalized).digest("hex");
  }

  // AC 5.6.1.4: SHA-256 is required for strict hash-based invalidation.
  // Both Web Crypto and Node.js crypto should always be available in our target environments.
  throw new Error("No SHA-256 implementation available - cannot compute secure input hash");
}

/**
 * Chunk manuscript content into safe segments (≤500k tokens per chunk)
 * Attempts to split at paragraph boundaries when possible
 */
export function chunkManuscript(content: string, maxTokens: number = MAX_CHUNK_TOKENS): string[] {
  const estimatedTokens = estimateTokens(content);
  
  // If content fits in one chunk, return as-is
  if (estimatedTokens <= maxTokens) {
    return [content];
  }

  // Calculate approximate chunk size in characters
  // Using 4 chars per token as approximation
  const chunkSizeChars = Math.floor((maxTokens * 4) * 0.9); // Use 90% to leave margin

  const chunks: string[] = [];
  let currentChunk = "";
  let currentTokens = 0;

  // Split by paragraphs first (double newline)
  const paragraphs = content.split(/\n\s*\n/);

  for (const paragraph of paragraphs) {
    const paraTokens = estimateTokens(paragraph);

    // If paragraph alone exceeds chunk size, split it by sentences
    if (paraTokens > maxTokens) {
      // Flush current chunk if it has content
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
        currentTokens = 0;
      }

      // Split large paragraph by sentences
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        const sentTokens = estimateTokens(sentence);
        
        if (currentTokens + sentTokens > maxTokens && currentChunk.trim()) {
          chunks.push(currentChunk.trim());
          currentChunk = sentence;
          currentTokens = sentTokens;
        } else {
          currentChunk += (currentChunk ? " " : "") + sentence;
          currentTokens += sentTokens;
        }
      }
    } else {
      // Check if adding this paragraph would exceed chunk size
      if (currentTokens + paraTokens > maxTokens && currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = paragraph;
        currentTokens = paraTokens;
      } else {
        currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
        currentTokens += paraTokens;
      }
    }
  }

  // Add remaining chunk if any
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [content];
}

/**
 * Check if a consistency check already exists for this content (application-level cache lookup)
 */
export async function findCachedCheck(
  supabase: SupabaseClient,
  manuscriptId: string,
  inputHash: string
): Promise<ConsistencyCheckJob | null> {
  const { data, error } = await supabase
    .from("consistency_checks")
    .select("*")
    .eq("manuscript_id", manuscriptId)
    .eq("input_hash", inputHash)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No cached check found
      return null;
    }
    console.error("Error finding cached check:", error);
    return null;
  }

  return data as ConsistencyCheckJob;
}

/**
 * Create a consistency check job record in the database
 * AC 5.6.1.10: Now uses Vertex AI model name
 */
export async function createConsistencyCheckJob(
  supabase: SupabaseClient,
  manuscriptId: string,
  userId: string,
  inputHash: string,
  estimatedTokens: number
): Promise<{ jobId: string; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("consistency_checks")
      .insert({
        manuscript_id: manuscriptId,
        created_by: userId,
        input_hash: inputHash,
        status: "queued",
        model: VERTEX_GEMINI_MODEL, // AC 5.6.1.10: Vertex AI model name
        tokens_estimated: estimatedTokens,
        tokens_actual: 0,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating consistency check job:", error);
      return { jobId: "", error: error.message };
    }

    return { jobId: data.id, error: null };
  } catch (err) {
    console.error("Unexpected error creating consistency check job:", err);
    return { jobId: "", error: "Failed to create consistency check job" };
  }
}

/**
 * Process a consistency check job using Vertex AI (async worker function).
 * This handles chunking, calling Vertex AI (with optional context caching), and storing results.
 *
 * AC 5.6.1.1: Direct Vertex AI
 * AC 5.6.1.2: Context Caching
 * AC 5.6.1.5: Usage metadata with cache cost tracking
 */
export async function processConsistencyCheckJob(
  supabase: SupabaseClient,
  jobId: string,
  manuscriptId: string,
  content: string,
  userId: string,
  accountId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const startTime = performance.now();

    // Update status to running
    const { error: updateError } = await supabase
      .from("consistency_checks")
      .update({ status: "running" })
      .eq("id", jobId);

    if (updateError) {
      console.error("Error updating job status to running:", updateError);
      return { success: false, error: updateError.message };
    }

    // Compute hash for cache operations
    const inputHash = await computeInputHash(content);
    const tokenCount = await countTokens(content);

    // ─── Vertex AI Context Caching Logic ─────────────────────────────────
    let activeCacheId: string | null = null;
    let cacheCreationTokens = 0;
    let cacheHitTokens = 0;

    // Try to find an existing cached context (AC 5.6.1.2)
    const existingCache = await getCachedContent(
      supabase,
      manuscriptId,
      accountId,
      inputHash
    );

    if (existingCache) {
      // Cache hit!
      activeCacheId = existingCache.cache_id;
      console.log(`[Gemini] Cache HIT for manuscript ${manuscriptId}: ${activeCacheId}`);
    } else {
      // No cache hit. Try to create one if content is large enough.
      // First, invalidate any old caches for this manuscript (hash mismatch = content changed)
      await invalidateCache(supabase, manuscriptId, accountId);

      const cacheResult = await createCachedContent(
        supabase,
        manuscriptId,
        accountId,
        content,
        inputHash,
        tokenCount
      );

      if (cacheResult) {
        activeCacheId = cacheResult.cacheName;
        cacheCreationTokens = cacheResult.tokensUsed;
        console.log(
          `[Gemini] Cache CREATED for manuscript ${manuscriptId}: ${activeCacheId}`
        );
      } else {
        console.log(
          `[Gemini] No cache (content too small or thrashing guard). Using standard inference.`
        );
      }
    }

    // ─── Run consistency analysis ────────────────────────────────────────
    const chunks = chunkManuscript(content);
    const allIssues: ConsistencyIssue[] = [];
    let actualPromptTokens = 0;
    let actualCompletionTokens = 0;

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      // Update progress
      await supabase
        .from("consistency_checks")
        .update({
          error_message: `Analysing chunk ${i + 1} of ${chunks.length}...`,
        })
        .eq("id", jobId);

      const chunk = chunks[i];
      try {
        // AC 5.6.1.1: Use Vertex AI directly
        const { report, cacheInfo, tokenUsage } = await analyzeConsistencyWithVertexAI(
          chunk,
          activeCacheId,
          i,
          chunks.length
        );

        allIssues.push(...(report.issues as ConsistencyIssue[]));

        // H5: Accumulate actual token counts from Vertex AI response
        actualPromptTokens += tokenUsage.promptTokens;
        actualCompletionTokens += tokenUsage.completionTokens;

        // Track cache tokens from this chunk
        if (cacheInfo.cacheHit) {
          cacheHitTokens += cacheInfo.cacheHitTokens;
        }
      } catch (chunkError) {
        console.error(`Error processing chunk ${i + 1}:`, chunkError);

        // AC 5.6.1.7: Specific error handling
        if (chunkError instanceof VertexAIServiceError) {
          if (i === 0 && chunks.length === 1) {
            throw chunkError;
          }
        }

        if (i === 0 && chunks.length === 1) {
          throw chunkError;
        }
      }
    }

    // Combine all issues into final report (AC 5.6.1.6)
    const finalReport: ConsistencyReport = {
      issues: allIssues,
      summary: `Found ${allIssues.length} consistency issues across ${chunks.length} chunk(s)`,
    };

    // Use actual token counts from Vertex AI when available, fall back to estimates
    const inputTokens = actualPromptTokens > 0 ? actualPromptTokens : estimateTokens(content);
    const tokensActual = actualPromptTokens > 0
      ? actualPromptTokens + actualCompletionTokens
      : estimateTokens(content) + estimateTokens(JSON.stringify(finalReport));

    // Update job with results
    const { error: completeError } = await supabase
      .from("consistency_checks")
      .update({
        status: "completed",
        report_json: finalReport,
        tokens_actual: tokensActual,
        completed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", jobId);

    if (completeError) {
      console.error("Error updating job with results:", completeError);
      return { success: false, error: completeError.message };
    }

    // Calculate latency
    const endTime = performance.now();
    const latencyMs = Math.round(endTime - startTime);

    // AC 5.6.1.5 & 5.6.1.10: Log usage event with metadata
    const usageMetadata: Record<string, any> = {};
    if (cacheCreationTokens > 0) {
      usageMetadata.cache_creation_tokens = cacheCreationTokens;
      usageMetadata.cache_event = "cache_creation";
    }
    if (cacheHitTokens > 0) {
      usageMetadata.cache_hit_tokens = cacheHitTokens;
      usageMetadata.cache_event = "cache_hit";
    }
    if (activeCacheId) {
      usageMetadata.cache_id = activeCacheId;
    }

    await logUsageEvent(
      supabase,
      accountId,
      userId,
      "consistency_check",
      VERTEX_GEMINI_MODEL, // AC 5.6.1.10: Vertex AI model name
      inputTokens,
      tokensActual,
      latencyMs,
      Object.keys(usageMetadata).length > 0 ? usageMetadata : undefined
    );

    return { success: true };
  } catch (error) {
    // Mark job as failed
    const errorMessage = error instanceof VertexAIServiceError
      ? error.getUserFriendlyMessage()
      : error instanceof Error
        ? error.message
        : "Unknown error";

    await supabase
      .from("consistency_checks")
      .update({
        status: "failed",
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return { success: false, error: errorMessage };
  }
}

/**
 * Main function to initiate a consistency check
 * Returns immediately with job ID (async processing)
 */
export async function initiateConsistencyCheck(
  supabase: SupabaseClient,
  input: CreateConsistencyCheckInput,
  scheduleBackgroundWork?: (work: () => Promise<void>) => void
): Promise<ConsistencyCheckResult> {
  const { manuscriptId, userId } = input;

  // 1. Get manuscript content and account_id
  const { data: manuscript, error: manuscriptError } = await supabase
    .from("manuscripts")
    .select("content_text, account_id")
    .eq("id", manuscriptId)
    .single();

  if (manuscriptError || !manuscript) {
    throw new Error("Manuscript not found");
  }

  const content = manuscript.content_text || "";

  if (!content.trim()) {
    throw new Error("Manuscript content is empty");
  }

  // 2. Compute input hash for caching (AC 5.6.1.4: strict SHA-256)
  const inputHash = await computeInputHash(content);

  // 3. Check application-level cache (completed consistency check with same hash)
  const cachedCheck = await findCachedCheck(supabase, manuscriptId, inputHash);
  if (cachedCheck) {
    // Return cached result immediately
    return {
      jobId: cachedCheck.id,
      status: "completed",
      estimatedTokens: cachedCheck.tokens_estimated,
      cached: true,
    };
  }

  // 4. Estimate tokens
  const estimatedTokens = estimateTokens(content);

  // 5. Check token cap using billing cycle
  try {
    await checkUsageLimit(supabase, manuscript.account_id, estimatedTokens);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Token cap exceeded");
  }

  // 6. Check Vertex AI is configured (AC 5.6.1.7: no OpenRouter fallback)
  if (!isVertexAIConfigured()) {
    if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
      // Dev/test mode: create job and immediately mark completed with mock report
      console.warn("[Gemini] Vertex AI not configured - returning mock result in dev mode");
      const { jobId: devJobId, error: devJobError } = await createConsistencyCheckJob(
        supabase, manuscriptId, userId, inputHash, estimatedTokens
      );
      if (devJobError) throw new Error(devJobError);

      await supabase.from("consistency_checks").update({
        status: "completed",
        report_json: { issues: [], summary: "Mock result - Vertex AI not configured in dev mode" },
        tokens_actual: 0,
        completed_at: new Date().toISOString(),
        error_message: null,
      }).eq("id", devJobId);

      return { jobId: devJobId, status: "completed", estimatedTokens, cached: false };
    }
    throw new Error(
      "AI Service Temporarily Unavailable - Please try again in a few minutes."
    );
  }

  // 7. Create job record
  const { jobId, error } = await createConsistencyCheckJob(
    supabase,
    manuscriptId,
    userId,
    inputHash,
    estimatedTokens
  );

  if (error) {
    throw new Error(error);
  }

  // 8. Process asynchronously using a fresh client to avoid request-context expiration
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const backgroundClient = createClient(supabaseUrl, supabaseServiceKey);

  const backgroundTask = async () => {
    try {
      await processConsistencyCheckJob(
        backgroundClient,
        jobId,
        manuscriptId,
        content,
        userId,
        manuscript.account_id // Pass account_id for cache operations
      );
    } catch (err) {
      console.error("Error processing consistency check job:", err);
    }
  };

  if (scheduleBackgroundWork) {
    scheduleBackgroundWork(backgroundTask);
  } else {
    // Fallback for environments without 'after' support
    backgroundTask();
  }

  return {
    jobId,
    status: "queued",
    estimatedTokens,
    cached: false,
  };
}
