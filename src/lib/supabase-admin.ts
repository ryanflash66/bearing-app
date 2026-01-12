import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";
// Using 'any' for profile type to avoid circular dependency or deep imports if Profile isn't easily available,
// but ideally we import Profile type.
// I'll try to find where Profile is defined. Usually `src/lib/profile` or generated types.
// For now, I'll use a structural type or generic.

export function getServiceSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing. Please ensure it is set in your environment variables.");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing. Please ensure it is set in your environment variables.");
  }
  
  return createSupabaseClient(supabaseUrl, serviceRoleKey);
}

/**
 * Returns the Service Role client if the user is a Super Admin,
 * otherwise returns the provided standard client.
 */
export function getAdminAwareClient(supabase: SupabaseClient, profile: { role?: string } | null) {
  const isSuper = profile?.role === "super_admin";

  if (!isSuper) return supabase;

  return getServiceSupabaseClient();
}
