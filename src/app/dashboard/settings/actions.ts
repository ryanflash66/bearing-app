"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

const MAX_DISPLAY_NAME_LENGTH = 100;

export async function updateProfileName(formData: FormData) {
  const supabase = await createClient();
  const rawDisplayName = formData.get("displayName");

  // --- Input Validation ---
  if (typeof rawDisplayName !== "string") {
    return { error: "Invalid display name format." };
  }

  const displayName = rawDisplayName.trim();

  if (!displayName) {
    return { error: "Display name cannot be empty." };
  }

  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    return { 
      error: `Display name must be at most ${MAX_DISPLAY_NAME_LENGTH} characters long.` 
    };
  }

  // Reject control characters (keep printable ASCII and Unicode)
  // This regex matches any control character (ASCII 0-31) except newlines if we wanted them (but names shouldn't have newlines)
  // Actually, for display names, let's strictly disallow control chars.
  // The code review suggested loop check, but regex is cleaner. \p{C} matches invisible control characters.
  // However, simple ASCII range check is safer for basic implementation request.
  for (const ch of displayName) {
    const code = ch.charCodeAt(0);
    if (code < 32 || (code >= 127 && code <= 159)) {
       return { error: "Display name contains invalid characters." };
    }
  }

  // --- Auth Check ---
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // CODE REVIEW FIX: Return structured error instead of throwing
    return { error: "Unauthorized" }; 
  }

  // --- Maintenance Check ---
  const { data: setting } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "maintenance_mode")
    .single();
    
  if (setting?.value?.enabled) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role !== 'super_admin') {
          return { error: setting.value.message || "System is under maintenance." };
      }
  }

  // --- Update Profile ---
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return { error: "Failed to update profile." };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard"); 
  return { success: true };
}
