/**
 * Blog content moderation operations
 * Story 6.3: Admin Blog Moderation
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface ModerationPost {
  id: string;
  title: string;
  slug: string;
  status: string;
  excerpt: string | null;
  word_count: number;
  views_count: number;
  published_at: string | null;
  suspended_at: string | null;
  suspension_reason: string | null;
  is_flagged: boolean;
  flagged_at: string | null;
  flag_reason: string | null;
  flag_source: string | null;
  flag_confidence: number | null;
  created_at: string;
  author_id: string;
  author_email: string;
  author_display_name: string | null;
  author_handle: string | null;
}

export interface ModerationListResult {
  posts: ModerationPost[];
  error: string | null;
}

export interface SuspendResult {
  success: boolean;
  error: string | null;
  postId?: string;
  authorEmail?: string;
  title?: string;
}

export interface RestoreResult {
  success: boolean;
  error: string | null;
  postId?: string;
}

export interface ApproveResult {
  success: boolean;
  error: string | null;
  postId?: string;
}

/**
 * Get all posts for moderation (admin only)
 * Returns published and suspended posts, ordered with suspended first
 */
export async function getPostsForModeration(
  supabase: SupabaseClient,
  options: { limit?: number; offset?: number } = {}
): Promise<ModerationListResult> {
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  try {
    const { data, error } = await supabase.rpc("get_posts_for_moderation", {
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      console.error("Error fetching posts for moderation:", error);
      return { posts: [], error: error.message };
    }

    return { posts: (data as ModerationPost[]) || [], error: null };
  } catch (err) {
    console.error("Unexpected error fetching moderation posts:", err);
    return { posts: [], error: "Failed to load posts for moderation" };
  }
}

/**
 * Suspend a blog post (admin only)
 * Changes status to 'suspended' and records who suspended it
 */
export async function suspendBlogPost(
  supabase: SupabaseClient,
  postId: string,
  reason: string = "Content policy violation"
): Promise<SuspendResult> {
  try {
    const { data, error } = await supabase.rpc("suspend_blog_post", {
      p_post_id: postId,
      p_reason: reason,
    });

    if (error) {
      console.error("Error suspending blog post:", error);
      return { success: false, error: error.message };
    }

    const result = data as {
      success: boolean;
      error?: string;
      post_id?: string;
      author_email?: string;
      title?: string;
    };

    if (!result.success) {
      return { success: false, error: result.error || "Failed to suspend post" };
    }

    return {
      success: true,
      error: null,
      postId: result.post_id,
      authorEmail: result.author_email,
      title: result.title,
    };
  } catch (err) {
    console.error("Unexpected error suspending blog post:", err);
    return { success: false, error: "Failed to suspend blog post" };
  }
}

/**
 * Restore a suspended blog post (admin only)
 * Changes status back to 'published' and clears suspension info
 */
export async function restoreSuspendedPost(
  supabase: SupabaseClient,
  postId: string
): Promise<RestoreResult> {
  try {
    const { data, error } = await supabase.rpc("restore_suspended_blog_post", {
      p_post_id: postId,
    });

    if (error) {
      console.error("Error restoring suspended post:", error);
      return { success: false, error: error.message };
    }

    const result = data as {
      success: boolean;
      error?: string;
      post_id?: string;
    };

    if (!result.success) {
      return { success: false, error: result.error || "Failed to restore post" };
    }

    return {
      success: true,
      error: null,
      postId: result.post_id,
    };
  } catch (err) {
    console.error("Unexpected error restoring suspended post:", err);
    return { success: false, error: "Failed to restore blog post" };
  }
}

/**
 * Approve a flagged blog post (admin only)
 * Clears flag metadata without changing published status
 */
export async function approveBlogPost(
  supabase: SupabaseClient,
  postId: string
): Promise<ApproveResult> {
  try {
    const { data, error } = await supabase.rpc("approve_blog_post", {
      p_post_id: postId,
    });

    if (error) {
      console.error("Error approving blog post:", error);
      return { success: false, error: error.message };
    }

    const result = data as {
      success: boolean;
      error?: string;
      post_id?: string;
    };

    if (!result.success) {
      return { success: false, error: result.error || "Failed to approve post" };
    }

    return {
      success: true,
      error: null,
      postId: result.post_id,
    };
  } catch (err) {
    console.error("Unexpected error approving blog post:", err);
    return { success: false, error: "Failed to approve blog post" };
  }
}
