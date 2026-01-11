import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";
// Using 'any' for profile type to avoid circular dependency or deep imports if Profile isn't easily available,
// but ideally we import Profile type.
// I'll try to find where Profile is defined. Usually `src/lib/profile` or generated types.
// For now, I'll use a structural type or generic.

export function getServiceSupabaseClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
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
