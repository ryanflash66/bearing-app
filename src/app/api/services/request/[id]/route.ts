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
  type PatchBody = { status?: string; adminNotes?: string };
  let json: PatchBody;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 },
    );
  }

  const { status, adminNotes } = json;

  if (!status) {
    return NextResponse.json({ error: "Status is required" }, { status: 400 });
  }

  // Validate status enum
  const validStatuses = [
    "pending",
    "paid",
    "in_progress",
    "completed",
    "cancelled",
    "failed",
  ];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Use service role client for admin operations
  const adminClient = getServiceSupabaseClient();

  // Get current request to check for changes and get user info
  const { data: serviceRequest, error: fetchError } = await adminClient
    .from("service_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !serviceRequest) {
    return NextResponse.json(
      { error: "Service request not found" },
      { status: 404 },
    );
  }

  // Prepare update data
  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  // Update metadata if admin notes provided
  if (adminNotes !== undefined) {
    const existingMetadata =
      serviceRequest.metadata && typeof serviceRequest.metadata === "object"
        ? (serviceRequest.metadata as Record<string, unknown>)
        : {};
    updateData.metadata = {
      ...existingMetadata,
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
      { status: 500 },
    );
  }

  // Send email notification if status changed
  if (serviceRequest.status !== status) {
    let userProfile: { id: string; email: string; auth_id: string } | null =
      null;

    const { data: profileData, error: profileError } = await adminClient
      .from("users")
      .select("id, email, display_name, auth_id")
      .eq("auth_id", serviceRequest.user_id)
      .single();

    if (!profileError && profileData) {
      userProfile = profileData as {
        id: string;
        email: string;
        auth_id: string;
      };
    } else if (profileError && profileError.code !== "PGRST116") {
      console.error(
        "Error fetching user profile for service request:",
        profileError,
      );
    }

    const adminAuth = adminClient.auth?.admin;
    let userEmail = userProfile?.email || null;

    if (!userEmail && adminAuth) {
      const { data: authData, error: authError } = await adminAuth.getUserById(
        serviceRequest.user_id,
      );

      if (authError) {
        console.error(
          "Error fetching auth user for service request:",
          authError,
        );
      } else {
        userEmail = authData?.user?.email || null;
      }
    }

    if (userProfile) {
      await adminClient.from("notifications").insert({
        user_id: userProfile.id,
        auth_user_id: userProfile.auth_id,
        title: "Service request updated",
        message: `Your service request status is now: ${status}`,
        type: "service_update",
        entity_type: "service_request",
        entity_id: id,
      });
    } else {
      console.warn("Skipping notification insert; user profile not found", {
        requestId: id,
      });
    }

    if (userEmail) {
      await notifyOrderStatusChange(
        userEmail,
        id,
        serviceRequest.service_type,
        status,
        adminNotes,
      );
    } else {
      console.warn("Skipping email; user email not found", { requestId: id });
    }
  }

  return NextResponse.json({
    success: true,
    id,
    status,
  });
}
