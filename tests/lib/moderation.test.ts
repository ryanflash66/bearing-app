/**
 * Tests for blog content moderation
 * Story 6.3: Admin Blog Moderation
 */

import {
  getPostsForModeration,
  suspendBlogPost,
  restoreSuspendedPost,
  approveBlogPost,
  ModerationPost,
} from "@/lib/moderation";

// Mock Supabase client
const mockRpc = jest.fn();
const mockSupabase = {
  rpc: mockRpc,
} as unknown as Parameters<typeof getPostsForModeration>[0];

describe("Moderation Library", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPostsForModeration", () => {
    const mockPosts: ModerationPost[] = [
      {
        id: "post-1",
        title: "Test Post 1",
        slug: "test-post-1",
        status: "published",
        excerpt: "Excerpt 1",
        word_count: 100,
        views_count: 50,
        published_at: "2026-01-15T00:00:00Z",
        suspended_at: null,
        suspension_reason: null,
        is_flagged: false,
        flagged_at: null,
        flag_reason: null,
        flag_source: null,
        flag_confidence: null,
        created_at: "2026-01-14T00:00:00Z",
        author_id: "author-1",
        author_email: "author1@example.com",
        author_display_name: "Author One",
        author_handle: "author1",
      },
      {
        id: "post-2",
        title: "Suspended Post",
        slug: "suspended-post",
        status: "suspended",
        excerpt: "Bad content",
        word_count: 50,
        views_count: 10,
        published_at: "2026-01-10T00:00:00Z",
        suspended_at: "2026-01-16T00:00:00Z",
        suspension_reason: "Content policy violation",
        is_flagged: true,
        flagged_at: "2026-01-16T00:00:00Z",
        flag_reason: "Content policy violation",
        flag_source: "admin",
        flag_confidence: null,
        created_at: "2026-01-09T00:00:00Z",
        author_id: "author-2",
        author_email: "author2@example.com",
        author_display_name: "Author Two",
        author_handle: "author2",
      },
    ];

    it("should fetch posts for moderation successfully", async () => {
      mockRpc.mockResolvedValueOnce({ data: mockPosts, error: null });

      const result = await getPostsForModeration(mockSupabase);

      expect(mockRpc).toHaveBeenCalledWith("get_posts_for_moderation", {
        p_limit: 50,
        p_offset: 0,
      });
      expect(result.posts).toHaveLength(2);
      expect(result.error).toBeNull();
    });

    it("should use custom limit and offset", async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null });

      await getPostsForModeration(mockSupabase, { limit: 10, offset: 20 });

      expect(mockRpc).toHaveBeenCalledWith("get_posts_for_moderation", {
        p_limit: 10,
        p_offset: 20,
      });
    });

    it("should handle RPC errors", async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: "Admin access required" },
      });

      const result = await getPostsForModeration(mockSupabase);

      expect(result.posts).toHaveLength(0);
      expect(result.error).toBe("Admin access required");
    });

    it("should handle unexpected errors", async () => {
      mockRpc.mockRejectedValueOnce(new Error("Network error"));

      const result = await getPostsForModeration(mockSupabase);

      expect(result.posts).toHaveLength(0);
      expect(result.error).toBe("Failed to load posts for moderation");
    });
  });

  describe("suspendBlogPost", () => {
    it("should suspend a post successfully", async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          success: true,
          post_id: "post-1",
          author_email: "author@example.com",
          title: "Test Post",
        },
        error: null,
      });

      const result = await suspendBlogPost(mockSupabase, "post-1", "Spam content");

      expect(mockRpc).toHaveBeenCalledWith("suspend_blog_post", {
        p_post_id: "post-1",
        p_reason: "Spam content",
      });
      expect(result.success).toBe(true);
      expect(result.postId).toBe("post-1");
      expect(result.authorEmail).toBe("author@example.com");
      expect(result.title).toBe("Test Post");
    });

    it("should use default reason if not provided", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { success: true, post_id: "post-1" },
        error: null,
      });

      await suspendBlogPost(mockSupabase, "post-1");

      expect(mockRpc).toHaveBeenCalledWith("suspend_blog_post", {
        p_post_id: "post-1",
        p_reason: "Content policy violation",
      });
    });

    it("should handle suspension failure from RPC", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { success: false, error: "Post not found" },
        error: null,
      });

      const result = await suspendBlogPost(mockSupabase, "nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Post not found");
    });

    it("should handle RPC errors", async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: "Database error" },
      });

      const result = await suspendBlogPost(mockSupabase, "post-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });

    it("should handle already suspended post", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { success: false, error: "Post is already suspended" },
        error: null,
      });

      const result = await suspendBlogPost(mockSupabase, "post-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Post is already suspended");
    });
  });

  describe("restoreSuspendedPost", () => {
    it("should restore a suspended post successfully", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { success: true, post_id: "post-1" },
        error: null,
      });

      const result = await restoreSuspendedPost(mockSupabase, "post-1");

      expect(mockRpc).toHaveBeenCalledWith("restore_suspended_blog_post", {
        p_post_id: "post-1",
      });
      expect(result.success).toBe(true);
      expect(result.postId).toBe("post-1");
    });

    it("should handle restore failure from RPC", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { success: false, error: "Post is not suspended" },
        error: null,
      });

      const result = await restoreSuspendedPost(mockSupabase, "post-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Post is not suspended");
    });

    it("should handle RPC errors", async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: "Admin access required" },
      });

      const result = await restoreSuspendedPost(mockSupabase, "post-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Admin access required");
    });

    it("should handle post not found", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { success: false, error: "Post not found" },
        error: null,
      });

      const result = await restoreSuspendedPost(mockSupabase, "nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Post not found");
    });
  });

  describe("approveBlogPost", () => {
    it("should approve a flagged post successfully", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { success: true, post_id: "post-3" },
        error: null,
      });

      const result = await approveBlogPost(mockSupabase, "post-3");

      expect(mockRpc).toHaveBeenCalledWith("approve_blog_post", {
        p_post_id: "post-3",
      });
      expect(result.success).toBe(true);
      expect(result.postId).toBe("post-3");
    });

    it("should handle approve failure from RPC", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { success: false, error: "Post is suspended. Restore instead." },
        error: null,
      });

      const result = await approveBlogPost(mockSupabase, "post-3");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Post is suspended. Restore instead.");
    });

    it("should handle RPC errors", async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: "Admin access required" },
      });

      const result = await approveBlogPost(mockSupabase, "post-3");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Admin access required");
    });
  });
});
