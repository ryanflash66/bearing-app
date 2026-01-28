import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cancelServiceRequest } from "@/lib/service-requests";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/service-requests/[id]/cancel
 *
 * Cancels a pending service request
 * AC 8.20.4: Cancel Request Flow
 *
 * Response:
 * - { success: true, request: ServiceRequest } on success
 * - { error: string, code: string } on failure
 *
 * Error codes:
 * - INVALID_STATUS: Request is not in 'pending' status
 * - FORBIDDEN: User doesn't own the request
 * - NOT_FOUND: Request doesn't exist
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: requestId } = await context.params;
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // 2. Verify user owns the request
    const { data: existingRequest, error: fetchError } = await supabase
      .from("service_requests")
      .select("id, user_id, status")
      .eq("id", requestId)
      .single();

    if (fetchError || !existingRequest) {
      return NextResponse.json(
        { error: "Service request not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Check ownership
    if (existingRequest.user_id !== user.id) {
      return NextResponse.json(
        { error: "You do not have permission to cancel this request", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    // Check status before attempting cancel
    if (existingRequest.status !== "pending") {
      return NextResponse.json(
        {
          error: `Cannot cancel request: only 'pending' requests can be cancelled. Current status: '${existingRequest.status}'`,
          code: "INVALID_STATUS"
        },
        { status: 400 }
      );
    }

    // 3. Cancel the request
    const { request: cancelledRequest, error: cancelError } = await cancelServiceRequest(
      supabase,
      requestId
    );

    if (cancelError || !cancelledRequest) {
      // Determine appropriate error code
      const errorLower = (cancelError || "").toLowerCase();

      if (errorLower.includes("permission") || errorLower.includes("forbidden")) {
        return NextResponse.json(
          { error: cancelError || "Forbidden", code: "FORBIDDEN" },
          { status: 403 }
        );
      }

      if (errorLower.includes("status") || errorLower.includes("pending")) {
        return NextResponse.json(
          { error: cancelError || "Invalid status", code: "INVALID_STATUS" },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: cancelError || "Failed to cancel request", code: "INTERNAL_ERROR" },
        { status: 500 }
      );
    }

    // 4. Return success
    return NextResponse.json({
      success: true,
      request: cancelledRequest,
    });
  } catch (error) {
    console.error("[cancel-request] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
