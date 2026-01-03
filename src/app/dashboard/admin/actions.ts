"use server";

import { createClient } from "@/utils/supabase/server";
import { updateMemberRoleWithGuardrails, removeMemberWithGuardrails } from "@/lib/admin";
import { isAccountAdmin } from "@/lib/account";
import { toggleUserAiStatus, resetAccountLimits, updateMemberNote } from "@/lib/usage-admin";
import { revalidatePath } from "next/cache";

/**
 * Server action to change a member's role
 * Implements AC 1.4.4: Role change updates account_members, user gains access immediately, audit log recorded
 * Implements AC 1.4.5: Blocks demotion of last admin or removal of owner
 */
export async function changeRole(params: {
  accountId: string;
  targetUserId: string;
  newRole: "author" | "admin" | "support";
  actorUserId: string;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();

    // Verify the actor is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Perform the role change with guardrails
    const result = await updateMemberRoleWithGuardrails(supabase, params);

    if (result.success) {
      // Revalidate the members page to show updated data
      revalidatePath("/dashboard/admin/members");
      revalidatePath("/dashboard/admin");
    }

    return result;
  } catch (err) {
    console.error("Role change action error:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Server action to remove a member from an account
 * Implements AC 1.4.5: Blocks removal of owner or last admin
 */
export async function removeMember(params: {
  accountId: string;
  targetUserId: string;
  actorUserId: string;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();

    // Verify the actor is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Perform the removal with guardrails
    const result = await removeMemberWithGuardrails(supabase, params);

    if (result.success) {
      // Revalidate the members page to show updated data
      revalidatePath("/dashboard/admin/members");
      revalidatePath("/dashboard/admin");
    }

    return result;
  } catch (err) {
    console.error("Member removal action error:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}


export async function toggleAiStatus(params: {
  accountId: string;
  targetUserId: string;
  newStatus: "active" | "disabled";
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const isAdmin = await isAccountAdmin(supabase, params.accountId, user.id);
    if (!isAdmin) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await toggleUserAiStatus(
      supabase,
      params.accountId,
      params.targetUserId,
      params.newStatus,
      user.id
    );

    if (result.success) {
      revalidatePath("/dashboard/admin");
    }

    return result;
  } catch (err) {
    console.error("Toggle AI status error:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function toggleMemberStatusAction(params: {
  accountId: string;
  targetUserId: string;
  newStatus: "active" | "suspended";
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const isAdmin = await isAccountAdmin(supabase, params.accountId, user.id);
    if (!isAdmin) {
      return { success: false, error: "Unauthorized" };
    }

    const { toggleMemberStatus } = await import("@/lib/usage-admin");
    const result = await toggleMemberStatus(
      supabase,
      params.accountId,
      params.targetUserId,
      params.newStatus,
      user.id
    );

    if (result.success) {
      revalidatePath("/dashboard/admin");
    }

    return result;
  } catch (err) {
    console.error("Toggle member status error:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function waiveLimits(params: {
  accountId: string;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }
    
    const isAdmin = await isAccountAdmin(supabase, params.accountId, user.id);
    if (!isAdmin) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await resetAccountLimits(supabase, params.accountId, user.id);

    if (result.success) {
      revalidatePath("/dashboard/admin");
    }

    return result;
  } catch (err) {
    console.error("Waive limits error:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function saveNote(params: {
  accountId: string;
  targetUserId: string;
  note: string;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const isAdmin = await isAccountAdmin(supabase, params.accountId, user.id);
    if (!isAdmin) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await updateMemberNote(
      supabase,
      params.accountId,
      params.targetUserId,
      params.note,
      user.id
    );

    if (result.success) {
      revalidatePath("/dashboard/admin");
    }

    return result;
  } catch (err) {
    console.error("Save note error:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}
