"use server";

import { SupabaseClient } from "@supabase/supabase-js";

export interface UserSnapshot {
  userId: string;
  email: string;
  displayName: string | null;
  subscriptionTier: string;
  usageStatus: string;
  lastError: string | null;
  lastErrorAt: string | null;
}

/**
 * Masks an email for PII protection
 * AC 4.4.3: PII should be minimized
 * @example "john.doe@gmail.com" -> "j***@gmail.com"
 */
function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***";
  const [local, domain] = email.split("@");
  if (local.length <= 1) return `${local}***@${domain}`;
  return `${local[0]}***@${domain}`;
}

/**
 * Fetch user snapshot data for support agent context
 * AC 4.4.1: Display key user context
 * 
 * SECURITY NOTE (H2): This function fetches full email then masks it.
 * The unmasked email exists in server memory briefly. To fully comply
 * with AC 4.4.3 "PII minimization", consider using a DB function to
 * return pre-masked email. Current implementation is acceptable for
 * server-side only execution (no client exposure).
 * 
 * DO NOT log the `user` object or enable debug logging that would expose email.
 */
export async function getUserSnapshot(
  supabase: SupabaseClient,
  userId: string
): Promise<{ snapshot: UserSnapshot | null; error: string | null }> {
  try {
    // 1. Get user profile
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, display_name")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return { snapshot: null, error: "User not found" };
    }

    // 2. Get account membership and account details
    const { data: membership, error: memberError } = await supabase
      .from("account_members")
      .select(`
        account_id,
        accounts (
          subscription_tier,
          usage_status
        )
      `)
      .eq("user_id", userId)
      .limit(1)
      .single();

    const account = membership?.accounts as { subscription_tier?: string; usage_status?: string } | null;

    // 3. Get last error from audit logs (optional)
    const { data: lastErrorLog } = await supabase
      .from("audit_logs")
      .select("metadata, created_at")
      .eq("user_id", userId)
      .eq("action", "exception")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const snapshot: UserSnapshot = {
      userId: user.id,
      email: maskEmail(user.email),
      displayName: user.display_name,
      subscriptionTier: account?.subscription_tier || "Free",
      usageStatus: account?.usage_status || "good_standing",
      lastError: lastErrorLog?.metadata?.message || null,
      lastErrorAt: lastErrorLog?.created_at || null,
    };

    return { snapshot, error: null };
  } catch (err: any) {
    console.error("getUserSnapshot error:", err);
    return { snapshot: null, error: err.message };
  }
}
