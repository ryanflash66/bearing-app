import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase-admin";
import { isSuperAdmin } from "@/lib/super-admin";
import { notifyOrderStatusChange } from "@/lib/email";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/services/request/[id]
 * Generic status update for service requests (Admin only)
 *
 * AC 8.13.4: Email Notification on Status Change
 * - Updates status (e.g. to "in_progress")
 * - Triggers email notification
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
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

  const { status, adminNotes } = json;

  if (!status) {
    return NextResponse.json(
      { error: "Status is required" },
      { status: 400 }
    );
  }

  // Validate status enum
  const validStatuses = ["pending", "paid", "in_progress", "completed", "cancelled", "failed"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json(
      { error: "Invalid status" },
      { status: 400 }
    );
  }

  // Use service role client for admin operations
  const adminClient = getServiceSupabaseClient();

  // Get current request to check for changes and get user info
  const { data: serviceRequest, error: fetchError } = await adminClient
    .from("service_requests")
    .select("*, users!service_requests_user_id_fkey(id, email, display_name, auth_id)")
    .eq("id", id)
    .single();

  if (fetchError || !serviceRequest) {
    return NextResponse.json(
      { error: "Service request not found" },
      { status: 404 }
    );
  }

  // Prepare update data
  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  // Update metadata if admin notes provided
  if (adminNotes) {
    updateData.metadata = {
      ...(serviceRequest.metadata as object || {}),
      admin_notes: adminNotes,
    };
  }

  // Update request
  const { error: updateError } = await adminClient
    .from("service_requests")
    .update(updateData)
    .eq("id", id);

  if (updateError) {
    console.error("Error updating service request:", updateError);
    return NextResponse.json(
      { error: "Failed to update service request" },
      { status: 500 }
    );
  }

  // Send email notification if status changed
  if (serviceRequest.status !== status && serviceRequest.users) {
    const user = serviceRequest.users as { id: string; email: string };
    
    // Create notification record
    await adminClient
      .from("notifications")
      .insert({
        user_id: user.id,
        auth_user_id: (serviceRequest.users as any).auth_id,
        title: "Service request updated",
        message: `Your service request status is now: ${status}`,
        type: "service_update",
        entity_type: "service_request",
        entity_id: id,
      });

    // Send email
    await notifyOrderStatusChange(
      user.email,
      id,
      serviceRequest.service_type,
      status,
      adminNotes
    );
  }

  return NextResponse.json({
    success: true,
    id,
    status,
  });
}
