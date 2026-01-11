
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Job Monitoring Service
 * Story H.4: Job Resilience
 */

export interface RecoveryResult {
  failedCount: number;
  jobIds: string[];
  error?: string;
}

/**
 * Triggers the stale job recovery process via RPC.
 * @param timeoutMinutes Jobs running longer than this are considered stalled.
 */
export async function recoverStaleJobs(
  supabase: SupabaseClient,
  timeoutMinutes: number = 30
): Promise<RecoveryResult> {
  try {
    const { data, error } = await supabase.rpc('recover_stale_jobs', {
      timeout_minutes: timeoutMinutes
    });

    if (error) {
      console.error("Error recovering stale jobs:", error);
      return { failedCount: 0, jobIds: [], error: error.message };
    }

    // RPC returns a table/array of rows. Since we return one row with stats:
    if (data && data.length > 0) {
      return {
        failedCount: Number(data[0].failed_count),
        jobIds: data[0].job_ids || []
      };
    }

    return { failedCount: 0, jobIds: [] };

  } catch (err) {
    console.error("Unexpected error in recoverStaleJobs:", err);
    return { failedCount: 0, jobIds: [], error: "Unexpected error" };
  }
}
