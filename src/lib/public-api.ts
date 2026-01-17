import { SupabaseClient } from "@supabase/supabase-js";
import { getServiceSupabaseClient } from "@/lib/supabase-admin";

/**
 * Server-only helper for public data fetching using the service role key.
 * Intended for SSR public pages where no user session exists.
 */
export function getPublicClient(): SupabaseClient {
  return getServiceSupabaseClient();
}
