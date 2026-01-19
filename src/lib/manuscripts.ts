import { SupabaseClient } from "@supabase/supabase-js";

// Types
export interface Manuscript {
  id: string;
  account_id: string;
  owner_user_id: string;
  title: string;
  slug: string | null;
  is_public: boolean;
  subtitle: string | null;
  synopsis: string | null;
  cover_image_url: string | null;
  theme_config: {
    theme?: string | null;
    accent_color?: string | null;
  } | null;
  status: "draft" | "in_review" | "ready" | "published" | "archived";
  content_json: Record<string, unknown>;
  content_text: string;
  content_hash: string | null;
  metadata: Record<string, any>;
  word_count: number;
  last_saved_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateManuscriptInput {
  account_id: string;
  owner_user_id: string;
  title?: string;
}

export interface UpdateManuscriptInput {
  title?: string;
  content_json?: Record<string, unknown>;
  content_text?: string;
  content_hash?: string;
  status?: Manuscript["status"];
  last_saved_at?: string;
  metadata?: Record<string, any>;
}

export interface ManuscriptListResult {
  manuscripts: Manuscript[];
  error: string | null;
}

export interface ManuscriptResult {
  manuscript: Manuscript | null;
  error: string | null;
}

/**
 * Get all active manuscripts for an account
 */
export async function getManuscripts(
  supabase: SupabaseClient,
  accountId: string
): Promise<ManuscriptListResult> {
  try {
    const { data, error } = await supabase
      .from("manuscripts")
      .select("*")
      .eq("account_id", accountId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching manuscripts:", error);
      return { manuscripts: [], error: error.message };
    }

    return { manuscripts: data || [], error: null };
  } catch (err) {
    console.error("Unexpected error fetching manuscripts:", err);
    return { manuscripts: [], error: "Failed to fetch manuscripts" };
  }
}

/**
 * Get a single manuscript by ID
 */
export async function getManuscript(
  supabase: SupabaseClient,
  manuscriptId: string
): Promise<ManuscriptResult> {
  try {
    const { data, error } = await supabase
      .from("manuscripts")
      .select("*")
      .eq("id", manuscriptId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { manuscript: null, error: "Manuscript not found" };
      }
      console.error("Error fetching manuscript:", error);
      return { manuscript: null, error: error.message };
    }

    return { manuscript: data, error: null };
  } catch (err) {
    console.error("Unexpected error fetching manuscript:", err);
    return { manuscript: null, error: "Failed to fetch manuscript" };
  }
}

/**
 * Create a new manuscript (draft row for autosave to begin immediately per AC 2.1.3)
 */
export async function createManuscript(
  supabase: SupabaseClient,
  input: CreateManuscriptInput
): Promise<ManuscriptResult> {
  try {
    const { data, error } = await supabase
      .from("manuscripts")
      .insert({
        account_id: input.account_id,
        owner_user_id: input.owner_user_id,
        title: input.title || "Untitled",
        status: "draft",
        content_json: {},
        content_text: "",
        last_saved_at: new Date().toISOString(), // Mark as saved immediately
      })
      .select()
      .single();

    if (error) {
      // console.error("Error creating manuscript:", error);
      return { manuscript: null, error: error.message };
    }

    return { manuscript: data, error: null };
  } catch (err) {
    console.error("Unexpected error creating manuscript:", err);
    return { manuscript: null, error: "Failed to create manuscript" };
  }
}

/**
 * Update manuscript content (used by autosave)
 * Returns version info for conflict detection
 */
export async function updateManuscript(
  supabase: SupabaseClient,
  manuscriptId: string,
  input: UpdateManuscriptInput,
  expectedUpdatedAt?: string
): Promise<ManuscriptResult & { conflictDetected?: boolean; serverState?: Partial<Manuscript> }> {
  try {
    // Build the update query
    let query = supabase
      .from("manuscripts")
      .update({
        ...input,
        last_saved_at: new Date().toISOString(),
      })
      .eq("id", manuscriptId)
      .is("deleted_at", null); // Can't update deleted manuscripts

    // Add optimistic locking check if expected version provided
    if (expectedUpdatedAt) {
      query = query.eq("updated_at", expectedUpdatedAt);
    }

    const { data, error, count } = await query.select().single();

    if (error) {
      // Check for no rows matched (conflict)
      if (error.code === "PGRST116") {
        // Check if manuscript exists but version mismatch
        const { data: existing } = await supabase
          .from("manuscripts")
          .select("updated_at, content_hash, content_text, title")
          .eq("id", manuscriptId)
          .single();

        if (existing && expectedUpdatedAt && existing.updated_at !== expectedUpdatedAt) {
          return {
            manuscript: null,
            error: "Conflict detected: manuscript was modified",
            conflictDetected: true,
            serverState: existing
          };
        }
        return { manuscript: null, error: "Manuscript not found or deleted" };
      }
      console.error("Error updating manuscript:", error);
      return { 
        manuscript: null, 
        error: error.message || error.details || JSON.stringify(error) || "Unknown database error" 
      };
    }

    return { manuscript: data, error: null };
  } catch (err) {
    console.error("Unexpected error updating manuscript:", err);
    return { manuscript: null, error: "Failed to update manuscript" };
  }
}

/**
 * Soft delete a manuscript (AC 2.1.4: recoverable for 30 days)
 */
export async function softDeleteManuscript(
  supabase: SupabaseClient,
  manuscriptId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from("manuscripts")
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq("id", manuscriptId)
      .is("deleted_at", null);

    if (error) {
      console.error("Error soft-deleting manuscript:", error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error("Unexpected error soft-deleting manuscript:", err);
    return { success: false, error: "Failed to delete manuscript" };
  }
}

/**
 * Restore a soft-deleted manuscript
 */
export async function restoreManuscript(
  supabase: SupabaseClient,
  manuscriptId: string
): Promise<ManuscriptResult> {
  try {
    const { data, error } = await supabase
      .from("manuscripts")
      .update({
        deleted_at: null,
      })
      .eq("id", manuscriptId)
      .not("deleted_at", "is", null) // Must be deleted to restore
      .select()
      .single();

    if (error) {
      console.error("Error restoring manuscript:", error);
      return { manuscript: null, error: error.message };
    }

    return { manuscript: data, error: null };
  } catch (err) {
    console.error("Unexpected error restoring manuscript:", err);
    return { manuscript: null, error: "Failed to restore manuscript" };
  }
}

/**
 * Get soft-deleted manuscripts (admin only for recovery)
 */
export async function getDeletedManuscripts(
  supabase: SupabaseClient,
  accountId: string
): Promise<ManuscriptListResult> {
  try {
    const { data, error } = await supabase
      .from("manuscripts")
      .select("*")
      .eq("account_id", accountId)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (error) {
      console.error("Error fetching deleted manuscripts:", error);
      return { manuscripts: [], error: error.message };
    }

    return { manuscripts: data || [], error: null };
  } catch (err) {
    console.error("Unexpected error fetching deleted manuscripts:", err);
    return { manuscripts: [], error: "Failed to fetch deleted manuscripts" };
  }
}

/**
 * Permanently delete manuscripts older than retention period
 * Used by cleanup job (AC 2.1.4: 30 days retention)
 */
export async function purgeExpiredManuscripts(
  supabase: SupabaseClient,
  retentionDays: number = 30
): Promise<{ deletedCount: number; error: string | null }> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const { data, error } = await supabase
      .from("manuscripts")
      .delete()
      .not("deleted_at", "is", null)
      .lt("deleted_at", cutoffDate.toISOString())
      .select("id");

    if (error) {
      console.error("Error purging expired manuscripts:", error);
      return { deletedCount: 0, error: error.message };
    }

    return { deletedCount: data?.length || 0, error: null };
  } catch (err) {
    console.error("Unexpected error purging manuscripts:", err);
    return { deletedCount: 0, error: "Failed to purge manuscripts" };
  }
}

/**
 * Generate content hash for conflict detection and AI deduplication
 * Uses crypto.subtle.digest for secure SHA-256 hashing
 */
export async function generateContentHash(content: string): Promise<string> {
  // Use Web Crypto API for secure hashing
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Fallback for server-side or environments without crypto.subtle
  // Use Node.js crypto if available
  if (typeof process !== "undefined" && process.versions?.node) {
    const crypto = await import("crypto");
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  // Last resort: simple hash (should not happen in modern environments)
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

