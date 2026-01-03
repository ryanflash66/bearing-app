/**
 * Admin management utilities
 * Story 1.4: Basic Admin Panel
 * Provides admin-specific operations with guardrails
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { createAuditLog, logRoleChange, AuditLogEntry, AuditAction } from "./auditLog";

export interface AccountMemberWithDetails {
  user_id: string;
  account_id: string;
  account_role: "author" | "admin" | "support";
  email: string;
  display_name: string | null;
  created_at: string;
  is_owner: boolean;
}

export interface MembersListResult {
  members: AccountMemberWithDetails[];
  total: number;
  error: string | null;
}

export interface RoleChangeResult {
  success: boolean;
  error: string | null;
}

/**
 * Check if the current user is an admin of the specified account
 */
export async function verifyAdminAccess(
  supabase: SupabaseClient,
  accountId: string,
  userId: string
): Promise<{ isAdmin: boolean; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("account_members")
      .select("account_role")
      .eq("account_id", accountId)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { isAdmin: false, error: "Not a member of this account" };
      }
      console.error("Admin verification error:", error);
      return { isAdmin: false, error: "Failed to verify admin status" };
    }

    return { isAdmin: data.account_role === "admin", error: null };
  } catch (err) {
    console.error("Admin verification service error:", err);
    return { isAdmin: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get paginated list of account members with details
 * Only accessible by admins
 */
export async function getAccountMembersPaginated(
  supabase: SupabaseClient,
  accountId: string,
  options?: {
    page?: number;
    pageSize?: number;
    search?: string;
  }
): Promise<MembersListResult> {
  try {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const offset = (page - 1) * pageSize;
    const search = options?.search?.toLowerCase().trim();

    // First get the account owner
    const { data: accountData } = await supabase
      .from("accounts")
      .select("owner_user_id")
      .eq("id", accountId)
      .single();

    const ownerUserId = accountData?.owner_user_id;

    // Build the query
    let query = supabase
      .from("account_members")
      .select(
        `
        user_id,
        account_id,
        account_role,
        created_at,
        users!inner (
          email,
          display_name
        )
      `,
        { count: "exact" }
      )
      .eq("account_id", accountId)
      .order("created_at", { ascending: true });

    // Apply search filter if provided
    if (search) {
      query = query.or(
        `users.email.ilike.%${search}%,users.display_name.ilike.%${search}%`
      );
    }

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Members fetch error:", error);
      return {
        members: [],
        total: 0,
        error: "Failed to load account members. Please try again.",
      };
    }

    // Transform the data
    const members: AccountMemberWithDetails[] = (data || []).map((member) => {
      const user = member.users as unknown as { email: string; display_name: string | null };
      return {
        user_id: member.user_id,
        account_id: member.account_id,
        account_role: member.account_role as "author" | "admin" | "support",
        email: user.email,
        display_name: user.display_name,
        created_at: member.created_at,
        is_owner: member.user_id === ownerUserId,
      };
    });

    return {
      members,
      total: count || 0,
      error: null,
    };
  } catch (err) {
    console.error("Members service error:", err);
    return {
      members: [],
      total: 0,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Count the number of admins in an account
 */
async function countAdmins(
  supabase: SupabaseClient,
  accountId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("account_members")
    .select("*", { count: "exact", head: true })
    .eq("account_id", accountId)
    .eq("account_role", "admin");

  if (error) {
    console.error("Admin count error:", error);
    return 0;
  }

  return count || 0;
}

/**
 * Check if user is the account owner
 */
async function isAccountOwner(
  supabase: SupabaseClient,
  accountId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("accounts")
    .select("owner_user_id")
    .eq("id", accountId)
    .single();

  if (error) {
    console.error("Owner check error:", error);
    return false;
  }

  return data?.owner_user_id === userId;
}

/**
 * Update a member's role with guardrails
 * Guardrails:
 * - Cannot demote the last admin
 * - Cannot change the owner's role
 */
export async function updateMemberRoleWithGuardrails(
  supabase: SupabaseClient,
  params: {
    accountId: string;
    targetUserId: string;
    newRole: "author" | "admin" | "support";
    actorUserId: string;
  }
): Promise<RoleChangeResult> {
  const { accountId, targetUserId, newRole, actorUserId } = params;

  try {
    // Get current role
    const { data: currentMember, error: fetchError } = await supabase
      .from("account_members")
      .select("account_role")
      .eq("account_id", accountId)
      .eq("user_id", targetUserId)
      .single();

    if (fetchError || !currentMember) {
      return { success: false, error: "Member not found in this account" };
    }

    const currentRole = currentMember.account_role;

    // Check if no change needed
    if (currentRole === newRole) {
      return { success: true, error: null };
    }

    // Guardrail 1: Cannot change the owner's role
    const isOwner = await isAccountOwner(supabase, accountId, targetUserId);
    if (isOwner) {
      return {
        success: false,
        error: "Cannot change the account owner's role. Transfer ownership first.",
      };
    }

    // Guardrail 2: Cannot demote the last admin
    if (currentRole === "admin" && newRole !== "admin") {
      const adminCount = await countAdmins(supabase, accountId);
      if (adminCount <= 1) {
        return {
          success: false,
          error: "Cannot demote the last admin. Promote another member to admin first.",
        };
      }
    }

    // Perform the update
    const { error: updateError } = await supabase
      .from("account_members")
      .update({ account_role: newRole })
      .eq("account_id", accountId)
      .eq("user_id", targetUserId);

    if (updateError) {
      console.error("Role update error:", updateError);
      return {
        success: false,
        error: "Failed to update member role. Please try again.",
      };
    }

    // Log the role change
    await logRoleChange(supabase, {
      accountId,
      actorUserId,
      targetUserId,
      oldRole: currentRole,
      newRole,
    });

    return { success: true, error: null };
  } catch (err) {
    console.error("Role update service error:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Remove a member from account with guardrails
 * Guardrails:
 * - Cannot remove the account owner
 * - Cannot remove the last admin
 */
export async function removeMemberWithGuardrails(
  supabase: SupabaseClient,
  params: {
    accountId: string;
    targetUserId: string;
    actorUserId: string;
  }
): Promise<RoleChangeResult> {
  const { accountId, targetUserId, actorUserId } = params;

  try {
    // Get target member info
    const { data: memberData, error: fetchError } = await supabase
      .from("account_members")
      .select(
        `
        account_role,
        users (
          email
        )
      `
      )
      .eq("account_id", accountId)
      .eq("user_id", targetUserId)
      .single();

    if (fetchError || !memberData) {
      return { success: false, error: "Member not found in this account" };
    }

    // Guardrail 1: Cannot remove the account owner
    const isOwner = await isAccountOwner(supabase, accountId, targetUserId);
    if (isOwner) {
      return {
        success: false,
        error: "Cannot remove the account owner. Transfer ownership first.",
      };
    }

    // Guardrail 2: Cannot remove the last admin
    if (memberData.account_role === "admin") {
      const adminCount = await countAdmins(supabase, accountId);
      if (adminCount <= 1) {
        return {
          success: false,
          error: "Cannot remove the last admin. Promote another member to admin first.",
        };
      }
    }

    // Perform the removal
    const { error: deleteError } = await supabase
      .from("account_members")
      .delete()
      .eq("account_id", accountId)
      .eq("user_id", targetUserId);

    if (deleteError) {
      console.error("Member removal error:", deleteError);
      return {
        success: false,
        error: "Failed to remove member. Please try again.",
      };
    }

    // Log the removal
    const userEmail = (memberData.users as unknown as { email: string })?.email || "unknown";
    await createAuditLog(supabase, {
      accountId,
      userId: actorUserId,
      action: "user_removed",
      entityType: "user",
      entityId: targetUserId,
      metadata: {
        removed_email: userEmail,
        removed_role: memberData.account_role,
      },
    });

    return { success: true, error: null };
  } catch (err) {
    console.error("Member removal service error:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Get audit logs with enhanced filtering for admin panel
 */
export async function getAdminAuditLogs(
  supabase: SupabaseClient,
  accountId: string,
  options?: {
    page?: number;
    pageSize?: number;
    action?: AuditAction;
    startDate?: string;
    endDate?: string;
  }
): Promise<{
  logs: (AuditLogEntry & { user_email?: string })[];
  total: number;
  error: string | null;
}> {
  try {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from("audit_logs")
      .select(
        `
        *,
        users (
          email
        )
      `,
        { count: "exact" }
      )
      .eq("account_id", accountId)
      .order("created_at", { ascending: false });

    if (options?.action) {
      query = query.eq("action", options.action);
    }

    if (options?.startDate) {
      query = query.gte("created_at", options.startDate);
    }

    if (options?.endDate) {
      query = query.lte("created_at", options.endDate);
    }

    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Audit logs fetch error:", error);
      return {
        logs: [],
        total: 0,
        error: "Failed to load audit logs. Please try again.",
      };
    }

    const logs = (data || []).map((log) => ({
      ...log,
      user_email: (log.users as { email: string } | null)?.email,
    }));

    return {
      logs,
      total: count || 0,
      error: null,
    };
  } catch (err) {
    console.error("Audit logs service error:", err);
    return {
      logs: [],
      total: 0,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Get admin dashboard stats
 */
export async function getAdminStats(
  supabase: SupabaseClient,
  accountId: string
): Promise<{
  totalMembers: number;
  adminCount: number;
  authorCount: number;
  supportCount: number;
  recentAuditCount: number;
  error: string | null;
}> {
  try {
    // Get member counts by role
    const { data: members, error: membersError } = await supabase
      .from("account_members")
      .select("account_role")
      .eq("account_id", accountId);

    if (membersError) {
      return {
        totalMembers: 0,
        adminCount: 0,
        authorCount: 0,
        supportCount: 0,
        recentAuditCount: 0,
        error: "Failed to load member stats",
      };
    }

    const totalMembers = members.length;
    const adminCount = members.filter((m) => m.account_role === "admin").length;
    const authorCount = members.filter((m) => m.account_role === "author").length;
    const supportCount = members.filter((m) => m.account_role === "support").length;

    // Get recent audit logs count (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: recentAuditCount, error: auditError } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("account_id", accountId)
      .gte("created_at", sevenDaysAgo.toISOString());

    if (auditError) {
      console.error("Audit count error:", auditError);
    }

    return {
      totalMembers,
      adminCount,
      authorCount,
      supportCount,
      recentAuditCount: recentAuditCount || 0,
      error: null,
    };
  } catch (err) {
    console.error("Admin stats service error:", err);
    return {
      totalMembers: 0,
      adminCount: 0,
      authorCount: 0,
      supportCount: 0,
      recentAuditCount: 0,
      error: "An unexpected error occurred",
    };
  }
}

