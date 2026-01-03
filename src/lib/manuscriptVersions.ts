import { SupabaseClient } from "@supabase/supabase-js";

// Types
export interface ManuscriptVersion {
  id: string;
  manuscript_id: string;
  version_num: number;
  content_json: Record<string, unknown>;
  content_text: string;
  title: string;
  created_by: string | null;
  created_at: string;
}

export interface VersionListResult {
  versions: ManuscriptVersion[];
  error: string | null;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface VersionResult {
  version: ManuscriptVersion | null;
  error: string | null;
}

/**
 * Create a version snapshot of a manuscript
 * Called on autosave thresholds (e.g., every 5 autosaves or significant content changes)
 */
export async function createVersionSnapshot(
  supabase: SupabaseClient,
  manuscriptId: string,
  contentJson: Record<string, unknown>,
  contentText: string,
  title: string
): Promise<VersionResult> {
  try {
    // Get current manuscript to ensure it exists and user has access
    const { data: manuscript, error: manuscriptError } = await supabase
      .from("manuscripts")
      .select("id, account_id, owner_user_id")
      .eq("id", manuscriptId)
      .is("deleted_at", null)
      .single();

    if (manuscriptError || !manuscript) {
      return { version: null, error: "Manuscript not found" };
    }

    // Get the next version number
    const { data: versions, error: versionError } = await supabase
      .from("manuscript_versions")
      .select("version_num")
      .eq("manuscript_id", manuscriptId)
      .order("version_num", { ascending: false })
      .limit(1);

    if (versionError) {
      console.error("Error fetching latest version:", versionError);
      return { version: null, error: versionError.message };
    }

    const nextVersionNum = versions && versions.length > 0 ? versions[0].version_num + 1 : 1;

    // Get current Public User ID (linked to Auth ID)
    let publicUserId: string | null = null;
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .single();
      
      if (userData) {
        publicUserId = userData.id;
      }
    }

    // Create version snapshot
    const { data, error } = await supabase
      .from("manuscript_versions")
      .insert({
        manuscript_id: manuscriptId,
        version_num: nextVersionNum,
        content_json: contentJson,
        content_text: contentText,
        title: title || "Untitled Manuscript",
        created_by: publicUserId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating version snapshot:", error.message, error.details || "");
      return { 
        version: null, 
        error: error.message || error.details || "Unknown database error" 
      };
    }

    return { version: data, error: null };
  } catch (err) {
    console.error("Unexpected error creating version snapshot:", err);
    return { version: null, error: "Failed to create version snapshot" };
  }
}

/**
 * Get version history for a manuscript with pagination
 * Returns versions in reverse chronological order (newest first)
 * AC 2.2.1: Versions appear in reverse chronological order with timestamps
 */
export async function getVersionHistory(
  supabase: SupabaseClient,
  manuscriptId: string,
  limit: number = 30,
  cursor?: string
): Promise<VersionListResult> {
  try {
    // Verify manuscript exists and user has access
    const { data: manuscript, error: manuscriptError } = await supabase
      .from("manuscripts")
      .select("id")
      .eq("id", manuscriptId)
      .is("deleted_at", null)
      .single();

    if (manuscriptError || !manuscript) {
      return { versions: [], error: "Manuscript not found", hasMore: false, nextCursor: null };
    }

    // Build query with cursor-based pagination
    let query = supabase
      .from("manuscript_versions")
      .select("*")
      .eq("manuscript_id", manuscriptId)
      .order("created_at", { ascending: false })
      .limit(limit + 1); // Fetch one extra to check if there are more

    // Apply cursor if provided (for pagination)
    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching version history:", error);
      return { versions: [], error: error.message, hasMore: false, nextCursor: null };
    }

    // Check if there are more versions
    const hasMore = data && data.length > limit;
    const versions = hasMore ? data.slice(0, limit) : (data || []);
    const nextCursor = hasMore && versions.length > 0 
      ? versions[versions.length - 1].created_at 
      : null;

    return {
      versions,
      error: null,
      hasMore: hasMore || false,
      nextCursor,
    };
  } catch (err) {
    console.error("Unexpected error fetching version history:", err);
    return { versions: [], error: "Failed to fetch version history", hasMore: false, nextCursor: null };
  }
}

/**
 * Get a specific version by version number
 */
export async function getVersion(
  supabase: SupabaseClient,
  manuscriptId: string,
  versionNum: number
): Promise<VersionResult> {
  try {
    const { data, error } = await supabase
      .from("manuscript_versions")
      .select("*")
      .eq("manuscript_id", manuscriptId)
      .eq("version_num", versionNum)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { version: null, error: "Version not found" };
      }
      console.error("Error fetching version:", error);
      return { version: null, error: error.message };
    }

    return { version: data, error: null };
  } catch (err) {
    console.error("Unexpected error fetching version:", err);
    return { version: null, error: "Failed to fetch version" };
  }
}

/**
 * Restore a manuscript to a specific version
 * AC 2.2.2: Current version is saved and selected version becomes active
 * AC 2.2.4: Restore is itself recorded as a new version (no versions deleted)
 */
export async function restoreVersion(
  supabase: SupabaseClient,
  manuscriptId: string,
  versionNum: number
): Promise<{ success: boolean; manuscript: any | null; error: string | null }> {
  try {
    // Get the version to restore
    const versionResult = await getVersion(supabase, manuscriptId, versionNum);
    if (versionResult.error || !versionResult.version) {
      return { success: false, manuscript: null, error: versionResult.error || "Version not found" };
    }

    const version = versionResult.version;

    // Get current manuscript state
    const { data: manuscript, error: manuscriptError } = await supabase
      .from("manuscripts")
      .select("*")
      .eq("id", manuscriptId)
      .is("deleted_at", null)
      .single();

    if (manuscriptError || !manuscript) {
      return { success: false, manuscript: null, error: "Manuscript not found" };
    }

    // Step 1: Save current version as a snapshot (safety copy)
    // This ensures AC 2.2.2: current version is saved before restore
    const currentSnapshotResult = await createVersionSnapshot(
      supabase,
      manuscriptId,
      manuscript.content_json,
      manuscript.content_text,
      manuscript.title
    );

    if (currentSnapshotResult.error) {
      // Log but don't fail - we'll still restore
      console.warn("Failed to create safety snapshot before restore:", currentSnapshotResult.error);
    }

    // Step 2: Restore the selected version content to the manuscript
    const { error: updateError } = await supabase
      .from("manuscripts")
      .update({
        content_json: version.content_json,
        content_text: version.content_text,
        title: version.title,
        last_saved_at: new Date().toISOString(),
      })
      .eq("id", manuscriptId)
      .is("deleted_at", null);

    if (updateError) {
      console.error("Error restoring version:", updateError);
      return { success: false, manuscript: null, error: updateError.message };
    }

    // Get the updated manuscript to return
    const { data: restoredManuscript } = await supabase
      .from("manuscripts")
      .select("*")
      .eq("id", manuscriptId)
      .single();

    // Step 3: Create a new version snapshot with the restored content
    // This ensures AC 2.2.4: restore is itself recorded as a new version
    const restoreSnapshotResult = await createVersionSnapshot(
      supabase,
      manuscriptId,
      version.content_json,
      version.content_text,
      version.title
    );

    if (restoreSnapshotResult.error) {
      // Log but don't fail - restore already succeeded
      console.warn("Failed to create restore snapshot:", restoreSnapshotResult.error);
    }

    return { success: true, manuscript: restoredManuscript, error: null };
  } catch (err) {
    console.error("Unexpected error restoring version:", err);
    return { success: false, manuscript: null, error: "Failed to restore version" };
  }
}

