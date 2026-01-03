/**
 * Database audit logging utility
 * Story 1.3: Account & Role Management
 * Logs events to the audit_logs table for security and compliance
 */

import { SupabaseClient } from "@supabase/supabase-js";

export type AuditAction =
  | "account_created"
  | "account_updated"
  | "account_deleted"
  | "user_invited"
  | "user_removed"
  | "role_changed"
  | "profile_updated"
  | "mfa_enabled"
  | "mfa_disabled"
  | "login_success"
  | "login_failure"
  | "password_reset"
  | "admin_action"
  | "data_export"
  | "data_access";

export interface AuditLogEntry {
  id: string;
  account_id: string;
  user_id: string | null;
  action: AuditAction;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CreateAuditLogParams {
  accountId: string;
  userId: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create an audit log entry
 * This should be called for all significant actions in the application
 */
export async function createAuditLog(
  supabase: SupabaseClient,
  params: CreateAuditLogParams
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from("audit_logs").insert({
      account_id: params.accountId,
      user_id: params.userId,
      action: params.action,
      entity_type: params.entityType || null,
      entity_id: params.entityId || null,
      metadata: params.metadata || {},
    });

    if (error) {
      console.error("Audit log creation error:", error);
      // Don't throw - audit log failures shouldn't break the main operation
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error("Audit log service error:", err);
    return { success: false, error: "Failed to create audit log entry" };
  }
}

/**
 * Get audit logs for an account
 * Only admins and support can view all logs
 * Authors can only view their own logs
 */
export async function getAuditLogs(
  supabase: SupabaseClient,
  accountId: string,
  options?: {
    limit?: number;
    offset?: number;
    action?: AuditAction;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<{ logs: AuditLogEntry[]; error: string | null; total: number }> {
  try {
    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .eq("account_id", accountId)
      .order("created_at", { ascending: false });

    if (options?.action) {
      query = query.eq("action", options.action);
    }

    if (options?.userId) {
      query = query.eq("user_id", options.userId);
    }

    if (options?.startDate) {
      query = query.gte("created_at", options.startDate);
    }

    if (options?.endDate) {
      query = query.lte("created_at", options.endDate);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 50) - 1
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Audit log fetch error:", error);
      return {
        logs: [],
        error: "Failed to load audit logs. Please try again.",
        total: 0,
      };
    }

    return {
      logs: (data || []) as AuditLogEntry[],
      error: null,
      total: count || 0,
    };
  } catch (err) {
    console.error("Audit log service error:", err);
    return {
      logs: [],
      error: "An unexpected error occurred. Please try again.",
      total: 0,
    };
  }
}

/**
 * Helper to log role change events
 */
export async function logRoleChange(
  supabase: SupabaseClient,
  params: {
    accountId: string;
    actorUserId: string;
    targetUserId: string;
    oldRole: string;
    newRole: string;
  }
): Promise<void> {
  await createAuditLog(supabase, {
    accountId: params.accountId,
    userId: params.actorUserId,
    action: "role_changed",
    entityType: "user",
    entityId: params.targetUserId,
    metadata: {
      old_role: params.oldRole,
      new_role: params.newRole,
      target_user_id: params.targetUserId,
    },
  });
}

/**
 * Helper to log user invitation events
 */
export async function logUserInvited(
  supabase: SupabaseClient,
  params: {
    accountId: string;
    actorUserId: string;
    invitedUserId: string;
    invitedEmail: string;
    role: string;
  }
): Promise<void> {
  await createAuditLog(supabase, {
    accountId: params.accountId,
    userId: params.actorUserId,
    action: "user_invited",
    entityType: "user",
    entityId: params.invitedUserId,
    metadata: {
      invited_email: params.invitedEmail,
      role: params.role,
    },
  });
}

/**
 * Helper to log user removal events
 */
export async function logUserRemoved(
  supabase: SupabaseClient,
  params: {
    accountId: string;
    actorUserId: string;
    removedUserId: string;
    removedEmail: string;
  }
): Promise<void> {
  await createAuditLog(supabase, {
    accountId: params.accountId,
    userId: params.actorUserId,
    action: "user_removed",
    entityType: "user",
    entityId: params.removedUserId,
    metadata: {
      removed_email: params.removedEmail,
    },
  });
}

/**
 * Helper to log admin actions
 */
export async function logAdminAction(
  supabase: SupabaseClient,
  params: {
    accountId: string;
    userId: string;
    description: string;
    entityType?: string;
    entityId?: string;
    additionalMetadata?: Record<string, unknown>;
  }
): Promise<void> {
  await createAuditLog(supabase, {
    accountId: params.accountId,
    userId: params.userId,
    action: "admin_action",
    entityType: params.entityType,
    entityId: params.entityId,
    metadata: {
      description: params.description,
      ...params.additionalMetadata,
    },
  });
}

