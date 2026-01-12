"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { isSuperAdmin, getMaintenanceStatus } from "@/lib/super-admin";

const MAX_DISPLAY_NAME_LENGTH = 100;

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

  // Normalize input
  const normalizedDisplayName = displayName.normalize('NFKC');

  // Reject control characters and other non-printable characters or bad formatting codes
  // Using explicit blocklist check as fallback for runtime/build compatibility.
  for (const ch of normalizedDisplayName) {
    const code = ch.charCodeAt(0);
    // Blocklist:
    // 0x0000 - 0x001F (C0 control)
    // 0x007F - 0x009F (Delete + C1 control)
    // 0x200B (Zero width space)
    // 0x200C (Zero width non-joiner)
    // 0x200D (Zero width joiner)
    // 0xFEFF (Zero width no-break space / BOM)
    // 0x202A - 0x202E (Bidi controls)
    // 0x2066 - 0x2069 (Bidi isolate controls)
    
    if (
      (code >= 0x0000 && code <= 0x001F) ||
      (code >= 0x007F && code <= 0x009F) ||
      code === 0x200B ||
      code === 0x200C ||
      code === 0x200D ||
      code === 0xFEFF ||
      (code >= 0x202A && code <= 0x202E) ||
      (code >= 0x2066 && code <= 0x2069)
    ) {
       return { error: "Display name contains invalid control or formatting characters." };
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
    .update({ display_name: normalizedDisplayName, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return { error: "Failed to update profile." };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard"); 
  return { success: true };
}
