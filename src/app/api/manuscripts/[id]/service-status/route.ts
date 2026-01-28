import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveServiceRequest } from "@/lib/service-requests";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/manuscripts/[id]/service-status
 *
 * Returns the active service request for a manuscript (if any)
 * AC 8.20.1: Active Request Detection
 *
 * Response:
 * - { activeRequest: ServiceRequest, isLocked: true } when active request exists
 * - { activeRequest: null, isLocked: false } when no active request
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: manuscriptId } = await context.params;
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // 2. Verify user owns the manuscript (or is admin/support)
    const { data: manuscript, error: manuscriptError } = await supabase
      .from("manuscripts")
      .select("id, owner_user_id")
      .eq("id", manuscriptId)
      .single();

    if (manuscriptError || !manuscript) {
      return NextResponse.json(
        { error: "Manuscript not found" },
        { status: 404 }
      );
    }

    // Check ownership (RLS should handle this, but double-check for API security)
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, role")
      .eq("auth_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 403 }
      );
    }

    const isAdmin =
      profile.role === "super_admin" ||
      profile.role === "support_agent" ||
      profile.role === "admin";

    if (!isAdmin && manuscript.owner_user_id !== profile.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // 3. Get active service request
    const { request: activeRequest, error: serviceError } = await getActiveServiceRequest(
      supabase,
      manuscriptId
    );

    if (serviceError) {
      console.error("[service-status] Error:", serviceError);
      return NextResponse.json(
        { error: "Failed to fetch service status" },
        { status: 500 }
      );
    }

    // 4. Return result
    return NextResponse.json({
      activeRequest,
      isLocked: activeRequest !== null,
    });
  } catch (error) {
    console.error("[service-status] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
