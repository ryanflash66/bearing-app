import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase-admin";
import { isSuperAdmin } from "@/lib/super-admin";
import { stripe } from "@/lib/stripe";
import { notifyServiceCancelled } from "@/lib/email";

/**
 * POST /api/admin/reject-request
 * Rejects a service request and optionally initiates a refund
 *
 * AC 5.4.3: Admin can reject requests with refund flow
 * - Request marked as "cancelled"
 * - Stripe refund initiated if requested
 * - Author notified
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

  const { requestId, reason, initiateRefund } = json;

  if (!requestId) {
    return NextResponse.json(
      { error: "Request ID is required" },
      { status: 400 }
    );
  }

  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return NextResponse.json(
      { error: "Rejection reason is required" },
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

  if (serviceRequest.status === "cancelled") {
    return NextResponse.json(
      { error: "Request is already cancelled" },
      { status: 400 }
    );
  }

  if (serviceRequest.status === "completed") {
    return NextResponse.json(
      { error: "Cannot reject a completed request" },
      { status: 400 }
    );
  }

  let refundId: string | null = null;

  // Initiate Stripe refund if requested and payment exists
  if (initiateRefund && serviceRequest.stripe_payment_intent_id) {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: serviceRequest.stripe_payment_intent_id,
        reason: "requested_by_customer",
        metadata: {
          service_request_id: requestId,
          rejection_reason: reason,
        },
      });
      refundId = refund.id;
    } catch (stripeError) {
      console.error("Stripe refund error:", stripeError);
      return NextResponse.json(
        {
          error: "Failed to process refund",
          details: stripeError instanceof Error ? stripeError.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  }

  // Update service request to cancelled
  const { error: updateError } = await adminClient
    .from("service_requests")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
      metadata: {
        ...(serviceRequest.metadata as object || {}),
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        refund_id: refundId,
        refund_initiated: !!refundId,
      },
    })
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
    const notificationMessage = refundId
      ? `Your service request has been cancelled. A refund has been initiated.`
      : `Your service request has been cancelled. Reason: ${reason}`;

    const { error: notifError } = await adminClient
      .from("notifications")
      .insert({
        user_id: user.id,
        auth_user_id: user.auth_id,
        title: "Service request cancelled",
        message: notificationMessage,
        type: "service_cancelled",
        entity_type: "service_request",
        entity_id: requestId,
      });

    if (notifError) {
      // Log but don't fail the request
      console.error("Error creating notification:", notifError);
    }
  }

  // Send email notification to user (AC 5.4.3)
  if (user) {
    await notifyServiceCancelled(
      user.email,
      serviceRequest.service_type,
      reason,
      !!refundId
    );
  }

  return NextResponse.json({
    success: true,
    requestId,
    status: "cancelled",
    refundId,
    refundInitiated: !!refundId,
  });
}
