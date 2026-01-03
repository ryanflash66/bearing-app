import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { initiateConsistencyCheck } from "@/lib/gemini";

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

    // Initiate consistency check (async, returns immediately)
    const result = await initiateConsistencyCheck(supabase, {
      manuscriptId,
      userId: user.id,
    });

    return NextResponse.json(result, { status: 202 }); // 202 Accepted for async operations
  } catch (error) {
    console.error("Error initiating consistency check:", error);
    
    // Handle token cap errors specifically
    if (error instanceof Error && error.message.includes("Token cap")) {
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

