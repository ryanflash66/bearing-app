import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { checkUsageLimit, logUsageEvent } from "@/lib/ai-usage";
import {
  buildCoverPromptPayload,
  createDeterministicSeed,
  generateVariationSeeds,
} from "@/lib/covers/prompt";

const COVER_STYLES = ["Cinematic", "Illustrated", "Minimalist"] as const;
const DAILY_LIMIT = 5;
const ESTIMATED_TOKENS_PER_JOB = 200_000;
const ACTIVE_JOB_STATUSES = ["queued", "running"] as const;

function parseModalActualTokens(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const source = payload as Record<string, unknown>;
  const candidateValues = [
    source.tokens_actual,
    source.tokensActual,
    source.actual_tokens,
    source.actualTokens,
    typeof source.usage === "object" && source.usage !== null
      ? (source.usage as Record<string, unknown>).tokens_actual
      : null,
    typeof source.usage === "object" && source.usage !== null
      ? (source.usage as Record<string, unknown>).actual_tokens
      : null,
  ];

  for (const value of candidateValues) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      return Math.round(value);
    }
  }

  return null;
}

const createCoverJobSchema = z.object({
  genre: z.string().trim().min(1, "Genre is required").max(80),
  mood: z.string().trim().min(1, "Mood is required").max(80),
  style: z.enum(COVER_STYLES, {
    message: "Style must be Cinematic, Illustrated, or Minimalist",
  }),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(2000),
});

function parseRetryAfterSeconds(response: Response): number | null {
  const retryHeader = response.headers.get("retry-after");
  if (!retryHeader) return null;

  const retrySeconds = Number.parseInt(retryHeader, 10);
  if (Number.isFinite(retrySeconds) && retrySeconds > 0) return retrySeconds;
  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: manuscriptId } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsedBody: z.infer<typeof createCoverJobSchema>;
  try {
    parsedBody = createCoverJobSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid request payload" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const { data: manuscript, error: manuscriptError } = await supabase
    .from("manuscripts")
    .select("id, owner_user_id, account_id, title, metadata")
    .eq("id", manuscriptId)
    .single();

  if (manuscriptError || !manuscript) {
    return NextResponse.json({ error: "Manuscript not found" }, { status: 404 });
  }

  if (manuscript.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: usageCount, error: usageCountError } = await supabase
    .from("ai_usage_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("feature", "cover_generation")
    .gte("created_at", oneDayAgo);

  if (usageCountError) {
    console.error("Cover generation rate limit query failed:", usageCountError);
    return NextResponse.json({ error: "Unable to verify rate limits" }, { status: 500 });
  }

  if ((usageCount || 0) >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: "Daily cover generation limit reached (5/day)." },
      { status: 429 }
    );
  }

  try {
    await checkUsageLimit(supabase, manuscript.account_id, ESTIMATED_TOKENS_PER_JOB);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI usage limit reached.";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const { data: activeJobs, error: activeJobsError } = await supabase
    .from("cover_jobs")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("manuscript_id", manuscriptId)
    .in("status", [...ACTIVE_JOB_STATUSES]);

  if (activeJobsError) {
    console.error("Active cover job query failed:", activeJobsError);
    return NextResponse.json({ error: "Unable to verify active jobs" }, { status: 500 });
  }

  if ((activeJobs || []).length > 0) {
    return NextResponse.json(
      { error: "A cover generation job is already active for this manuscript." },
      { status: 409 }
    );
  }

  const authorName =
    manuscript.metadata &&
    typeof manuscript.metadata === "object" &&
    "author_name" in manuscript.metadata
      ? String((manuscript.metadata as Record<string, unknown>).author_name ?? "")
      : "";
  const promptPayload = buildCoverPromptPayload({
    description: parsedBody.description,
    genre: parsedBody.genre,
    mood: parsedBody.mood,
    style: parsedBody.style,
    title: manuscript.title || "",
    authorName,
  });

  const { data: createdJob, error: createJobError } = await supabase
    .from("cover_jobs")
    .insert({
      user_id: user.id,
      manuscript_id: manuscriptId,
      status: "queued",
      prompt: parsedBody.description,
      genre: parsedBody.genre,
      mood: parsedBody.mood,
      style: parsedBody.style,
      wrapped_prompt: promptPayload.wrappedPrompt,
      provider: "vertex-ai",
      model: "imagen-4.0",
      requested_at: new Date().toISOString(),
    })
    .select("id, status")
    .single();

  if (createJobError || !createdJob) {
    console.error("Cover job creation failed:", createJobError);
    return NextResponse.json({ error: "Failed to create cover job" }, { status: 500 });
  }

  const modalUrl = process.env.MODAL_COVER_URL;
  const modalKey = process.env.MODAL_API_KEY;
  if (!modalUrl || !modalKey) {
    await supabase
      .from("cover_jobs")
      .update({ status: "failed", error_message: "MODAL_COVER_URL or MODAL_API_KEY is not configured." })
      .eq("id", createdJob.id);
    return NextResponse.json(
      { error: "Cover generation service is not configured." },
      { status: 503 }
    );
  }

  const modalStart = Date.now();
  let shouldLogUsage = false;
  // Cover jobs are async; if the trigger response has no usage payload yet, we
  // conservatively meter against the per-job estimate.
  let actualTokensForUsage = ESTIMATED_TOKENS_PER_JOB;
  let modalLatencyMs = 0;
  const baseSeed = createDeterministicSeed(
    `${createdJob.id}:${manuscriptId}:${parsedBody.style}:${parsedBody.description}`
  );
  const variationSeeds = generateVariationSeeds(baseSeed, 4);

  try {
    const modalResponse = await fetch(modalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${modalKey}`,
      },
      body: JSON.stringify({
        job_id: createdJob.id,
        manuscript_id: manuscriptId,
        account_id: manuscript.account_id,
        user_id: user.id,
        title: manuscript.title,
        author_name: authorName,
        description: parsedBody.description,
        genre: parsedBody.genre,
        mood: parsedBody.mood,
        style: parsedBody.style,
        wrapped_prompt: promptPayload.wrappedPrompt,
        negative_prompt: promptPayload.negativePrompt,
        aspect_ratio: promptPayload.aspectRatio,
        variation_seeds: variationSeeds,
      }),
    });
    modalLatencyMs = Date.now() - modalStart;

    if (!modalResponse.ok) {
      if (modalResponse.status === 429) {
        shouldLogUsage = true;
        const retryAfterSeconds = parseRetryAfterSeconds(modalResponse);
        await supabase
          .from("cover_jobs")
          .update({
            status: "queued",
            retry_after: retryAfterSeconds
              ? new Date(Date.now() + retryAfterSeconds * 1000).toISOString()
              : null,
            error_message: "Generation queued due to high demand.",
          })
          .eq("id", createdJob.id);
      } else {
        const errorText =
          typeof modalResponse.text === "function"
            ? await modalResponse.text()
            : "Modal returned an error response.";
        await supabase
          .from("cover_jobs")
          .update({
            status: "failed",
            error_message: `Modal request failed (${modalResponse.status}): ${errorText.slice(0, 300)}`,
          })
          .eq("id", createdJob.id);
      }
    } else {
      shouldLogUsage = true;
      const modalPayload =
        typeof modalResponse.json === "function"
          ? await modalResponse.json().catch(() => null)
          : null;
      const parsedActualTokens = parseModalActualTokens(modalPayload);
      if (parsedActualTokens !== null) {
        actualTokensForUsage = parsedActualTokens;
      }
    }
  } catch (error) {
    console.error("Modal trigger failed:", error);
    await supabase
      .from("cover_jobs")
      .update({
        status: "failed",
        error_message: "Failed to trigger cover generation worker.",
      })
      .eq("id", createdJob.id);
  }

  if (shouldLogUsage) {
    await logUsageEvent(
      supabase,
      manuscript.account_id,
      user.id,
      "cover_generation",
      "imagen-4.0",
      ESTIMATED_TOKENS_PER_JOB,
      actualTokensForUsage,
      modalLatencyMs
    );
  }

  return NextResponse.json(
    {
      job_id: createdJob.id,
      status: createdJob.status,
      message: "Cover generation job accepted.",
    },
    { status: 202 }
  );
}
