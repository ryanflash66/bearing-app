import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { initiateConsistencyCheck } from "@/lib/gemini";

const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 60;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 3;
const RATE_LIMIT_AUDIT_ACTION = "consistency_check_triggered";

function createTraceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `cc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function withTraceHeaders(traceId: string, headers?: HeadersInit): HeadersInit {
  return {
    "X-Trace-Id": traceId,
    ...headers,
  };
}

function errorResponse(
  traceId: string,
  status: number,
  error: string,
  headers?: HeadersInit,
) {
  return NextResponse.json(
    { error, traceId },
    { status, headers: withTraceHeaders(traceId, headers) },
  );
}

function getConsistencyCheckRateLimitConfig() {
  const windowSeconds = Number(
    process.env.CONSISTENCY_CHECK_RATE_LIMIT_WINDOW_SECONDS ??
      DEFAULT_RATE_LIMIT_WINDOW_SECONDS,
  );
  const maxRequests = Number(
    process.env.CONSISTENCY_CHECK_RATE_LIMIT_MAX_REQUESTS ??
      DEFAULT_RATE_LIMIT_MAX_REQUESTS,
  );

  return {
    windowSeconds: Number.isFinite(windowSeconds) && windowSeconds > 0
      ? Math.floor(windowSeconds)
      : DEFAULT_RATE_LIMIT_WINDOW_SECONDS,
    maxRequests: Number.isFinite(maxRequests) && maxRequests > 0
      ? Math.floor(maxRequests)
      : DEFAULT_RATE_LIMIT_MAX_REQUESTS,
  };
}

/**
 * POST /api/manuscripts/:id/consistency-check
 * Initiate an async consistency check for a manuscript using Gemini
 * 
 * Returns: {
 *   jobId: string;
 *   status: "queued" | "running" | "completed";
 *   estimatedTokens: number;
 *   cached?: boolean;
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = createTraceId();

  try {
    const { id: manuscriptId } = await params;
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn("[consistency-check] Unauthorized request", { traceId, manuscriptId });
      return errorResponse(traceId, 401, "Unauthorized");
    }



    // Verify manuscript exists and user has access
    const { data: manuscript, error: manuscriptError } = await supabase
      .from("manuscripts")
      .select("id, account_id, owner_user_id")
      .eq("id", manuscriptId)
      .is("deleted_at", null)
      .single();

    if (manuscriptError || !manuscript) {
      console.warn("[consistency-check] Manuscript lookup failed", {
        traceId,
        manuscriptId,
        userId: user.id,
        manuscriptError,
      });
      return errorResponse(traceId, 404, "Manuscript not found");
    }

    // Story 4.3/5.1 Fix: Get the public.users profile ID
    // The RLS policy requires created_by to match the Profile ID (get_current_user_id()), not Auth ID
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, role")
      .eq("auth_id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("[consistency-check] Profile lookup failed", {
        traceId,
        authUserId: user.id,
        profileError,
      });
      return errorResponse(
        traceId,
        404,
        "User profile not found. Please log out and back in.",
      );
    }

    // Confirm account membership role to avoid silent RLS rejections later.
    const { data: membership, error: membershipError } = await supabase
      .from("account_members")
      .select("account_role")
      .eq("account_id", manuscript.account_id)
      .eq("user_id", profile.id)
      .maybeSingle();

    if (membershipError) {
      console.error("[consistency-check] Membership lookup failed", {
        traceId,
        manuscriptId,
        accountId: manuscript.account_id,
        profileId: profile.id,
        membershipError,
      });
      return errorResponse(traceId, 500, "Unable to verify account membership");
    }

    if (!membership) {
      console.warn("[consistency-check] Membership missing for manuscript account", {
        traceId,
        manuscriptId,
        accountId: manuscript.account_id,
        profileId: profile.id,
      });
      return errorResponse(
        traceId,
        403,
        "You do not have access to run consistency checks for this manuscript.",
      );
    }

    const canRunConsistencyCheck =
      manuscript.owner_user_id === profile.id || membership.account_role === "admin";

    if (!canRunConsistencyCheck) {
      console.warn("[consistency-check] Role denied for consistency check", {
        traceId,
        manuscriptId,
        accountId: manuscript.account_id,
        profileId: profile.id,
        accountRole: membership.account_role,
      });
      return errorResponse(
        traceId,
        403,
        "Only the manuscript owner or an account admin can run consistency checks.",
      );
    }

    const { windowSeconds, maxRequests } = getConsistencyCheckRateLimitConfig();
    const rateLimitWindowStart = new Date(
      Date.now() - windowSeconds * 1000,
    ).toISOString();

    const { count: recentCheckCount, error: rateLimitError } = await supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("account_id", manuscript.account_id)
      .eq("user_id", profile.id)
      .eq("action", RATE_LIMIT_AUDIT_ACTION)
      .eq("entity_type", "manuscript")
      .eq("entity_id", manuscriptId)
      .gte("created_at", rateLimitWindowStart);

    if (rateLimitError) {
      console.error("[consistency-check] Rate-limit query failed", {
        traceId,
        manuscriptId,
        accountId: manuscript.account_id,
        profileId: profile.id,
        rateLimitError,
      });
      return errorResponse(traceId, 500, "Unable to verify rate limits");
    }

    if ((recentCheckCount ?? 0) >= maxRequests) {
      return errorResponse(
        traceId,
        429,
        `Rate limit reached. Please wait ${windowSeconds} seconds before running another consistency check.`,
        {
          "Retry-After": String(windowSeconds),
        },
      );
    }

    // Persist trigger event so request-level throttling applies even for cached responses.
    const { error: triggerLogError } = await supabase.from("audit_logs").insert({
      account_id: manuscript.account_id,
      user_id: profile.id,
      action: RATE_LIMIT_AUDIT_ACTION,
      entity_type: "manuscript",
      entity_id: manuscriptId,
      metadata: {
        trace_id: traceId,
        source: "api.manuscripts.consistency-check.post",
        account_role: membership.account_role,
      },
    });

    if (triggerLogError) {
      console.error("[consistency-check] Failed to record trigger event", {
        traceId,
        manuscriptId,
        accountId: manuscript.account_id,
        profileId: profile.id,
        triggerLogError,
      });
      return errorResponse(traceId, 500, "Unable to process consistency check request");
    }

    // Initiate consistency check (async, returns immediately)
    // Pass profile.id as userId (which becomes created_by)
    // Initiate consistency check (async, returns immediately)
    // Pass profile.id as userId (which becomes created_by)
    // Use 'after' to ensure background task completes even after response is sent
    const { jobId, estimatedTokens, status, cached } = await initiateConsistencyCheck(
      supabase, 
      {
        manuscriptId,
        userId: profile.id,
      },
      (backgroundTask) => {
        // This callback allows us to wrap the task in 'after'
        after(backgroundTask);
      }
    );

    return NextResponse.json(
      {
        jobId,
        status: status || "queued",
        estimatedTokens,
        cached: !!cached,
        traceId,
      },
      { status: 202, headers: withTraceHeaders(traceId) },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("[consistency-check] Error initiating consistency check", {
      traceId,
      error,
      message: errorMessage,
    });
    
    // Handle token cap errors specifically
    if (
      error instanceof Error &&
      (error.message.includes("Token cap") || error.message.includes("Rate limit"))
    ) {
      return errorResponse(traceId, 429, error.message);
    }

    // Handle empty content error
    if (error instanceof Error && error.message.includes("empty")) {
      return errorResponse(traceId, 400, error.message);
    }

    // Handle RLS / permission mismatch as explicit client error
    if (
      error instanceof Error &&
      (/row-level security/i.test(error.message) || /permission denied/i.test(error.message))
    ) {
      return errorResponse(
        traceId,
        403,
        "You do not have permission to run consistency checks for this manuscript.",
      );
    }

    return errorResponse(
      traceId,
      500,
      error instanceof Error ? error.message : "Internal server error",
    );
  }
}

/**
 * GET /api/manuscripts/:id/consistency-check
 * Get status of consistency check jobs for a manuscript
 * 
 * Query params:
 *   - jobId?: string - Get specific job, otherwise returns latest
 * 
 * Returns: {
 *   job: ConsistencyCheckJob | null;
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = createTraceId();

  try {
    const { id: manuscriptId } = await params;
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse(traceId, 401, "Unauthorized");
    }

    // Verify manuscript exists and user has access
    const { data: manuscript, error: manuscriptError } = await supabase
      .from("manuscripts")
      .select("id, account_id, owner_user_id")
      .eq("id", manuscriptId)
      .is("deleted_at", null)
      .single();

    if (manuscriptError || !manuscript) {
      return errorResponse(traceId, 404, "Manuscript not found");
    }

    // Get jobId from query params if provided
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    let query = supabase
      .from("consistency_checks")
      .select("*")
      .eq("manuscript_id", manuscriptId)
      .order("created_at", { ascending: false });

    if (jobId) {
      query = query.eq("id", jobId);
    }

    const { data, error } = await query.limit(1).single();

    if (error) {
      if (error.code === "PGRST116") {
        // No job found
        return NextResponse.json({ job: null, traceId }, { headers: withTraceHeaders(traceId) });
      }
      console.error("[consistency-check] Error fetching consistency check", {
        traceId,
        manuscriptId,
        error,
      });
      return errorResponse(traceId, 500, error.message);
    }

    return NextResponse.json({ job: data, traceId }, { headers: withTraceHeaders(traceId) });
  } catch (error) {
    console.error("[consistency-check] Error getting consistency check status", {
      traceId,
      error,
    });
    return errorResponse(
      traceId,
      500,
      error instanceof Error ? error.message : "Internal server error",
    );
  }
}

