import { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/types/supabase";

// Re-export the database type for service_requests
export type ServiceRequest = Tables<"service_requests">;

// Active statuses that lock manuscript editing
export const ACTIVE_STATUSES = ["pending", "paid", "in_progress"] as const;
export type ActiveStatus = (typeof ACTIVE_STATUSES)[number];

// Inactive statuses that allow manuscript editing
export const INACTIVE_STATUSES = ["completed", "cancelled", "failed"] as const;
export type InactiveStatus = (typeof INACTIVE_STATUSES)[number];

// Type guard to check if a status is active
export function isActiveStatus(status: string): status is ActiveStatus {
  return ACTIVE_STATUSES.includes(status as ActiveStatus);
}

/**
 * Result type for service request operations
 */
export interface ServiceRequestResult {
  request: ServiceRequest | null;
  error: string | null;
}

/**
 * Fetch the active service request for a manuscript (if any)
 * Active statuses: pending, paid, in_progress
 *
 * @param supabase - Supabase client
 * @param manuscriptId - The manuscript UUID
 * @returns The active service request or null if none exists
 */
export async function getActiveServiceRequest(
  supabase: SupabaseClient<Database>,
  manuscriptId: string
): Promise<ServiceRequestResult> {
  try {
    const { data, error } = await supabase
      .from("service_requests")
      .select("*")
      .eq("manuscript_id", manuscriptId)
      .in("status", ACTIVE_STATUSES)
      .maybeSingle();

    if (error) {
      console.error("[service-requests] Error fetching active request:", error);
      return { request: null, error: error.message };
    }

    return { request: data, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[service-requests] Exception fetching active request:", err);
    return { request: null, error: message };
  }
}

/**
 * Check if a manuscript has an active service request
 *
 * @param supabase - Supabase client
 * @param manuscriptId - The manuscript UUID
 * @returns Boolean indicating whether an active request exists
 */
export async function hasActiveServiceRequest(
  supabase: SupabaseClient<Database>,
  manuscriptId: string
): Promise<boolean> {
  const { request } = await getActiveServiceRequest(supabase, manuscriptId);
  return request !== null;
}

/**
 * Cancel a pending service request
 * Only works for requests with status = 'pending'
 * RLS policy ensures users can only cancel their own requests
 *
 * @param supabase - Supabase client
 * @param requestId - The service request UUID
 * @returns The cancelled request or an error
 */
export async function cancelServiceRequest(
  supabase: SupabaseClient<Database>,
  requestId: string
): Promise<ServiceRequestResult> {
  try {
    // First, verify the request exists and is pending
    const { data: existing, error: fetchError } = await supabase
      .from("service_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return { request: null, error: "Service request not found" };
      }
      console.error("[service-requests] Error fetching request:", fetchError);
      return { request: null, error: fetchError.message };
    }

    if (!existing) {
      return { request: null, error: "Service request not found" };
    }

    if (existing.status !== "pending") {
      return {
        request: null,
        error: `Cannot cancel request: status is '${existing.status}', only 'pending' requests can be cancelled`
      };
    }

    // Attempt to cancel (RLS will verify ownership)
    const { data: updated, error: updateError } = await supabase
      .from("service_requests")
      .update({ status: "cancelled" })
      .eq("id", requestId)
      .eq("status", "pending") // Double-check status hasn't changed
      .select()
      .single();

    if (updateError) {
      // RLS rejection appears as "no rows returned" or permission error
      if (updateError.code === "PGRST116" || updateError.message.includes("permission")) {
        return { request: null, error: "You do not have permission to cancel this request" };
      }
      console.error("[service-requests] Error cancelling request:", updateError);
      return { request: null, error: updateError.message };
    }

    if (!updated) {
      // No rows updated - either RLS rejected or status changed
      return { request: null, error: "Unable to cancel request. It may have been processed or you don't have permission." };
    }

    return { request: updated, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[service-requests] Exception cancelling request:", err);
    return { request: null, error: message };
  }
}

/**
 * Get all active service requests for a list of manuscript IDs
 * Used for efficient batch lookup (avoids N+1 queries in manuscript list)
 *
 * @param supabase - Supabase client
 * @param manuscriptIds - Array of manuscript UUIDs
 * @returns Map of manuscriptId -> ServiceRequest (only for manuscripts with active requests)
 */
export async function getActiveServiceRequestsForManuscripts(
  supabase: SupabaseClient<Database>,
  manuscriptIds: string[]
): Promise<Map<string, ServiceRequest>> {
  const result = new Map<string, ServiceRequest>();

  if (manuscriptIds.length === 0) {
    return result;
  }

  try {
    const { data, error } = await supabase
      .from("service_requests")
      .select("*")
      .in("manuscript_id", manuscriptIds)
      .in("status", ACTIVE_STATUSES);

    if (error) {
      console.error("[service-requests] Error fetching batch active requests:", error);
      return result;
    }

    if (data) {
      for (const request of data) {
        if (request.manuscript_id) {
          result.set(request.manuscript_id, request);
        }
      }
    }

    return result;
  } catch (err) {
    console.error("[service-requests] Exception fetching batch active requests:", err);
    return result;
  }
}
