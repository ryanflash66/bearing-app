"use server";

import { SupabaseClient } from "@supabase/supabase-js";
import { isSuperAdmin } from "./super-admin";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "./auditLog";
import { getFirstUserAccount } from "./account";

export interface GlobalUser {
  id: string;
  email: string;
  display_name: string | null;
  role: "user" | "super_admin" | "support_agent";
  created_at: string;
  last_sign_in_at?: string;
}

export interface GlobalUserListResult {
  users: GlobalUser[];
  total: number;
  error: string | null;
}

export async function getGlobalUsers(
  supabase: SupabaseClient,
  options?: {
    page?: number;
    pageSize?: number;
    search?: string;
  }
): Promise<GlobalUserListResult> {
  // Verify super admin
  if (!(await isSuperAdmin(supabase))) {
    return { users: [], total: 0, error: "Unauthorized" };
  }

  const page = options?.page || 1;
  const pageSize = options?.pageSize || 20;
  const offset = (page - 1) * pageSize;
  const search = options?.search?.toLowerCase().trim();

  let query = supabase
    .from("users")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
  }

  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Global users fetch error:", error);
    return { users: [], total: 0, error: error.message };
  }

  return {
    users: (data || []) as GlobalUser[],
    total: count || 0,
    error: null,
  };
}

export async function updateGlobalUserRole(
  supabase: SupabaseClient,
  targetUserId: string,
  newRole: "user" | "super_admin" | "support_agent",
  actorUserId: string
) {
  // Verify super admin
  if (!(await isSuperAdmin(supabase))) {
    return { success: false, error: "Unauthorized" };
  }

  // Perform update
  const { error } = await supabase
    .from("users")
    .update({ role: newRole })
    .eq("id", targetUserId);

  if (error) {
    console.error("Global role update error:", error);
    return { success: false, error: error.message };
  }

  // Audit Log - Log to admin's account context
  const { account: adminAccount } = await getFirstUserAccount(supabase, actorUserId);
  if (adminAccount) {
      await createAuditLog(supabase, {
          accountId: adminAccount.id,
          userId: actorUserId,
          action: "admin_action",
          entityType: "user",
          entityId: targetUserId,
          metadata: { 
              description: `Global role change to ${newRole}`,
              target_user_id: targetUserId,
              new_role: newRole 
          }
      });
  }

  revalidatePath("/dashboard/admin/super/users");
  revalidatePath("/dashboard/admin/super");
  return { success: true, error: null };
}
