/**
 * Unit tests for public blog data access
 * Story 6.2: Public Author Profile/Blog
 */

import { getPublishedBlogPostsByAuthor, getPublishedBlogPostBySlug } from "@/lib/public-blog";

describe("public-blog", () => {
  it("returns published posts with pagination metadata", async () => {
    const mockPosts = [
      { id: "p1", title: "Hello", slug: "hello", excerpt: "First", published_at: "2026-01-01" },
      { id: "p2", title: "World", slug: "world", excerpt: "Second", published_at: "2026-01-02" },
    ];

    const queryChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: mockPosts, error: null, count: 12 }),
    };

    const mockSupabase = {
      from: jest.fn().mockReturnValue(queryChain),
    };

    const result = await getPublishedBlogPostsByAuthor(mockSupabase as never, "user-123", {
      page: 2,
      pageSize: 10,
    });

    expect(queryChain.range).toHaveBeenCalledWith(10, 19);
    expect(result.posts).toEqual(mockPosts);
    expect(result.totalCount).toBe(12);
    expect(result.totalPages).toBe(2);
    expect(result.page).toBe(2);
  });

  it("returns error when query fails", async () => {
    const queryChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: null, error: { message: "DB error" }, count: null }),
    };

    const mockSupabase = {
      from: jest.fn().mockReturnValue(queryChain),
    };

    const result = await getPublishedBlogPostsByAuthor(mockSupabase as never, "user-123", {
      page: 1,
      pageSize: 10,
    });

    expect(result.posts).toEqual([]);
    expect(result.error).toBe("DB error");
  });

  describe("getPublishedBlogPostBySlug", () => {
    it("returns a published post when found", async () => {
      const mockPost = {
        id: "post-1",
        title: "Public Post",
        slug: "public-post",
        content_json: { type: "doc", content: [] },
        content_text: "Public post content",
        excerpt: "Summary",
        published_at: "2026-01-01",
        updated_at: "2026-01-02",
      };

      const queryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockPost, error: null }),
      };

      const mockSupabase = {
        from: jest.fn().mockReturnValue(queryChain),
      };

      const result = await getPublishedBlogPostBySlug(mockSupabase as never, "user-123", "public-post");

      expect(result.post).toEqual(mockPost);
      expect(result.error).toBeNull();
    });

    it("returns not found when no post matches", async () => {
      const queryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "No rows found" },
        }),
      };

      const mockSupabase = {
        from: jest.fn().mockReturnValue(queryChain),
      };

      const result = await getPublishedBlogPostBySlug(mockSupabase as never, "user-123", "missing");

      expect(result.post).toBeNull();
      expect(result.error).toBe("Post not found");
    });
  });
});
