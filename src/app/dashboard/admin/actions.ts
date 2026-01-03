"use server";

import { createClient } from "@/utils/supabase/server";
import { updateMemberRoleWithGuardrails, removeMemberWithGuardrails } from "@/lib/admin";
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

