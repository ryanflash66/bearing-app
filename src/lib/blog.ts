/**
 * Blog post database operations
 * Story 6.1: Blog Management (CMS)
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  BlogPost,
  CreateBlogPostInput,
  UpdateBlogPostInput,
  BlogPostListItem,
} from "@/types/blog";
import {
  evaluateOpenAIModeration,
  OPENAI_MODERATION_SOURCE,
} from "@/lib/openai-moderation";

const MODERATION_HOLD_MESSAGE = "Post flagged for review before publishing";

function buildModerationInput(parts: Array<string | undefined | null>): string | null {
  const combined = parts
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join("\n\n");

  return combined.length > 0 ? combined : null;
}

export interface BlogPostListResult {
  posts: BlogPostListItem[];
  error: string | null;
}

export interface BlogPostResult {
  post: BlogPost | null;
  error: string | null;
}

/**
 * Generate URL-safe slug from title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .substring(0, 100); // Limit length
}

/**
 * Generate unique slug by appending number if needed
 */
export async function generateUniqueSlug(
  supabase: SupabaseClient,
  accountId: string,
  baseSlug: string,
  excludePostId?: string
): Promise<string> {
  let slug = baseSlug || "untitled-post";
  let counter = 0;

  while (true) {
    const candidateSlug = counter === 0 ? slug : `${slug}-${counter}`;

    let query = supabase
      .from("blog_posts")
      .select("id")
      .eq("account_id", accountId)
      .eq("slug", candidateSlug);

    if (excludePostId) {
      query = query.neq("id", excludePostId);
    }

    const { data } = await query.single();

    if (!data) {
      return candidateSlug;
    }

    counter++;
    if (counter > 100) {
      // Safety limit
      return `${slug}-${Date.now()}`;
    }
  }
}

/**
 * Get all active blog posts for an account
 */
export async function getBlogPosts(
  supabase: SupabaseClient,
  accountId: string
): Promise<BlogPostListResult> {
  try {
    const { data, error } = await supabase
      .from("blog_posts")
      .select(
        "id, title, slug, status, excerpt, word_count, views_count, reads_count, published_at, created_at, updated_at"
      )
      .eq("account_id", accountId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching blog posts:", error);
      return { posts: [], error: error.message };
    }

    return { posts: data || [], error: null };
  } catch (err) {
    console.error("Unexpected error fetching blog posts:", err);
    return { posts: [], error: "Failed to fetch blog posts" };
  }
}

/**
 * Get a single blog post by ID
 */
export async function getBlogPost(
  supabase: SupabaseClient,
  postId: string
): Promise<BlogPostResult> {
  try {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("id", postId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { post: null, error: "Blog post not found" };
      }
      console.error("Error fetching blog post:", error);
      return { post: null, error: error.message };
    }

    return { post: data, error: null };
  } catch (err) {
    console.error("Unexpected error fetching blog post:", err);
    return { post: null, error: "Failed to fetch blog post" };
  }
}

/**
 * Create a new blog post (draft)
 */
export async function createBlogPost(
  supabase: SupabaseClient,
  input: CreateBlogPostInput
): Promise<BlogPostResult> {
  try {
    // Generate unique slug
    const baseSlug = input.slug || generateSlug(input.title || "Untitled Post");
    const slug = await generateUniqueSlug(supabase, input.account_id, baseSlug);

    const { data, error } = await supabase
      .from("blog_posts")
      .insert({
        account_id: input.account_id,
        owner_user_id: input.owner_user_id,
        title: input.title || "Untitled Post",
        slug,
        status: "draft",
        content_json: {},
        content_text: "",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating blog post:", error);
      return { post: null, error: error.message };
    }

    return { post: data, error: null };
  } catch (err) {
    console.error("Unexpected error creating blog post:", err);
    return { post: null, error: "Failed to create blog post" };
  }
}

/**
 * Update blog post content (used by autosave)
 */
export async function updateBlogPost(
  supabase: SupabaseClient,
  postId: string,
  input: UpdateBlogPostInput,
  expectedUpdatedAt?: string
): Promise<BlogPostResult & { conflictDetected?: boolean; serverState?: Partial<BlogPost> }> {
  try {
    // Load current post for validation and moderation diffing
    const { data: existingPost, error: existingError } = await supabase
      .from("blog_posts")
      .select("id, account_id, content_text, status, published_at")
      .eq("id", postId)
      .is("deleted_at", null)
      .single();

    if (existingError || !existingPost) {
      return { post: null, error: "Blog post not found or deleted" };
    }

    // If slug is being changed, verify uniqueness
    if (input.slug) {
      const uniqueSlug = await generateUniqueSlug(
        supabase,
        existingPost.account_id,
        input.slug,
        postId
      );
      if (uniqueSlug !== input.slug) {
        input.slug = uniqueSlug;
      }
    }

    const updatePayload: Record<string, unknown> = { ...input };

    if (
      typeof input.content_text === "string" &&
      input.content_text !== existingPost.content_text
    ) {
      const moderationInput = buildModerationInput([
        input.title,
        input.excerpt,
        input.content_text,
      ]);

      if (moderationInput) {
        const decision = await evaluateOpenAIModeration(moderationInput);

        if (!decision.skipped && decision.flagged) {
          updatePayload.is_flagged = true;
          updatePayload.flagged_at = new Date().toISOString();
          updatePayload.flag_reason =
            decision.reason || "OpenAI moderation flagged content";
          updatePayload.flag_source = OPENAI_MODERATION_SOURCE;
          updatePayload.flag_confidence = decision.maxScore;

          // If high confidence, hold publication until manual review
          if (decision.shouldHold) {
            updatePayload.status = "draft";
            updatePayload.published_at = null;
          }
        }
      }
    }

    let query = supabase
      .from("blog_posts")
      .update(updatePayload)
      .eq("id", postId)
      .is("deleted_at", null);

    // Add optimistic locking check if expected version provided
    if (expectedUpdatedAt) {
      query = query.eq("updated_at", expectedUpdatedAt);
    }

    const { data, error } = await query.select().single();

    if (error) {
      if (error.code === "PGRST116") {
        // Check if post exists but version mismatch
        const { data: existing } = await supabase
          .from("blog_posts")
          .select("updated_at, content_text, title")
          .eq("id", postId)
          .is("deleted_at", null)
          .single();

        if (existing && expectedUpdatedAt && existing.updated_at !== expectedUpdatedAt) {
          return {
            post: null,
            error: "Conflict detected: blog post was modified",
            conflictDetected: true,
            serverState: existing,
          };
        }
        return { post: null, error: "Blog post not found or deleted" };
      }
      console.error("Error updating blog post:", error);
      return { post: null, error: error.message };
    }

    return { post: data, error: null };
  } catch (err) {
    console.error("Unexpected error updating blog post:", err);
    return { post: null, error: "Failed to update blog post" };
  }
}

/**
 * Publish a blog post
 */
export async function publishBlogPost(
  supabase: SupabaseClient,
  postId: string
): Promise<BlogPostResult & { moderationHold?: boolean }> {
  try {
    const { data: existingPost, error: fetchError } = await supabase
      .from("blog_posts")
      .select("id, title, excerpt, content_text, status")
      .eq("id", postId)
      .is("deleted_at", null)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return { post: null, error: "Blog post not found or deleted" };
      }
      console.error("Error loading blog post for publish:", fetchError);
      return { post: null, error: fetchError.message };
    }

    const moderationInput = buildModerationInput([
      existingPost?.title,
      existingPost?.excerpt,
      existingPost?.content_text,
    ]);

    let moderationDecision = null;
    if (moderationInput) {
      moderationDecision = await evaluateOpenAIModeration(moderationInput);
    }

    const flagPayload: Record<string, unknown> = {};
    if (moderationDecision && !moderationDecision.skipped && moderationDecision.flagged) {
      flagPayload.is_flagged = true;
      flagPayload.flagged_at = new Date().toISOString();
      flagPayload.flag_reason =
        moderationDecision.reason || "OpenAI moderation flagged content";
      flagPayload.flag_source = OPENAI_MODERATION_SOURCE;
      flagPayload.flag_confidence = moderationDecision.maxScore;
    }

    const shouldHold =
      moderationDecision &&
      !moderationDecision.skipped &&
      moderationDecision.shouldHold;

    const updatePayload: Record<string, unknown> = shouldHold
      ? {
          status: "draft",
          published_at: null,
          ...flagPayload,
        }
      : {
          status: "published",
          published_at: new Date().toISOString(),
          ...flagPayload,
        };

    const { data, error } = await supabase
      .from("blog_posts")
      .update(updatePayload)
      .eq("id", postId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      console.error("Error publishing blog post:", error);
      return { post: null, error: error.message };
    }

    if (shouldHold) {
      return {
        post: data,
        error: MODERATION_HOLD_MESSAGE,
        moderationHold: true,
      };
    }

    return { post: data, error: null };
  } catch (err) {
    console.error("Unexpected error publishing blog post:", err);
    return { post: null, error: "Failed to publish blog post" };
  }
}

/**
 * Unpublish a blog post (back to draft)
 */
export async function unpublishBlogPost(
  supabase: SupabaseClient,
  postId: string
): Promise<BlogPostResult> {
  try {
    const { data, error } = await supabase
      .from("blog_posts")
      .update({
        status: "draft",
      })
      .eq("id", postId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      console.error("Error unpublishing blog post:", error);
      return { post: null, error: error.message };
    }

    return { post: data, error: null };
  } catch (err) {
    console.error("Unexpected error unpublishing blog post:", err);
    return { post: null, error: "Failed to unpublish blog post" };
  }
}

/**
 * Archive (soft delete) a blog post
 */
export async function archiveBlogPost(
  supabase: SupabaseClient,
  postId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from("blog_posts")
      .update({
        status: "archived",
        deleted_at: new Date().toISOString(),
      })
      .eq("id", postId)
      .is("deleted_at", null);

    if (error) {
      console.error("Error archiving blog post:", error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error("Unexpected error archiving blog post:", err);
    return { success: false, error: "Failed to archive blog post" };
  }
}

/**
 * Restore an archived blog post
 */
export async function restoreBlogPost(
  supabase: SupabaseClient,
  postId: string
): Promise<BlogPostResult> {
  try {
    const { data, error } = await supabase
      .from("blog_posts")
      .update({
        status: "draft",
        deleted_at: null,
      })
      .eq("id", postId)
      .not("deleted_at", "is", null)
      .select()
      .single();

    if (error) {
      console.error("Error restoring blog post:", error);
      return { post: null, error: error.message };
    }

    return { post: data, error: null };
  } catch (err) {
    console.error("Unexpected error restoring blog post:", err);
    return { post: null, error: "Failed to restore blog post" };
  }
}

/**
 * Increment view count for a blog post
 */
export async function incrementViewCount(
  supabase: SupabaseClient,
  postId: string
): Promise<void> {
  try {
    await supabase.rpc("increment_blog_post_views", { post_id: postId });
  } catch (err) {
    // Non-critical, log but don't fail
    console.error("Error incrementing view count:", err);
  }
}
