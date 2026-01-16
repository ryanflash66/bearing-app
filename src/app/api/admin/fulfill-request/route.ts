import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase-admin";
import { isSuperAdmin } from "@/lib/super-admin";
import { notifyServiceFulfilled } from "@/lib/email";

/**
 * POST /api/admin/fulfill-request
 * Fulfills a service request (ISBN assignment or other service completion)
 *
 * AC 5.4.2: Admin can fulfill requests and assign ISBNs
 * - Manual ISBN entry
 * - Auto-assign from pool
 * - Author receives notification
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  // Verify super admin access
  const isSuper = await isSuperAdmin(supabase);
  if (!isSuper) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Parse request body
  let json;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  const { requestId, isbn, autoAssign, serviceType } = json;

  if (!requestId) {
    return NextResponse.json(
      { error: "Request ID is required" },
      { status: 400 }
    );
  }

  // Use service role client for admin operations (bypasses RLS)
  const adminClient = getServiceSupabaseClient();

  // Get the service request
  const { data: serviceRequest, error: fetchError } = await adminClient
    .from("service_requests")
    .select("*, users!service_requests_user_id_fkey(id, email, display_name, auth_id)")
    .eq("id", requestId)
    .single();

  if (fetchError || !serviceRequest) {
    return NextResponse.json(
      { error: "Service request not found" },
      { status: 404 }
    );
  }

  if (serviceRequest.status !== "pending") {
    return NextResponse.json(
      { error: `Request is already ${serviceRequest.status}` },
      { status: 400 }
    );
  }

  let assignedIsbn = isbn;

  // For ISBN requests, handle ISBN assignment
  if (serviceRequest.service_type === "isbn") {
    if (autoAssign) {
      // Auto-assign from pool using atomic RPC to prevent race conditions
      const { data: claimedIsbn, error: claimError } = await adminClient
        .rpc("claim_isbn_from_pool", { p_request_id: requestId })
        .maybeSingle();

      if (claimError) {
        console.error("Error claiming ISBN from pool:", claimError);
        return NextResponse.json(
          { error: "Failed to claim ISBN from pool" },
          { status: 500 }
        );
      }

      if (!claimedIsbn) {
        return NextResponse.json(
          { error: "No ISBNs available in pool" },
          { status: 400 }
        );
      }

      // RPC returns { id: uuid, isbn: text }
      assignedIsbn = (claimedIsbn as { id: string; isbn: string }).isbn;
    } else if (!isbn) {
      return NextResponse.json(
        { error: "ISBN is required for manual assignment" },
        { status: 400 }
      );
    }
  }

  // Update service request to completed
  const updateData: Record<string, unknown> = {
    status: "completed",
    updated_at: new Date().toISOString(),
  };

  // Add ISBN to metadata if this is an ISBN request
  if (serviceRequest.service_type === "isbn" && assignedIsbn) {
    updateData.metadata = {
      ...(serviceRequest.metadata as object || {}),
      isbn: assignedIsbn,
      fulfilled_at: new Date().toISOString(),
    };
  } else {
    // For non-ISBN services, just mark as fulfilled
    updateData.metadata = {
      ...(serviceRequest.metadata as object || {}),
      fulfilled_at: new Date().toISOString(),
    };
  }

  const { error: updateError } = await adminClient
    .from("service_requests")
    .update(updateData)
    .eq("id", requestId);

  if (updateError) {
    console.error("Error updating service request:", updateError);
    return NextResponse.json(
      { error: "Failed to update service request" },
      { status: 500 }
    );
  }

  // Create notification for the user
  const user = serviceRequest.users as { id: string; email: string; display_name?: string; auth_id: string } | null;
  if (user) {
    const notificationTitle = serviceRequest.service_type === "isbn"
      ? "Your ISBN is ready!"
      : "Service request completed";

    const notificationMessage = serviceRequest.service_type === "isbn"
      ? `Your ISBN (${assignedIsbn}) has been assigned. View it in your orders.`
      : `Your ${serviceRequest.service_type} request has been completed.`;

    const { error: notifError } = await adminClient
      .from("notifications")
      .insert({
        user_id: user.id,
        auth_user_id: user.auth_id,
        title: notificationTitle,
        message: notificationMessage,
        type: "service_fulfilled",
        entity_type: "service_request",
        entity_id: requestId,
      });

    if (notifError) {
      // Log but don't fail the request
      console.error("Error creating notification:", notifError);
    }
  }

  // Send email notification to user (AC 5.4.2)
  if (user) {
    await notifyServiceFulfilled(
      user.email,
      serviceRequest.service_type,
      assignedIsbn || undefined
    );
  }

  return NextResponse.json({
    success: true,
    requestId,
    isbn: assignedIsbn,
    status: "completed",
  });
}
