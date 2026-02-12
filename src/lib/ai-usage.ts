import { SupabaseClient } from "@supabase/supabase-js";

// Constants
export const MONTHLY_TOKEN_CAP = 10_000_000;

// Feature label mappings for human-friendly display
export const FEATURE_LABELS = {
  consistency_check: "Consistency Checks",
  suggestion: "AI Suggestions",
  cover_generation: "Cover Generation",
} as const;

export type FeatureKey = keyof typeof FEATURE_LABELS;

export interface BillingCycle {
  id: string;
  account_id: string;
  start_date: string;
  end_date: string;
  status: "open" | "closed";
}

export interface UsageEvent {
  id: string;
  account_id: string;
  user_id: string;
  cycle_id: string;
  feature: string;
  model: string;
  tokens_estimated: number;
  tokens_actual: number;
  created_at: string;
  metadata?: Record<string, any>; // AC 5.6.1.5: Cache cost tracking metadata
}

/**
 * Get the currently open billing cycle for an account.
 * If none exists, creates a new one starting now.
 */
export async function getOrCreateOpenBillingCycle(
  supabase: SupabaseClient,
  accountId: string
): Promise<BillingCycle> {
  // 1. Try to find open cycle
  const { data: openCycle, error } = await supabase
    .from("billing_cycles")
    .select("*")
    .eq("account_id", accountId)
    .eq("status", "open")
    .single();

  if (openCycle) {
    // Check if it's expired (e.g. past end_date)
    // If so, close it and create new one
    // For simplicity in MVP, we might rely on a separate job to close cycles, 
    // or do it lazily here. Let's do lazy check.
    const now = new Date(); // assuming server time is UTC-aligned or handled by Postgres
    // Actually, date comparison in JS vs DB string needs care.
    if (new Date(openCycle.end_date) < now) {
      // Close this cycle
      await supabase
        .from("billing_cycles")
        .update({ status: "closed" })
        .eq("id", openCycle.id);
      
      // Fall through to create new one
    } else {
      return openCycle;
    }
  } else if (error && error.code !== "PGRST116") {
    // Real error
    throw error;
  }

  // 2. Create new cycle
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1); // 1 month duration

  // Handle month rollover edge cases (e.g. Jan 31 -> Feb 28/29) using setMonth behavior 
  // or strictly: start_date + 30 days. Let's stick to simple +1 Month for now.

  const { data: newCycle, error: createError } = await supabase
    .from("billing_cycles")
    .insert({
      account_id: accountId,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      status: "open",
    })
    .select("*")
    .single();

  if (createError) {
    // Handle race condition where another request created it
    if (createError.code === "23505" || createError.message.includes("unique")) { // if we had unique constraint
      // Recurse to find it
      return getOrCreateOpenBillingCycle(supabase, accountId);
    }
    throw createError;
  }

  return newCycle;
}

/**
 * Check if the account has enough remaining tokens for the estimated usage.
 * Throws error if cap exceeded.
 */
export async function checkUsageLimit(
  supabase: SupabaseClient,
  accountId: string,
  estimatedTokens: number
): Promise<void> {
  // 1. Check Account Status (Story 4.1: Upsell Enforcement)
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("usage_status")
    .eq("id", accountId)
    .single();

  if (accountError) {
    console.error("Error fetching account status:", accountError);
    throw new Error("Could not verify account status.");
  }

  if (account?.usage_status === "upsell_required") {
    throw new Error(
      "Your free tier limit has been exceeded for two consecutive months. Please upgrade to Pro to continue using AI features."
    );
  }

  const cycle = await getOrCreateOpenBillingCycle(supabase, accountId);

  // Sum usage for this cycle
  const { data, error } = await supabase
    .from("ai_usage_events")
    .select("tokens_actual")
    .eq("cycle_id", cycle.id);

  if (error) {
    console.error("Error fetching usage stats:", error);
    throw new Error("Could not verify usage limits. Please try again.");
  }

  const currentUsage = (data || []).reduce(
    (sum, event) => sum + (event.tokens_actual || 0),
    0
  );

  if (currentUsage + estimatedTokens > MONTHLY_TOKEN_CAP) {
    throw new Error(
      `Monthly AI token limit reached. Used: ${currentUsage}, Requested: ${estimatedTokens}, Cap: ${MONTHLY_TOKEN_CAP}.`
    );
  }
}

/**
 * Log an immutable usage event after AI execution.
 * AC 5.6.1.5: Supports optional metadata for cache cost tracking.
 */
export async function logUsageEvent(
  supabase: SupabaseClient,
  accountId: string,
  userId: string,
  feature: string, // e.g., 'consistency_check'
  model: string,   // e.g., 'gemini-2.0-flash' (Vertex AI model name)
  estimatedTokens: number,
  actualTokens: number,
  latencyMs: number = 0,
  metadata?: Record<string, any> // AC 5.6.1.5: cache_creation_tokens, cache_hit_tokens, etc.
): Promise<void> {
  try {
    const cycle = await getOrCreateOpenBillingCycle(supabase, accountId);

    const insertData: Record<string, any> = {
      account_id: accountId,
      user_id: userId,
      cycle_id: cycle.id,
      feature,
      model,
      tokens_estimated: estimatedTokens,
      tokens_actual: actualTokens,
      latency_ms: latencyMs,
    };

    // Merge metadata if provided (AC 5.6.1.5)
    if (metadata && Object.keys(metadata).length > 0) {
      insertData.metadata = metadata;
    }

    const { error } = await supabase.from("ai_usage_events").insert(insertData);

    if (error) {
      console.error("Failed to log AI usage event:", error);
      // Don't throw here, as the user operation already succeeded. 
      // Just log error for admin review.
    }
  } catch (err) {
    console.error("Failed to log AI usage event:", err);
  }
}

/**
 * Get monthly usage statistics for the dashboard
 */
export async function getMonthlyUsageStats(
  supabase: SupabaseClient,
  accountId: string
): Promise<{ tokensUsed: number; checkCount: number }> {
  try {
    const cycle = await getOrCreateOpenBillingCycle(supabase, accountId);

    const { data, error } = await supabase
      .from("ai_usage_events")
      .select("tokens_actual, feature")
      .eq("cycle_id", cycle.id);

    if (error) {
      console.error("Error fetching usage stats:", error);
      return { tokensUsed: 0, checkCount: 0 };
    }

    const tokensUsed = (data || []).reduce(
      (sum, event) => sum + (event.tokens_actual || 0),
      0
    );

    // Count exact feature matches for "Check Count" (assuming consistency checks)
    // But maybe we want total AI interactions? Story says "monthly token usage and check counts"
    const checkCount = (data || []).filter(e => e.feature === 'consistency_check').length;

    return { tokensUsed, checkCount };
  } catch (err) {
    console.error("Error in getMonthlyUsageStats:", err);
    return { tokensUsed: 0, checkCount: 0 };
  }
}

export interface FeatureBreakdown {
  feature: string;
  label: string;
  tokens: number;
  count: number;
}

/**
 * Get per-feature usage breakdown for the current billing cycle.
 * Returns aggregated token counts and action counts per feature.
 */
export async function getFeatureBreakdown(
  supabase: SupabaseClient,
  accountId: string
): Promise<FeatureBreakdown[]> {
  try {
    const cycle = await getOrCreateOpenBillingCycle(supabase, accountId);

    const { data, error } = await supabase
      .from("ai_usage_events")
      .select("tokens_actual, feature")
      .eq("cycle_id", cycle.id);

    if (error) {
      console.error("Error fetching feature breakdown:", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Aggregate by feature
    const featureMap = new Map<string, { tokens: number; count: number }>();

    data.forEach((event) => {
      const feature = event.feature || "unknown";
      const existing = featureMap.get(feature) || { tokens: 0, count: 0 };
      featureMap.set(feature, {
        tokens: existing.tokens + (event.tokens_actual || 0),
        count: existing.count + 1,
      });
    });

    // Convert to array with labels
    const breakdown: FeatureBreakdown[] = [];
    featureMap.forEach((value, key) => {
      breakdown.push({
        feature: key,
        label: (FEATURE_LABELS as Record<string, string>)[key] || key,
        tokens: value.tokens,
        count: value.count,
      });
    });

    return breakdown;
  } catch (err) {
    console.error("Error in getFeatureBreakdown:", err);
    return [];
  }
}

/**
 * Format token count with 'k' suffix for compact display.
 * Shows "< 1k" for small positive values (under 1000) to avoid confusing "0k".
 * @example formatTokenCompact(0) => "0k"
 * @example formatTokenCompact(500) => "< 1k"
 * @example formatTokenCompact(5234) => "5k"
 * @example formatTokenCompact(1500000) => "1,500k"
 */
export function formatTokenCompact(tokens: number): string {
  if (tokens === 0) return "0k";
  if (tokens < 1000) return "< 1k";
  const thousands = Math.round(tokens / 1000);
  return `${thousands.toLocaleString("en-US")}k`;
}
