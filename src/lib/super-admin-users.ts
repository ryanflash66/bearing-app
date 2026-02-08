"use server";

import { SupabaseClient } from "@supabase/supabase-js";
import { isSuperAdmin, SUPER_ADMIN_EMAIL } from "./super-admin";
import type { AssignableRole } from "./super-admin";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "./auditLog";
import { getFirstUserAccount } from "./account";

export interface GlobalUser {
  id: string;
  email: string;
  display_name: string | null;
  role: "user" | "super_admin" | "support_agent" | "admin";
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
  newRole: AssignableRole,
  actorUserId: string
) {
  // Verify super admin
  if (!(await isSuperAdmin(supabase))) {
    return { success: false, error: "Unauthorized" };
  }

  // SECURITY: super_admin is never assignable via this function.
  // The type system enforces AssignableRole, but belt-and-suspenders:
  if ((newRole as string) === "super_admin") {
    return {
      success: false,
      error: "Cannot assign super_admin role. It is a singleton designation.",
    };
  }

  // SECURITY: Prevent self-demotion
  if (targetUserId === actorUserId) {
    return { success: false, error: "You cannot change your own role." };
  }

  // SECURITY: Prevent changing the designated super admin's role.
  // Look up the target user's email to check if they are the designated super admin.
  const { data: targetUser } = await supabase
    .from("users")
    .select("email, role")
    .eq("id", targetUserId)
    .single();

  if (!targetUser) {
    return { success: false, error: "Target user not found." };
  }

  if (
    targetUser.email === SUPER_ADMIN_EMAIL ||
    targetUser.role === "super_admin"
  ) {
    return {
      success: false,
      error:
        "Cannot change the designated super admin's role. This account is permanently locked to super_admin.",
    };
  }

  // Perform update on public profile
  const { error } = await supabase
    .from("users")
    .update({ role: newRole })
    .eq("id", targetUserId);

  if (error) {
    console.error("Global role update error:", error);
    return { success: false, error: error.message };
  }

  // SYNC TO AUTH METADATA (Critical for RLS)
  // We must use a Service Role client to update auth.users
  try {
    const supabaseAdmin = new SupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { user_metadata: { role: newRole } }
    );

    if (authError) {
      console.error("Failed to sync auth metadata:", authError);
      // We don't fail the whole operation, but we log it as a critical warning
    }
  } catch (err) {
    console.error("Error creating admin client:", err);
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
