"use server";

import { createClient } from "@/utils/supabase/server";
import { isSuperAdmin } from "@/lib/super-admin";
import { revalidatePath } from "next/cache";

export async function toggleMaintenanceModeAction(enabled: boolean) {
  const supabase = await createClient();

  // Security Verification
  const isSuper = await isSuperAdmin(supabase);
  if (!isSuper) {
    throw new Error("Unauthorized");
  }

  const { error } = await supabase.from("system_settings").upsert({
    key: "maintenance_mode",
    value: {
      enabled,
      message: "System is under maintenance. Please try again later.",
    },
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout"); // Revalidate everything as this is global
  return { success: true };
}
