
import { SupabaseClient } from "@supabase/supabase-js";
import { createAuditLog } from "./auditLog";

export interface UserUsageStat {
  user_id: string;
  total_tokens: number;
  total_checks: number;
  last_activity: string | null;
  // Joined fields
  email: string;
  display_name: string | null;
  account_role: string;
  ai_status: string; // 'active' | 'disabled'
  member_status: string; // 'active' | 'suspended'
  internal_note: string | null;
}

export interface UsageStatsResult {
  stats: UserUsageStat[];
  error: string | null;
}

/**
 * Get aggregated usage statistics for all members in an account
 * Uses the user_current_usage view for performance
 */
export async function getAccountUsageStats(
  supabase: SupabaseClient,
  accountId: string
): Promise<UsageStatsResult> {
  try {
    // 1. Get all members with their roles and status
    const { data: members, error: membersError } = await supabase
      .from("account_members")
      .select(`
        user_id, account_role, ai_status, member_status, internal_note,
        users (email, display_name)
      `)
      .eq("account_id", accountId);

    if (membersError) throw membersError;

    // 2. Get usage from view
    const { data: usageDocuments, error: usageError } = await supabase
      .from("user_current_usage")
      .select("user_id, total_tokens, total_checks, last_activity")
      .eq("account_id", accountId);

    if (usageError) {
       // If view access fails, we might just return stats with 0 usage
       console.error("View query error", usageError);
    }

    const usageMap = new Map(usageDocuments?.map(u => [u.user_id, u]));

    // 3. Merge
    const stats: UserUsageStat[] = members.map((m: any) => {
      // Supabase returns users as an object or array depending on query. Here it's users!inner or similar join.
      // But simple join returns single object usually.
      const user = m.users as { email: string; display_name: string | null } | null;
      const u = usageMap.get(m.user_id);
      
      return {
        user_id: m.user_id,
        email: user?.email || "Unknown",
        display_name: user?.display_name || null,
        account_role: m.account_role,

        ai_status: m.ai_status || "active", // Default to active if null
        member_status: m.member_status || "active",
        internal_note: m.internal_note || null,
        total_tokens: u?.total_tokens || 0,
        total_checks: u?.total_checks || 0,
        last_activity: u?.last_activity || null,
      };
    });

    return { stats, error: null };
  } catch (err) {
    console.error("Usage stats error:", err);
    return { stats: [], error: "Failed to load usage stats" };
  }
}

// Override Actions

export async function toggleUserAiStatus(
  supabase: SupabaseClient,
  accountId: string,
  targetUserId: string,
  newStatus: "active" | "disabled",
  adminId: string
) {
  try {
    const { error } = await supabase
      .from("account_members")
      .update({ ai_status: newStatus })
      .eq("account_id", accountId)
      .eq("user_id", targetUserId);

    if (error) throw error;

    await createAuditLog(supabase, {
      accountId,
      userId: adminId,
      action: "admin_action", 
      entityType: "user",
      entityId: targetUserId,
      metadata: { 
        description: `Changed AI status to ${newStatus}`,
        ai_status: newStatus 
      }
    });

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function toggleMemberStatus(
  supabase: SupabaseClient,
  accountId: string,
  targetUserId: string,
  newStatus: "active" | "suspended",
  adminId: string
) {
  try {
    const { error } = await supabase
      .from("account_members")
      .update({ member_status: newStatus })
      .eq("account_id", accountId)
      .eq("user_id", targetUserId);

    if (error) throw error;

    await createAuditLog(supabase, {
      accountId,
      userId: adminId,
      action: "admin_action", 
      entityType: "user",
      entityId: targetUserId,
      metadata: { 
        description: `Changed member status to ${newStatus}`,
        member_status: newStatus 
      }
    });

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateMemberNote(
  supabase: SupabaseClient,
  accountId: string,
  targetUserId: string,
  note: string,
  adminId: string
) {
  try {
    const { error } = await supabase
      .from("account_members")
      .update({ internal_note: note })
      .eq("account_id", accountId)
      .eq("user_id", targetUserId);

    if (error) throw error;

    await createAuditLog(supabase, {
      accountId,
      userId: adminId,
      action: "admin_action",
      entityType: "user",
      entityId: targetUserId,
      metadata: { 
        description: "Updated internal note",
        note_snippet: note.substring(0, 50) 
      }
    });

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function resetAccountLimits(
  supabase: SupabaseClient,
  accountId: string,
  adminId: string
) {
   try {
    const { error } = await supabase
      .from("accounts")
      .update({ 
        usage_status: 'good_standing',
        consecutive_overage_months: 0 
      })
      .eq("id", accountId);

    if (error) throw error;

    await createAuditLog(supabase, {
      accountId,
      userId: adminId,
      action: "account_updated",
      entityType: "account",
      entityId: accountId,
      metadata: { 
        description: "Waived usage limits",
        action: "waive_limits" 
      }
    });

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
