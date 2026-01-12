"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfileName(formData: FormData) {
  const supabase = await createClient();
  const displayName = formData.get("displayName") as string;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Check Maintenance Mode
  // If maintenance is enabled, Middleware (or RLS) should catch it, 
  // but explicitly checking here ensures the UI receives the correct error for better UX.
  const { data: setting } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "maintenance_mode")
    .single();
    
  if (setting?.value?.enabled) {
      // Check if user is super admin to bypass
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role !== 'super_admin') {
          return { error: setting.value.message || "System is under maintenance." };
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
