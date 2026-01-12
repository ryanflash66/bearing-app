

import { SupabaseClient } from "@supabase/supabase-js";

export interface GlobalMetrics {
  totalTokenBurn: number;
  activeUserCount: number;
  openTicketCount: number;
  totalUsers: number;
  aiErrorRate: number; // AC 4.4.1: AI Error Rate (%)
  revenueEstimate: number | null; // AC 4.5.1: Revenue Estimate (if available)
}

/**
 * Check if the current user has super_admin role
 * Super admin is determined by the `role` column in the `users` table
 */
export async function isSuperAdmin(supabase: SupabaseClient): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("auth_id", user.id)
    .single();

  return profile?.role === "super_admin";
}

/**
 * Get global system metrics for super admin dashboard
 * AC 4.5.1: Display Total Token Burn, Active Users, Open Ticket Count
 */
export async function getGlobalMetrics(
  supabase: SupabaseClient
): Promise<{ metrics: GlobalMetrics; error: string | null }> {
  try {
    // 1. Total Token Burn (current billing cycle - last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: tokenData } = await supabase
      .from("ai_usage_events")
      .select("tokens_used")
      .gte("created_at", thirtyDaysAgo.toISOString());

    const totalTokenBurn = tokenData?.reduce(
      (sum, event) => sum + (event.tokens_used || 0),
      0
    ) || 0;

    // 2. Active Users (distinct users with AI activity in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: activeData } = await supabase
      .from("ai_usage_events")
      .select("user_id")
      .gte("created_at", sevenDaysAgo.toISOString());

    const uniqueActiveUsers = new Set(activeData?.map((e) => e.user_id));
    const activeUserCount = uniqueActiveUsers.size;

    // 3. Open Ticket Count
    const { count: openTicketCount } = await supabase
      .from("support_tickets")
      .select("*", { count: "exact", head: true })
      .neq("status", "resolved");

    // 4. Total Users (for context)
    const { count: totalUsers } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    // 5. AI Error Rate (failures / total requests in last 30 days)
    // NOTE: Current schema doesn't have an explicit 'error' column in ai_usage_events.
    // In Story 4.5+ we might add this. For now, we'll return 0 as a placeholder 
    // to maintain the UI contract without breaking queries.
    const aiErrorRate = 0;

    return {
      metrics: {
        totalTokenBurn,
        activeUserCount,
        openTicketCount: openTicketCount || 0,
        totalUsers: totalUsers || 0,
        aiErrorRate,
        revenueEstimate: null, // AC 4.5.1: Not available in current schema
      },
      error: null,
    };
  } catch (err: any) {
    console.error("getGlobalMetrics error:", err);
    return {
      metrics: {
        totalTokenBurn: 0,
        activeUserCount: 0,
        openTicketCount: 0,
        totalUsers: 0,
        aiErrorRate: 0,
        revenueEstimate: null,
      },
      error: err.message,
    };
  }
}





/**
 * Get system maintenance mode status
 * AC 4.5.3
 */
export async function getMaintenanceStatus(supabase: SupabaseClient) {
  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "maintenance_mode")
      .single();

    if (error) throw error;

    return {
      enabled: data?.value?.enabled || false,
      message: data?.value?.message || "System is under maintenance.",
    };
  } catch (err) {
    console.error("getMaintenanceStatus error:", err);
    // Default to false on error to prevent accidental lockout
    return { enabled: false, message: "" };
  }
}

/**
 * Toggle maintenance mode
 * AC 4.5.3
 */
export async function toggleMaintenanceMode(
  supabase: SupabaseClient,
  enabled: boolean,
  message?: string
) {
  // Double check super admin
  const isSuper = await isSuperAdmin(supabase);
  if (!isSuper) {
    throw new Error("Unauthorized");
  }

  const { error } = await supabase.from("system_settings").upsert({
    key: "maintenance_mode",
    value: {
      enabled,
      message: message || "System is under maintenance. Please try again later.",
    },
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
  return true;
}
