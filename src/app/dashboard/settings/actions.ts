"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { isSuperAdmin, getMaintenanceStatus } from "@/lib/super-admin";

export async function updateProfileName(formData: FormData) {
  const supabase = await createClient();
  const rawDisplayName = formData.get("displayName") as string;

  // Validate and sanitize input
  const displayName = rawDisplayName?.trim() || "";

  if (displayName.length === 0) {
    return { error: "Display name cannot be empty." };
  }

  if (displayName.length > 100) {
    return { error: "Display name must be 100 characters or less." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Check Maintenance Mode
  // If maintenance is enabled, Middleware (or RLS) should catch it, 
  // but explicitly checking here ensures the UI receives the correct error for better UX.
  const status = await getMaintenanceStatus(supabase);
    
  if (status.enabled) {
    // Check if user is super admin to bypass
    const isSuper = await isSuperAdmin(supabase);
    if (!isSuper) {
      return { error: status.message || "System is under maintenance." };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return { error: "Failed to update profile." };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard"); // To update default layout header
  return { success: true };
}
