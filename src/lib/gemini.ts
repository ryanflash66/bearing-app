import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  checkUsageLimit,
  logUsageEvent
} from "./ai-usage";
import {
  openRouterChat,
  isOpenRouterConfigured,
  getMockResponse,
  OPENROUTER_MODELS,
  OpenRouterError,
} from "./openrouter";
import { createClient } from "@supabase/supabase-js";

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
 */
export async function computeInputHash(content: string): Promise<string> {
  // Use Web Crypto API for secure hashing
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Fallback for server-side (Node.js)
  if (typeof process !== "undefined" && process.versions?.node) {
    const crypto = await import("crypto");
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  // Last resort: simple hash (should not happen in modern environments)
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
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
 * Check if a consistency check already exists for this content (cache lookup)
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
        model: OPENROUTER_MODELS["gemini-flash"], // Using OpenRouter model ID
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
 * Call Gemini API to analyze manuscript content for consistency issues
 * This is the async worker function that processes the check
 */
export async function analyzeConsistencyWithGemini(
  content: string,
  chunkIndex?: number,
  totalChunks?: number
): Promise<ConsistencyReport> {
  // Check if OpenRouter is configured
  if (!isOpenRouterConfigured()) {
    if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
      console.warn("OPENROUTER_API_KEY not configured, using mock consistency report");
      const mockJson = getMockResponse("", "consistency");
      return JSON.parse(mockJson) as ConsistencyReport;
    }
    throw new Error("OpenRouter API key not configured");
  }

  // Zod schemas for validation - AC 8.7.2: Expanded to include grammar and style
  const ConsistencyIssueSchema = z.object({
    type: z.enum(["character", "plot", "timeline", "tone", "grammar", "style"]),
    severity: z.enum(["low", "medium", "high"]),
    location: z.object({
      chapter: z.number().optional().nullable(),
      quote: z.string(),
      offset: z.number().optional().nullable(),
    }),
    explanation: z.string(),
    suggestion: z.string().optional(),
    documentPosition: z.number().optional(), // AC 8.7.2: For stable sorting
  });

  const ConsistencyReportSchema = z.object({
    issues: z.array(ConsistencyIssueSchema),
    summary: z.string().optional(),
  });

  try {
    const chunkInfo = chunkIndex !== undefined ? `(chunk ${chunkIndex + 1} of ${totalChunks})` : "";

    const systemPrompt = `You are a professional manuscript editor analyzing text for consistency and quality issues.
Look for:
- Grammar & Spelling: Check for grammatical errors, typos, punctuation issues, and spelling mistakes
- Writing Style: Identify issues like passive voice, "telling" instead of "showing", repetitive phrasing, weak verbs
- Tone Drift: Detect sudden shifts in narrative voice, inconsistent formality, or mood changes
- Character Consistency: Find name changes, personality shifts, appearance contradictions
- Plot Consistency: Identify plot gaps, contradictions, or logical inconsistencies

For each issue, provide:
- type: one of "grammar", "style", "tone", "character", or "plot"
- severity: "high" for critical issues, "medium" for important issues, "low" for minor suggestions
- location.quote: the exact problematic text
- location.offset: character position from document start (if known, otherwise null)
- explanation: clear explanation of the issue
- suggestion: optional corrected text or improvement suggestion
- documentPosition: character offset from document start for sorting (if offset is known)

Return ONLY a valid JSON object with this exact structure (no markdown code blocks):
{
  "issues": [
    {
      "type": "grammar|style|tone|character|plot",
      "severity": "low|medium|high",
      "location": {
        "chapter": <number or null>,
        "quote": "<exact text excerpt>",
        "offset": <character offset or null>
      },
      "explanation": "<detailed explanation>",
      "suggestion": "<optional suggestion>",
      "documentPosition": <character offset or null>
    }
  ],
  "summary": "<optional overall summary>"
}`;

    const userPrompt = `Analyze this manuscript ${chunkInfo} for consistency issues:\n\n${content}`;

    // Call OpenRouter with Gemini Flash model (cost-effective for consistency checks)
    const response = await openRouterChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      "gemini-flash",
      { temperature: 0.3, max_tokens: 4096 }
    );

    const responseText = response.choices?.[0]?.message?.content;
    if (!responseText) {
      throw new Error("Invalid response format from OpenRouter API");
    }

    // Parse JSON from response text (model may wrap JSON in markdown code blocks)
    let jsonText = responseText.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.slice(7);
    }
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith("```")) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();

    try {
      const parsedJson = JSON.parse(jsonText);
      const report = ConsistencyReportSchema.parse(parsedJson);
      return report;
    } catch (parseError) {
      // AC 8.7.2 (Task 4.4): Log malformed response for debugging
      console.error('[Gemini] Malformed response:', response);
      console.error('[Gemini] Parse error:', parseError);
      throw new Error("AI returned unexpected format. Try again.");
    }
  } catch (error) {
    if (error instanceof OpenRouterError) {
      const detailedError = `OpenRouter API error (${error.statusCode}): ${error.message}`;
      console.error(detailedError);
      throw new Error(detailedError);
    }
    console.error("Error calling OpenRouter API:", error);
    throw error;
  }
}

/**
 * Process a consistency check job (async worker function)
 * This handles chunking, calling Gemini, and storing results
 */
export async function processConsistencyCheckJob(
  supabase: SupabaseClient,
  jobId: string,
  manuscriptId: string,
  content: string,
  userId: string
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

    // Chunk the manuscript if needed
    const chunks = chunkManuscript(content);
    const allIssues: ConsistencyIssue[] = [];

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      // Update progress
      await supabase
        .from("consistency_checks")
        .update({ 
          error_message: `Analysing chunk ${i + 1} of ${chunks.length}...` // Temporary status update
        })
        .eq("id", jobId);

      const chunk = chunks[i];
      try {
        const report = await analyzeConsistencyWithGemini(chunk, i, chunks.length);
        allIssues.push(...report.issues);
      } catch (chunkError) {
        console.error(`Error processing chunk ${i + 1}:`, chunkError);
        // Continue with other chunks, but mark job as failed if all chunks fail
        if (i === 0 && chunks.length === 1) {
          // Single chunk failed
          throw chunkError;
        }
        // For multi-chunk, we'll continue but note the error
      }
    }

    // Combine all issues into final report
    const finalReport: ConsistencyReport = {
      issues: allIssues,
      summary: `Found ${allIssues.length} consistency issues across ${chunks.length} chunk(s)`,
    };

    // Calculate actual tokens used
    const inputTokens = estimateTokens(content);
    const outputTokens = estimateTokens(JSON.stringify(finalReport));
    const tokensActual = inputTokens + outputTokens;

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

    // NEW: Log usage event to immutable log
    // Fetch account_id from manuscript first
    const { data: manuscript } = await supabase
      .from("manuscripts")
      .select("account_id")
      .eq("id", manuscriptId)
      .single();
    
    // Calculate latency
    const endTime = performance.now();
    const latencyMs = Math.round(endTime - startTime);

    if (manuscript) {
      await logUsageEvent(
        supabase,
        manuscript.account_id,
        userId,
        "consistency_check",
        "gemini-pro",
        inputTokens, // estimated
        tokensActual, // actual
        latencyMs // latency
      );
    }

    return { success: true };
  } catch (error) {
    // Mark job as failed
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
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

  // 2. Compute input hash for caching
  const inputHash = await computeInputHash(content);

  // 3. Check cache
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

  // 6. Create job record
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

  // 7. Process asynchronously using a fresh client to avoid request-context expiration
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const backgroundClient = createClient(supabaseUrl, supabaseServiceKey);

  const backgroundTask = async () => {
    try {
      await processConsistencyCheckJob(backgroundClient, jobId, manuscriptId, content, userId);
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

