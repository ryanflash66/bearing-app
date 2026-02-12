import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { initiateConsistencyCheck } from "@/lib/gemini";

const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 60;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 3;

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
  try {
    const { id: manuscriptId } = await params;
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }



    // Verify manuscript exists and user has access
    const { data: manuscript, error: manuscriptError } = await supabase
      .from("manuscripts")
      .select("id, account_id, owner_user_id")
      .eq("id", manuscriptId)
      .is("deleted_at", null)
      .single();

    if (manuscriptError || !manuscript) {
      return NextResponse.json(
        { error: "Manuscript not found" },
        { status: 404 }
      );
    }

    // Story 4.3/5.1 Fix: Get the public.users profile ID
    // The RLS policy requires created_by to match the Profile ID (get_current_user_id()), not Auth ID
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found. Please log out and back in." },
        { status: 404 }
      );
    }

    const { windowSeconds, maxRequests } = getConsistencyCheckRateLimitConfig();
    const rateLimitWindowStart = new Date(
      Date.now() - windowSeconds * 1000,
    ).toISOString();

    const { count: recentCheckCount, error: rateLimitError } = await supabase
      .from("consistency_checks")
      .select("id", { count: "exact", head: true })
      .eq("manuscript_id", manuscriptId)
      .eq("created_by", profile.id)
      .gte("created_at", rateLimitWindowStart);

    if (rateLimitError) {
      console.error("Consistency check rate-limit query failed:", rateLimitError);
      return NextResponse.json(
        { error: "Unable to verify rate limits" },
        { status: 500 }
      );
    }

    if ((recentCheckCount ?? 0) >= maxRequests) {
      return NextResponse.json(
        {
          error: `Rate limit reached. Please wait ${windowSeconds} seconds before running another consistency check.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(windowSeconds),
          },
        }
      );
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

    return NextResponse.json({
      jobId, 
      status: status || "queued", 
      estimatedTokens, 
      cached: !!cached
    }, { status: 202 });
  } catch (error) {
    console.error("Error initiating consistency check:", error);
    
    // Handle token cap errors specifically
    if (
      error instanceof Error &&
      (error.message.includes("Token cap") || error.message.includes("Rate limit"))
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 429 } // Too Many Requests
      );
    }

    // Handle empty content error
    if (error instanceof Error && error.message.includes("empty")) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 } // Bad Request
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
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
  try {
    const { id: manuscriptId } = await params;
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify manuscript exists and user has access
    const { data: manuscript, error: manuscriptError } = await supabase
      .from("manuscripts")
      .select("id, account_id, owner_user_id")
      .eq("id", manuscriptId)
      .is("deleted_at", null)
      .single();

    if (manuscriptError || !manuscript) {
      return NextResponse.json(
        { error: "Manuscript not found" },
        { status: 404 }
      );
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
        return NextResponse.json({ job: null });
      }
      console.error("Error fetching consistency check:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ job: data });
  } catch (error) {
    console.error("Error getting consistency check status:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

