"use server";

import { createClient } from "@/utils/supabase/server";
import { updateGlobalUserRole } from "@/lib/super-admin-users";
import type { AssignableRole } from "@/lib/super-admin";

export async function updateUserRoleAction(targetId: string, newRole: AssignableRole) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    return await updateGlobalUserRole(supabase, targetId, newRole, user.id);
}
